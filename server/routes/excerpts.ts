// File: ./server/routes/excerpts.ts

import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { GEMINI_MODEL } from '../config.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const router = Router();

router.get('/unsorted', (req, res) => {
    try {
        const excerptsRows = db.prepare(`
            SELECT
                e.id,
                e.text,
                e.location,
                s.name as sourceName,
                s.type as sourceType
            FROM excerpts e
            JOIN sources s ON e.source_id = s.id
            WHERE e.is_assigned = 0
            ORDER BY e.id DESC
        `).all();

        const getTags = db.prepare(`SELECT tag FROM excerpt_tags WHERE excerpt_id = ?`);

        const formattedExcerpts = excerptsRows.map((exc: any) => {
            const tags = getTags.all(exc.id).map((t: any) => t.tag);
            return {
                id: exc.id,
                text: exc.text,
                location: exc.location,
                sourceName: exc.sourceName,
                sourceType: exc.sourceType,
                status: 'new',
                tags
            };
        });

        res.json(formattedExcerpts);
    } catch (error) {
        console.error('[API] Error fetching excerpts:', error);
        res.status(500).json({ error: 'Failed to fetch excerpts' });
    }
});

// Mark an excerpt as assigned so it stops showing up in the Dock
router.patch('/:id/assign', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare(`UPDATE excerpts SET is_assigned = 1 WHERE id = ?`).run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('[API] Error assigning excerpt:', error)
        res.status(500).json({ error: 'Failed to assign excerpt' });
    }
});

// Dismiss an excerpt (delete it entirely)
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare(`DELETE FROM excerpt_tags WHERE excerpt_id = ?`).run(id);
        db.prepare(`DELETE FROM excerpts WHERE id = ?`).run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('[API] Error dismissing excerpt:', error);
        res.status(500).json({ error: 'Failed to dismiss excerpt' });
    }
});

// Stopwords for fuzzy verification matching
const STOPWORDS = new Set([
    'about', 'after', 'again', 'against', 'before', 'being', 'between', 'could',
    'every', 'first', 'from', 'going', 'great', 'have', 'their', 'there', 'these',
    'thing', 'those', 'though', 'through', 'until', 'which', 'while', 'with',
    'would', 'shall', 'unto', 'said', 'them', 'then', 'that', 'this', 'they',
    'thou', 'thee', 'your', 'mine', 'hath', 'will', 'were', 'when', 'what',
    'also', 'more', 'come', 'came', 'made', 'make', 'like', 'very', 'much',
]);

function extractKeyWords(text: string): string[] {
    const words = text.toLowerCase().match(/\b[a-z]{5,}\b/g) ?? [];
    return [...new Set(words.filter(w => !STOPWORDS.has(w)))].slice(0, 4);
}

// Verify a recalled passage exists in the source DB using two strategies:
// 1. Fuzzy keyword match against chapter text
// 2. Reference-based chapter title lookup (e.g. "Romans 8:28" → "Romans 8")
function verifyPassage(
    sourceId: string,
    text: string,
    reference: string
): { id: string; title: string } | undefined {
    // Strategy 1: keyword match in chapter text
    const keyWords = extractKeyWords(text);
    if (keyWords.length >= 2) {
        const conditions = keyWords.map(() => `LOWER(text) LIKE ?`).join(' AND ');
        const params = keyWords.map(w => `%${w}%`);
        const hit = db.prepare(
            `SELECT id, title FROM chapters WHERE source_id = ? AND (${conditions}) LIMIT 1`
        ).get(sourceId, ...params) as { id: string; title: string } | undefined;
        if (hit) return hit;
    }

    // Strategy 2: strip verse/section number from reference and match chapter title
    if (reference) {
        const chapterRef = reference.replace(/:\d+.*$/, '').trim();
        const hit = db.prepare(
            `SELECT id, title FROM chapters WHERE source_id = ? AND LOWER(title) LIKE ? LIMIT 1`
        ).get(sourceId, `%${chapterRef.toLowerCase()}%`) as { id: string; title: string } | undefined;
        if (hit) return hit;
    }

    return undefined;
}

// On-demand extraction: uses Gemini recall first, falls back to keyword scan if source is unknown.
router.post('/extract', async (req, res): Promise<any> => {
    try {
        const { sourceId, query } = req.body;
        if (!sourceId || !query?.trim()) {
            return res.status(400).json({ error: 'sourceId and query are required.' });
        }

        const t0 = Date.now();
        const ms = () => Date.now() - t0;
        const log: any[] = [];
        let totalTokens = { prompt: 0, output: 0 };
        const tok = (usage: any) => ({
            prompt: usage?.promptTokenCount ?? 0,
            output: usage?.candidatesTokenCount ?? 0,
        });

        // Step 1: Load the source's AI-generated profile
        const dbT0 = Date.now();
        const source = db.prepare(`SELECT ai_meta FROM sources WHERE id = ?`).get(sourceId) as { ai_meta: string | null } | undefined;
        const sourceProfile = source?.ai_meta ? JSON.parse(source.ai_meta) : null;
        log.push({ step: 'source_profile', profile: sourceProfile, ms: Date.now() - dbT0 });

        const profileDesc = sourceProfile
            ? `Title: "${sourceProfile.title}"\nEra: ${sourceProfile.era}\nDomain: ${sourceProfile.domain}\nLanguage style: ${sourceProfile.language_style}`
            : 'Unknown source';

        const insertExcerpt = db.prepare(`
            INSERT OR IGNORE INTO excerpts (id, source_id, text, location, text_hash, is_assigned)
            VALUES (?, ?, ?, ?, ?, 0)
        `);
        const insertTag = db.prepare(`INSERT OR IGNORE INTO excerpt_tags (excerpt_id, tag) VALUES (?, ?)`);

        let totalInserted = 0;
        let totalDuplicates = 0;
        let topic = query;

        // ── RECALL PATH ──────────────────────────────────────────────────────────
        // Ask Gemini to recall relevant passages from its training knowledge of the source.
        // This avoids keyword expansion, chapter scanning, and N parallel AI calls.

        const recallT0 = Date.now();
        const recallResponse = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: `You are a recall engine for a personal knowledge graph. The user wants to find passages from a specific source.

Source:
${profileDesc}

Query: "${query}"

Your tasks:
1. Extract the core topic the user is searching for (strip command words like "find", "show me", "what does this say about").
2. Recall 3 to 8 passages from this source that are most directly relevant to that topic. Only recall passages you are confident actually appear in this source — no invented quotes.
3. If you do not have reliable verbatim knowledge of this source's text, set canRecall to false and return an empty passages array.

For each passage:
- "text": the exact quote as it appears in the source (use the source's actual language and style)
- "reference": precise location (e.g. "Romans 8:28–30", "Chapter 4", "Book II, §12")
- "why": one sentence explaining relevance to the query
- "tags": 1–3 topic tags in #kebab-case`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        topic: { type: Type.STRING, description: 'The clean extracted topic, e.g. "predestination" or "free will".' },
                        canRecall: { type: Type.BOOLEAN, description: 'True only if you have reliable knowledge of this source\'s verbatim text.' },
                        passages: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    reference: { type: Type.STRING },
                                    why: { type: Type.STRING },
                                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ['text', 'reference', 'why', 'tags']
                            }
                        }
                    },
                    required: ['topic', 'canRecall', 'passages']
                }
            }
        });
        const recallMs = Date.now() - recallT0;
        const recallTokens = tok(recallResponse.usageMetadata);
        totalTokens.prompt += recallTokens.prompt;
        totalTokens.output += recallTokens.output;

        let recallResult: { topic: string; canRecall: boolean; passages: any[] } = {
            topic: query,
            canRecall: false,
            passages: []
        };
        try {
            recallResult = JSON.parse(recallResponse.text ?? '{}');
            topic = recallResult.topic || query;
        } catch { /* fall through to keyword approach */ }

        log.push({
            step: 'recall',
            topic,
            canRecall: recallResult.canRecall,
            recalled: recallResult.passages?.length ?? 0,
            ms: recallMs,
            tokens: recallTokens
        });
        console.log(`[Extract] Recall: canRecall=${recallResult.canRecall}, passages=${recallResult.passages?.length ?? 0} (${recallMs}ms)`);

        if (recallResult.canRecall && recallResult.passages?.length > 0) {
            // Verify each recalled passage against the DB before storing
            for (const passage of recallResult.passages) {
                const verifyT0 = Date.now();
                const matched = verifyPassage(sourceId, passage.text, passage.reference ?? '');

                if (matched) {
                    const excerptId = `exc_${crypto.randomBytes(6).toString('hex')}`;
                    const textHash = crypto.createHash('md5').update(passage.text).digest('hex');
                    const result = insertExcerpt.run(excerptId, sourceId, passage.text, passage.reference || matched.title, textHash);

                    if (result.changes === 0) {
                        totalDuplicates++;
                        log.push({ step: 'passage', reference: passage.reference, preview: passage.text.slice(0, 80), status: 'duplicate', ms: Date.now() - verifyT0 });
                    } else {
                        totalInserted++;
                        for (const tag of passage.tags ?? []) {
                            const normalized = '#' + tag.replace(/^#+/, '').toLowerCase().trim().replace(/\s+/g, '-');
                            insertTag.run(excerptId, normalized);
                        }
                        log.push({
                            step: 'passage',
                            reference: passage.reference,
                            preview: passage.text.slice(0, 80),
                            why: passage.why,
                            tags: passage.tags,
                            status: 'inserted',
                            ms: Date.now() - verifyT0
                        });
                    }
                } else {
                    log.push({ step: 'passage', reference: passage.reference, preview: passage.text.slice(0, 80), status: 'unverified', ms: Date.now() - verifyT0 });
                    console.log(`[Extract] Unverified (no DB match): "${passage.reference}"`);
                }
            }
        } else {
            // ── KEYWORD FALLBACK ─────────────────────────────────────────────────
            // Source is not well-known to the model — fall back to vocabulary expansion + chapter scan.

            log.push({ step: 'fallback_reason', reason: recallResult.canRecall ? 'no passages recalled' : 'source unknown to model' });
            console.log(`[Extract] Falling back to keyword scan for "${topic}"`);

            const profileContext = sourceProfile
                ? `Source profile:\n${JSON.stringify(sourceProfile, null, 2)}\n\n`
                : '';

            const expT0 = Date.now();
            const expansionResponse = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: `You are a search intent extractor and vocabulary expander for a text retrieval system.

${profileContext}The user typed: "${query}"

Your tasks:
1. Extract the core topic or concept the user is actually searching for, regardless of how they phrased it.
2. Given the source profile above, generate 6 to 10 single words that are likely to appear literally in THIS text when it discusses that concept.

Return a JSON object with:
- "topic": the clean extracted topic (a short phrase, e.g. "autonomy" or "free will")
- "searchTerms": array of 6-10 lowercase single words likely present in this specific text`,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            topic: { type: Type.STRING },
                            searchTerms: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['topic', 'searchTerms']
                    }
                }
            });
            const expMs = Date.now() - expT0;
            const expTokens = tok(expansionResponse.usageMetadata);
            totalTokens.prompt += expTokens.prompt;
            totalTokens.output += expTokens.output;

            let expandedTerms: string[] = [];
            try {
                const parsed = JSON.parse(expansionResponse.text ?? '{}');
                topic = parsed.topic || topic;
                expandedTerms = parsed.searchTerms || [];
            } catch {
                expandedTerms = [];
            }

            const uniqueKeywords = [...new Set(expandedTerms.map((w: string) => w.toLowerCase()))] as string[];
            log.push({ step: 'keywords', topic, terms: uniqueKeywords, ms: expMs, tokens: expTokens });

            // Keyword filter
            const filterT0 = Date.now();
            const conditions = uniqueKeywords.map(() => `LOWER(text) LIKE ?`).join(' OR ');
            const params = uniqueKeywords.map((w: string) => `%${w}%`);

            let filterMethod = 'keyword';
            let candidateChapters: any[] = conditions
                ? db.prepare(`SELECT id, title, text FROM chapters WHERE source_id = ? AND (${conditions}) LIMIT 12`).all(sourceId, ...params)
                : [];

            if (candidateChapters.length === 0) {
                const total: any = db.prepare('SELECT COUNT(*) as c FROM chapters WHERE source_id = ?').get(sourceId);
                if (total.c === 0) {
                    return res.json({ count: 0, message: `This source has no indexed chapters. Try re-uploading it.`, log });
                }
                filterMethod = 'fallback';
                const step = Math.max(1, Math.floor(total.c / 10));
                candidateChapters = db.prepare(
                    `SELECT id, title, text FROM chapters WHERE source_id = ? AND (rowid % ?) = 0 LIMIT 10`
                ).all(sourceId, step);
            }
            const filterMs = Date.now() - filterT0;
            log.push({ step: 'filter', method: filterMethod, chapters: candidateChapters.map((c: any) => c.title), ms: filterMs });
            console.log(`[Extract] "${topic}" — ${filterMethod} → ${candidateChapters.length} chapters (${filterMs}ms)`);

            // Parallel per-chapter AI extraction
            const chapterResults = await Promise.all(candidateChapters.map(async (chapter) => {
                const chT0 = Date.now();
                const prompt = `You are an epistemology extraction engine. The user is searching for passages related to: "${topic}".

Analyze the following text and:
1. Write a brief reasoning explaining whether this chapter is relevant to the query, what themes are present, and why you are or are not extracting passages.
2. Extract 0 to 3 passages that are MOST relevant. If none are clearly relevant, return an empty excerpts array.
3. For each passage, include a one-sentence explanation of why it is relevant.

Return exact quotes or tightly paraphrased core claims — nothing generic or off-topic.

Text (from: ${chapter.title}):
"""
${chapter.text.slice(0, 12000)}
"""`;

                try {
                    const response = await ai.models.generateContent({
                        model: GEMINI_MODEL,
                        contents: prompt,
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    reasoning: { type: Type.STRING },
                                    excerpts: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                text: { type: Type.STRING },
                                                why: { type: Type.STRING },
                                                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                                            },
                                            required: ['text', 'why', 'tags']
                                        }
                                    }
                                },
                                required: ['reasoning', 'excerpts']
                            }
                        }
                    });
                    const chMs = Date.now() - chT0;
                    const chTokens = tok(response.usageMetadata);
                    const parsed = response.text ? JSON.parse(response.text) : { excerpts: [] };
                    return { chapter, parsed, chMs, chTokens, error: false };
                } catch (err) {
                    console.error(`[Extract] AI error on chapter "${chapter.title}":`, err);
                    return { chapter, parsed: null, chMs: Date.now() - chT0, chTokens: { prompt: 0, output: 0 }, error: true };
                }
            }));

            for (const result of chapterResults) {
                const { chapter, parsed, chMs, chTokens, error } = result;
                totalTokens.prompt += chTokens.prompt;
                totalTokens.output += chTokens.output;

                if (error || !parsed) {
                    log.push({ step: 'chapter', title: chapter.title, error: true, ms: chMs });
                    continue;
                }

                const items = parsed.excerpts ?? [];
                let chapterInserted = 0;
                let chapterDuplicates = 0;

                const save = db.transaction((items: any[]) => {
                    for (const item of items) {
                        const excerptId = `exc_${crypto.randomBytes(6).toString('hex')}`;
                        const textHash = crypto.createHash('md5').update(item.text).digest('hex');
                        const result = insertExcerpt.run(excerptId, sourceId, item.text, chapter.title, textHash);
                        if (result.changes === 0) { chapterDuplicates++; continue; }
                        chapterInserted++;
                        totalInserted++;
                        for (const tag of item.tags) {
                            const normalized = '#' + tag.replace(/^#+/, '').toLowerCase().trim().replace(/\s+/g, '-');
                            insertTag.run(excerptId, normalized);
                        }
                    }
                });
                save(items);
                totalDuplicates += chapterDuplicates;

                log.push({
                    step: 'chapter',
                    title: chapter.title,
                    reasoning: parsed.reasoning ?? null,
                    aiFound: items.length,
                    inserted: chapterInserted,
                    duplicates: chapterDuplicates,
                    excerpts: items.map((i: any) => ({ text: i.text, why: i.why, tags: i.tags })),
                    ms: chMs,
                    tokens: chTokens,
                });
            }
        }

        log.push({ step: 'summary', totalMs: ms(), totalTokens });

        const dupeNote = totalDuplicates > 0 ? ` · ${totalDuplicates} already in Dock` : '';
        const message = totalInserted > 0
            ? `${totalInserted} new excerpt${totalInserted > 1 ? 's' : ''} on "${topic}"${dupeNote}`
            : totalDuplicates > 0
                ? `No new excerpts — all ${totalDuplicates} found passages already in Dock`
                : `No relevant passages found for "${topic}"`;

        res.json({ count: totalInserted, duplicates: totalDuplicates, message, log });
    } catch (error) {
        console.error('[API] Extract error:', error);
        res.status(500).json({ error: 'Extraction failed.' });
    }
});

export default router;

// File: ./server/routes/ingest.ts

import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { EpubParser } from '../services/EpubParser.js';
import { db } from '../db/index.js';
import { GEMINI_MODEL } from '../config.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const router = Router();
// Hold the uploaded file in memory so we can pass the buffer directly to adm-zip
const upload = multer({ storage: multer.memoryStorage() });

router.post('/epub', upload.single('file'), async (req, res): Promise<any> => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`[Ingest] Received: ${req.file.originalname} (${req.file.size} bytes)`);

        // 1. Dedup check — reject if this exact file has already been imported
        const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
        const existing = db.prepare('SELECT name FROM sources WHERE file_hash = ?').get(fileHash) as { name: string } | undefined;
        if (existing) {
            return res.status(409).json({
                error: `"${req.file.originalname}" has already been imported (matched "${existing.name}").`
            });
        }

        // 2. Parse EPUB natively in memory
        const chapters = await EpubParser.parse(req.file.buffer);
        console.log(`[Ingest] Parsed ${chapters.length} chapters.`);

        // 3. Save Source + Chapters to SQLite
        const sourceId = `src_${crypto.randomBytes(6).toString('hex')}`;

        db.prepare(`
            INSERT INTO sources (id, name, type, metadata, file_hash)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            sourceId,
            req.file.originalname,
            'epub',
            JSON.stringify({ chapters: chapters.length, size: req.file.size }),
            fileHash
        );

        const insertChapter = db.prepare(`
            INSERT OR IGNORE INTO chapters (id, source_id, title, text)
            VALUES (?, ?, ?, ?)
        `);

        const saveChapters = db.transaction(() => {
            for (const ch of chapters) {
                insertChapter.run(`${sourceId}_${ch.id}`, sourceId, ch.title, ch.text);
            }
        });
        saveChapters();

        console.log(`[Ingest] Stored ${chapters.length} chapters for "${req.file.originalname}". Generating source profile…`);

        // 4. Sample passages and ask Gemini to produce a source profile.
        // We pick 5 chapters: first, last, and 3 evenly distributed through the middle.
        // This gives the AI a representative cross-section of the text's vocabulary and style.
        const sampleIndexes = chapters.length <= 5
            ? chapters.map((_, i) => i)
            : [
                0,
                Math.floor(chapters.length * 0.25),
                Math.floor(chapters.length * 0.5),
                Math.floor(chapters.length * 0.75),
                chapters.length - 1,
              ];

        const sampleText = sampleIndexes
            .map(i => `[${chapters[i].title}]\n${chapters[i].text.slice(0, 800)}`)
            .join('\n\n---\n\n');

        let aiMeta: object | null = null;
        try {
            const profileResponse = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: `You are a literary analyst. Based on the following sample passages from an uploaded text, produce a compact source profile that will be used to improve search term expansion when a user queries this text.

Sample passages:
"""
${sampleText}
"""

Return a JSON object with these fields:
- "title": the apparent title or name of the work
- "era": approximate time period or date of writing/translation
- "language_style": brief description of vocabulary and register (e.g. "archaic Early Modern English, thee/thou, -eth verbs")
- "domain": primary subject area (e.g. "theology, scripture", "Stoic philosophy", "19th-century fiction")
- "key_themes": array of 4-6 dominant themes
- "vocabulary_notes": 2-3 sentences describing distinctive word choices for abstract concepts — what words does this text use instead of modern terms like "autonomy", "morality", "consciousness"?`,
                config: { responseMimeType: 'application/json' }
            });

            aiMeta = JSON.parse(profileResponse.text ?? 'null');
            console.log(`[Ingest] Source profile generated for "${req.file.originalname}".`);
        } catch (err) {
            console.warn(`[Ingest] Could not generate source profile:`, err);
        }

        db.prepare(`UPDATE sources SET ai_meta = ? WHERE id = ?`).run(
            aiMeta ? JSON.stringify(aiMeta) : null,
            sourceId
        );

        res.json({
            success: true,
            sourceId,
            message: `Imported "${req.file.originalname}" — ${chapters.length} chapters indexed. Use @ in the Console to search it.`
        });

    } catch (error) {
        console.error('[Ingest] Error processing EPUB:', error);
        res.status(500).json({ error: 'Failed to process EPUB file' });
    }
});

export default router;
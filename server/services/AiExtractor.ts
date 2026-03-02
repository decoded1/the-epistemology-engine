// File: ./server/services/AiExtractor.ts

import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db/index.js';
import crypto from 'crypto';
import { GEMINI_MODEL } from '../config.js';
import { EpubChapter } from './EpubParser.js';

// Initialize the new Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CHAR_CAP = 12000; // Token protection: ~3000 tokens per chunk

export class AiExtractor {
    static async processChapters(sourceId: string, sourceName: string, chapters: EpubChapter[]) {
        console.log(`[AiExtractor] Starting background extraction for: ${sourceName}`);

        // Prepare SQLite statements outside the loop for performance
        const insertExcerpt = db.prepare(`
            INSERT OR IGNORE INTO excerpts (id, source_id, text, location, text_hash, is_assigned)
            VALUES (?, ?, ?, ?, ?, 0)
        `);
        const insertTag = db.prepare(`
            INSERT INTO excerpt_tags (excerpt_id, tag) 
            VALUES (?, ?)
        `);

        // Process chapters (you can limit this to the first few for testing, e.g., chapters.slice(0, 5))
        for (const chapter of chapters) {
            // Skip empty or tiny chapters
            if (chapter.text.length < 100) continue;

            // Apply character cap chunking
            const chunks = this.chunkText(chapter.text, CHAR_CAP);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const chunkLocation = chunks.length > 1 ? `${chapter.title} (Pt. ${i + 1})` : chapter.title;

                console.log(`[AiExtractor] Processing: ${chunkLocation} (${chunk.length} chars)`);

                const prompt = `
                    You are an epistemology extraction engine. 
                    Read the following text and extract 1 to 4 of the most meaningful philosophical, scientific, or logical claims.
                    Ignore narrative filler, table of contents, and preamble.
                    Return the exact quote or a heavily paraphrased core claim.

                    Text to analyze:
                    """
                    ${chunk}
                    """
                `;

                try {
                    const response = await ai.models.generateContent({
                        model: GEMINI_MODEL,
                        contents: prompt,
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        text: { type: Type.STRING, description: "The extracted claim or quote." },
                                        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1 to 3 topic tags starting with # (e.g., #stoicism)" }
                                    },
                                    required: ["text", "tags"]
                                }
                            }
                        }
                    });

                    if (response.text) {
                        const extractedItems = JSON.parse(response.text);

                        // Save to SQLite in a transaction
                        const transaction = db.transaction((items) => {
                            for (const item of items) {
                                const excerptId = `exc_${crypto.randomBytes(6).toString('hex')}`;
                                const textHash = crypto.createHash('md5').update(item.text).digest('hex');
                                const result = insertExcerpt.run(excerptId, sourceId, item.text, chunkLocation, textHash);
                                if (result.changes === 0) continue; // duplicate text — skip tags too

                                for (const tag of item.tags) {
                                    const cleanTag = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
                                    insertTag.run(excerptId, cleanTag);
                                }
                            }
                        });

                        transaction(extractedItems);
                        console.log(`[AiExtractor] Saved ${extractedItems.length} excerpts from ${chunkLocation}`);
                    }
                } catch (err) {
                    console.error(`[AiExtractor] AI Error on ${chunkLocation}:`, err);
                }
            }
        }
        console.log(`[AiExtractor] Finished extraction for ${sourceName}.`);
    }

    // Helper to split text safely by paragraphs to respect the character cap
    private static chunkText(text: string, maxChars: number): string[] {
        const chunks: string[] = [];
        const paragraphs = text.split('\n');
        let currentChunk = '';

        for (const p of paragraphs) {
            if (currentChunk.length + p.length > maxChars) {
                if (currentChunk) chunks.push(currentChunk.trim());
                currentChunk = p + '\n';
            } else {
                currentChunk += p + '\n';
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    }
}
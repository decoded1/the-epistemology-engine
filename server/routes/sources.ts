// File: ./server/routes/sources.ts

import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
    try {
        const sourcesRows = db.prepare(`SELECT * FROM sources ORDER BY indexed_at DESC`).all();

        const formattedSources = sourcesRows.map((s: any) => {
            const metaObj = s.metadata ? JSON.parse(s.metadata) : {};

            let metaText = '';
            if (s.type === 'epub') metaText = `${metaObj.chapters || 0} chapters`;
            else if (s.type === 'jsonl') metaText = `${metaObj.excerpts || 0} items`;
            else metaText = metaObj.size ? `${(metaObj.size / 1024 / 1024).toFixed(1)} MB` : 'unknown';

            return {
                id: s.id,
                name: s.name,
                type: s.type,
                meta: metaText
            };
        });

        res.json(formattedSources);
    } catch (error) {
        console.error('[API] Error fetching sources:', error);
        res.status(500).json({ error: 'Failed to fetch sources' });
    }
});

export default router;

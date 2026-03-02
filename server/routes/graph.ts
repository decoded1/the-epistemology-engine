// File: ./server/routes/graph.ts

import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET: Fetch the entire graph (Nodes + Edges)
router.get('/', (req, res) => {
    try {
        const dbNodes = db.prepare('SELECT * FROM nodes').all();
        const dbEdges = db.prepare('SELECT * FROM edges').all();

        const nodes = dbNodes.map((n: any) => ({
            id: n.id,
            type: n.type,
            position: { x: n.x_pos, y: n.y_pos },
            data: JSON.parse(n.data)
        }));

        const edges = dbEdges.map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'semantic',
            data: { relationType: e.relation_type }
        }));

        res.json({ nodes, edges });
    } catch (error) {
        console.error('[API] Error fetching graph:', error);
        res.status(500).json({ error: 'Failed to fetch graph' });
    }
});

// POST: Create or Update a Node
router.post('/nodes', (req, res) => {
    try {
        const { id, type, position, data } = req.body;
        db.prepare(`
            INSERT INTO nodes (id, type, x_pos, y_pos, data) 
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET 
                x_pos = excluded.x_pos, 
                y_pos = excluded.y_pos, 
                data = excluded.data
        `).run(id, type, position.x, position.y, JSON.stringify(data));

        res.json({ success: true });
    } catch (error) {
        console.error('[API] Error saving node:', error);
        res.status(500).json({ error: 'Failed to save node' });
    }
});

// DELETE: Remove a Node
router.delete('/nodes/:id', (req, res) => {
    try {
        const { id } = req.params;
        // Clean up connected edges first
        db.prepare('DELETE FROM edges WHERE source = ? OR target = ?').run(id, id);
        // Delete the node
        db.prepare('DELETE FROM nodes WHERE id = ?').run(id);

        res.json({ success: true });
    } catch (error) {
        console.error('[API] Error deleting node:', error);
        res.status(500).json({ error: 'Failed to delete node' });
    }
});

// POST: Create or Update an Edge
router.post('/edges', (req, res) => {
    try {
        const { id, source, target, data } = req.body;
        db.prepare(`
            INSERT INTO edges (id, source, target, relation_type) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET 
                relation_type = excluded.relation_type
        `).run(id, source, target, data?.relationType || 'extends');

        res.json({ success: true });
    } catch (error) {
        console.error('[API] Error saving edge:', error);
        res.status(500).json({ error: 'Failed to save edge' });
    }
});

// DELETE: Remove an Edge
router.delete('/edges/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM edges WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('[API] Error deleting edge:', error);
        res.status(500).json({ error: 'Failed to delete edge' });
    }
});

export default router;
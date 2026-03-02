// File: ./server/db/index.ts

import Database from 'better-sqlite3';
import path from 'path';

// Store the DB in the project root
const dbPath = path.resolve(process.cwd(), 'epistemology.db');
export const db = new Database(dbPath);

export function initDb() {
    // Enable Write-Ahead Logging for better concurrent performance
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS sources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            metadata JSON,
            indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS excerpts (
            id TEXT PRIMARY KEY,
            source_id TEXT NOT NULL,
            text TEXT NOT NULL,
            location TEXT NOT NULL,
            embedding BLOB,
            is_assigned BOOLEAN DEFAULT 0,
            FOREIGN KEY(source_id) REFERENCES sources(id)
        );

        CREATE TABLE IF NOT EXISTS nodes (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            x_pos REAL NOT NULL,
            y_pos REAL NOT NULL,
            data JSON NOT NULL
        );

        CREATE TABLE IF NOT EXISTS edges (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            target TEXT NOT NULL,
            relation_type TEXT NOT NULL,
            FOREIGN KEY(source) REFERENCES nodes(id),
            FOREIGN KEY(target) REFERENCES nodes(id)
        );

        CREATE TABLE IF NOT EXISTS excerpt_tags (
            excerpt_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            PRIMARY KEY (excerpt_id, tag),
            FOREIGN KEY(excerpt_id) REFERENCES excerpts(id)
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS chapters (
            id TEXT PRIMARY KEY,
            source_id TEXT NOT NULL,
            title TEXT NOT NULL,
            text TEXT NOT NULL,
            FOREIGN KEY(source_id) REFERENCES sources(id)
        );
    `);

    // Migrations — safe to run repeatedly, silently ignored if already applied
    const migrate = (sql: string) => { try { db.exec(sql); } catch { /* already applied */ } };

    // Source dedup: SHA-256 of the file bytes so re-uploading the same epub is rejected
    migrate(`ALTER TABLE sources ADD COLUMN file_hash TEXT`);
    migrate(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_file_hash ON sources(file_hash) WHERE file_hash IS NOT NULL`);

    // AI-generated source profile: era, language style, domain, vocabulary notes
    migrate(`ALTER TABLE sources ADD COLUMN ai_meta TEXT`);

    // Excerpt dedup: MD5 of the text per source so duplicate AI extractions are silently skipped
    migrate(`ALTER TABLE excerpts ADD COLUMN text_hash TEXT`);
    migrate(`CREATE UNIQUE INDEX IF NOT EXISTS idx_excerpts_dedup ON excerpts(source_id, text_hash) WHERE text_hash IS NOT NULL`);

    console.log(`Database initialized at: ${dbPath}`);
}
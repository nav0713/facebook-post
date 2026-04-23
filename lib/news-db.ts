import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SEED_SOURCES } from "./news-seed";

const DB_PATH = path.join(process.cwd(), "data", "news.db");

// Pin to globalThis for Next.js hot-reload safety
const globalForDb = globalThis as typeof globalThis & { _newsDb?: Database.Database };

export function getDb(): Database.Database {
  if (globalForDb._newsDb) {
    return globalForDb._newsDb;
  }

  // Ensure directory exists
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);
  seedSources(db);

  globalForDb._newsDb = db;
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'general',
      type TEXT NOT NULL DEFAULT 'local',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES sources(id),
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      published_at TEXT,
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
  `);
}

function seedSources(db: Database.Database): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO sources (name, url, category, type)
    VALUES (?, ?, ?, ?)
  `);

  for (const source of SEED_SOURCES) {
    stmt.run(source.name, source.url, source.category, source.type);
  }
}

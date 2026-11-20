import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { formatOf, Network } from "./networks";

const g = globalThis as unknown as { __db?: DatabaseSync };
export const uploadsDir = () => { const d = path.join(process.cwd(), "data", "uploads"); fs.mkdirSync(d, { recursive: true }); return d; };

export function db(): DatabaseSync {
  if (g.__db) return g.__db;
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const d = new DatabaseSync(path.join(dir, "promocarter.db"));
  d.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      network TEXT NOT NULL,
      handle TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL DEFAULT '',
      media_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',      -- draft | scheduled | publishing | published | failed
      scheduled_at TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS post_targets (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      external_id TEXT,
      error TEXT,
      PRIMARY KEY (post_id, account_id)
    );
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mime TEXT NOT NULL,
      kind TEXT NOT NULL,                         -- image | video
      size INTEGER NOT NULL,
      file TEXT NOT NULL,                         -- filename inside data/uploads
      alt TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS post_media (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (post_id, asset_id)
    );
    CREATE INDEX IF NOT EXISTS idx_posts_sched ON posts(status, scheduled_at);
  `);
  // migrate older databases (per-target format, options and text override)
  const cols = (d.prepare("PRAGMA table_info(post_targets)").all() as Row[]).map((c) => c.name);
  for (const [c, t] of [["type", "TEXT"], ["options", "TEXT"], ["content", "TEXT"]])
    if (!cols.includes(c)) d.exec(`ALTER TABLE post_targets ADD COLUMN ${c} ${t}`);
  g.__db = d;
  return d;
}

export type Row = Record<string, any>;
export const all = (sql: string, ...p: any[]) => db().prepare(sql).all(...p) as Row[];
export const get = (sql: string, ...p: any[]) => db().prepare(sql).get(...p) as Row | undefined;
export const run = (sql: string, ...p: any[]) => db().prepare(sql).run(...p);

const ASSET_COLS = "a.id, a.name, a.mime, a.kind, a.size, a.alt, a.created_at";

export function assetsList(kind?: string | null, q?: string | null) {
  const w: string[] = [], p: any[] = [];
  if (kind === "image" || kind === "video" || kind === "document") { w.push("a.kind=?"); p.push(kind); }
  if (q) { w.push("(a.name LIKE ? OR a.alt LIKE ?)"); p.push(`%${q}%`, `%${q}%`); }
  return all(`SELECT ${ASSET_COLS}, (SELECT COUNT(*) FROM post_media m WHERE m.asset_id=a.id) AS used
              FROM assets a ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY a.id DESC`, ...p);
}

/** Posts with their targets and media attached. */
export function postsWhere(where = "1=1", ...p: any[]): Row[] {
  const posts = all(`SELECT * FROM posts WHERE ${where} ORDER BY COALESCE(scheduled_at, created_at)`, ...p);
  if (!posts.length) return [];
  const ids = posts.map((x) => x.id), qs = ids.map(() => "?").join(",");
  const targets = all(
    `SELECT t.*, a.network, a.handle FROM post_targets t JOIN accounts a ON a.id = t.account_id WHERE t.post_id IN (${qs})`, ...ids);
  const media = all(
    `SELECT m.post_id, m.position, ${ASSET_COLS}, a.file FROM post_media m JOIN assets a ON a.id=m.asset_id
     WHERE m.post_id IN (${qs}) ORDER BY m.position`, ...ids);
  return posts.map((x) => ({
    ...x,
    targets: targets.filter((t) => t.post_id === x.id).map((t) => ({
      ...t, type: formatOf(t.network as Network, t.type).key,
      options: (() => { try { return t.options ? JSON.parse(t.options) : {}; } catch { return {}; } })(),
    })),
    media: media.filter((m) => m.post_id === x.id).map(({ post_id, position, file, ...a }) => ({ ...a, _file: file })),
  }));
}

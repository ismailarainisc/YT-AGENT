import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'youtube_agent.sqlite');

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing SQLite database, creating new one', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Run migrations
  initSchema(db);
  saveDb();

  return db;
}

export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.warn('Failed to save SQLite database to disk:', err);
  }
}

function initSchema(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS application_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS connected_accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      picture TEXT,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      token_expiry INTEGER,
      scopes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS youtube_channels (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL UNIQUE,
      account_id TEXT NOT NULL,
      title TEXT NOT NULL,
      custom_url TEXT,
      description TEXT,
      subscriber_count INTEGER DEFAULT 0,
      video_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      avatar_url TEXT,
      banner_url TEXT,
      default_privacy TEXT DEFAULT 'private',
      is_active INTEGER DEFAULT 1,
      published_at DATETIME,
      uploads_playlist_id TEXT,
      country TEXT,
      last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS upload_jobs (
      id TEXT PRIMARY KEY,
      channel_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      tags TEXT,
      hashtags TEXT,
      category_id TEXT DEFAULT '28',
      privacy_status TEXT NOT NULL DEFAULT 'private',
      publish_at DATETIME,
      made_for_kids INTEGER DEFAULT 0,
      file_path TEXT,
      original_filename TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 0,
      is_short INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      youtube_video_id TEXT,
      verified_status TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      autonomous_mode INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uploaded_videos (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      youtube_video_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      privacy_status TEXT NOT NULL,
      is_short INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      published_at DATETIME,
      verified_at DATETIME,
      upload_job_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS video_metadata (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      suggested_titles TEXT,
      suggested_description TEXT,
      suggested_tags TEXT,
      suggested_hashtags TEXT,
      suggested_category TEXT,
      thumbnail_prompt TEXT,
      policy_risk_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES upload_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comment_threads (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      youtube_comment_id TEXT NOT NULL UNIQUE,
      video_id TEXT,
      author_name TEXT,
      author_avatar TEXT,
      text_display TEXT NOT NULL,
      published_at DATETIME,
      category TEXT DEFAULT 'general',
      sentiment TEXT DEFAULT 'neutral',
      reply_status TEXT DEFAULT 'unanswered',
      is_spam INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comment_replies (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      reply_text TEXT NOT NULL,
      is_auto INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      posted_at DATETIME,
      youtube_reply_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (comment_id) REFERENCES comment_threads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS execution_logs (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor TEXT DEFAULT 'system',
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_provider_configs (
      provider_id TEXT PRIMARY KEY,
      api_key_encrypted TEXT,
      model_name TEXT NOT NULL,
      priority_order INTEGER DEFAULT 1,
      is_enabled INTEGER DEFAULT 1,
      last_used_at DATETIME,
      failure_count INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS learned_links_repository (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      video_id TEXT,
      keyword_trigger TEXT NOT NULL,
      title TEXT NOT NULL,
      resource_url TEXT NOT NULL,
      description TEXT,
      times_shared INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pending_dm_actions (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      video_id TEXT,
      video_title TEXT,
      youtube_comment_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT,
      comment_text TEXT NOT NULL,
      detected_intent TEXT NOT NULL,
      requested_resource TEXT,
      suggested_reply TEXT,
      provided_link TEXT,
      status TEXT DEFAULT 'pending_creator',
      email_notified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS ai_agent_conversations (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      role TEXT NOT NULL,
      agent_type TEXT DEFAULT 'general',
      content TEXT NOT NULL,
      action_payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON upload_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_comments_channel ON comment_threads(channel_id);
    CREATE INDEX IF NOT EXISTS idx_comments_status ON comment_threads(reply_status);
    CREATE INDEX IF NOT EXISTS idx_pending_dm_status ON pending_dm_actions(status);
    CREATE INDEX IF NOT EXISTS idx_learned_links_channel ON learned_links_repository(channel_id);
  `);

  // Safe schema migrations for preexisting databases
  try { database.run('ALTER TABLE youtube_channels ADD COLUMN published_at DATETIME;'); } catch { /* column exists */ }
  try { database.run('ALTER TABLE youtube_channels ADD COLUMN uploads_playlist_id TEXT;'); } catch { /* column exists */ }
  try { database.run('ALTER TABLE youtube_channels ADD COLUMN country TEXT;'); } catch { /* column exists */ }
  try { database.run('ALTER TABLE upload_jobs ADD COLUMN recording_date TEXT;'); } catch { /* column exists */ }
  try { database.run('ALTER TABLE comment_threads ADD COLUMN detected_intent TEXT DEFAULT "general";'); } catch { /* column exists */ }
}

/**
 * Execute a query with parameters and return array of objects
 */
export async function query<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T[]> {
  const database = await getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

/**
 * Execute a single query returning first row or null
 */
export async function queryOne<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute insert/update/delete and auto-save
 */
export async function execute(sql: string, params: any[] = []): Promise<void> {
  const database = await getDb();
  database.run(sql, params);
  saveDb();
}

/**
 * Log execution message
 */
export async function logExecution(jobId: string | null, level: 'info' | 'warn' | 'error' | 'success', message: string, details?: any): Promise<void> {
  const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;
  await execute(
    'INSERT INTO execution_logs (id, job_id, level, message, details, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
    [id, jobId, level, message, detailsStr]
  );
}

/**
 * Record an audit event
 */
export async function logAudit(action: string, actor: string, details?: any): Promise<void> {
  const id = 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;
  await execute(
    'INSERT INTO audit_events (id, action, actor, details, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
    [id, action, actor, detailsStr]
  );
}

/**
 * Get setting value
 */
export async function getSetting(key: string, defaultValue = ''): Promise<string> {
  const row = await queryOne<{ value: string }>('SELECT value FROM application_settings WHERE key = ?', [key]);
  return row ? row.value : defaultValue;
}

/**
 * Save setting value
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await execute(
    `INSERT INTO application_settings (key, value, updated_at) 
     VALUES (?, ?, datetime("now")) 
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value]
  );
}

/**
 * Export full DB as Base64 for backup
 */
export async function exportDatabaseBackup(): Promise<string> {
  const database = await getDb();
  const binary = database.export();
  return Buffer.from(binary).toString('base64');
}

/**
 * Restore DB from Base64
 */
export async function restoreDatabaseBackup(base64Data: string): Promise<void> {
  if (!SQL) SQL = await initSqlJs();
  const buffer = Buffer.from(base64Data, 'base64');
  db = new SQL.Database(buffer);
  saveDb();
}

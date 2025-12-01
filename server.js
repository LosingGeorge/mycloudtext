const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
// Allow up to 50MB for the entire request (Text + Encrypted Files)
app.use(express.json({ limit: "50mb" }));
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- SELF-REPAIRING DATABASE INIT ---
async function initDb() {
  try {
    // 1. Create table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at TIMESTAMP,
        salt TEXT,
        iv TEXT,
        data TEXT,
        files_json TEXT
      )
    `);

    // 2. CRITICAL: Force add the 'files_json' column if it's missing.
    // This fixes the "column does not exist" error.
    await pool.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS files_json TEXT;`);
    
    console.log("✅ Database verified: Ready for files.");
  } catch (err) {
    console.error("❌ DB Init Error:", err);
  }
}
initDb();

// --- ROUTES ---
app.get("/api/notes", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, title, created_at, files_json FROM notes ORDER BY created_at DESC");
    const notes = result.rows.map(row => {
      let fileMeta = [];
      try { fileMeta = JSON.parse(row.files_json || "[]").map(f => ({ filename: f.filename, size: f.size })); } catch (e) {}
      return { id: row.id, title: row.title, created_at: row.created_at, files: fileMeta };
    });
    res.json({ notes });
  } catch (err) { res.status(500).json({ error: "DB Error" }); }
});

app.get("/api/notes/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notes WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const row = result.rows[0];
    res.json({
      ...row,
      files: row.files_json ? JSON.parse(row.files_json) : []
    });
  } catch (err) { res.status(500).json({ error: "DB Error" }); }
});

app.post("/api/notes", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, title, salt, iv, data, files } = req.body;
    const noteId = id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();

    // Merge new files with existing ones
    const checkRes = await client.query("SELECT files_json FROM notes WHERE id = $1", [noteId]);
    let finalFiles = [];
    if (checkRes.rows.length > 0) {
      finalFiles = JSON.parse(checkRes.rows[0].files_json || "[]");
    }

    // Process new uploads
    if (Array.isArray(files)) {
      files.forEach(f => {
        if (f.data && f.filename) {
          finalFiles.push({ filename: f.filename, size: f.data.length, iv: f.iv, data: f.data });
        }
      });
    }

    const query = `
      INSERT INTO notes (id, title, created_at, salt, iv, data, files_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        data = EXCLUDED.data,
        iv = EXCLUDED.iv,
        files_json = EXCLUDED.files_json
    `;
    
    await client.query(query, [noteId, title, createdAt, salt, iv, data, JSON.stringify(finalFiles)]);
    res.json({ ok: true, id: noteId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try { await pool.query("DELETE FROM notes WHERE id = $1", [req.params.id]); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));



const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");

// --- CONFIGURATION ---
const app = express();
app.use(cors());
// Allow large payloads (50mb) because we store encrypted files in the JSON body now
app.use(express.json({ limit: "50mb" }));
app.use(express.static(__dirname));

// Connect to PostgreSQL (Render provides the DATABASE_URL env var)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Database Table on Startup
pool.query(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TIMESTAMP,
    salt TEXT,
    iv TEXT,
    data TEXT,
    files_json TEXT
  )
`).catch(err => console.error("DB Init Error:", err));

// --- API ROUTES ---

// 1. List Notes (Metadata only - lighter payload)
app.get("/api/notes", async (req, res) => {
  try {
    // We select files_json to get the file sizes/names, but we map out the heavy 'data' 
    // before sending the list to the client to keep the list fast.
    const result = await pool.query(
      "SELECT id, title, created_at, salt, iv, files_json FROM notes ORDER BY created_at DESC"
    );
    
    const notes = result.rows.map(row => {
      let fileMeta = [];
      try {
        const parsed = JSON.parse(row.files_json || "[]");
        // Only send metadata (name, size), NOT the base64 data
        fileMeta = parsed.map(f => ({ filename: f.filename, size: f.size }));
      } catch (e) {}
      
      return {
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        salt: row.salt,
        iv: row.iv,
        files: fileMeta
      };
    });

    res.json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 2. Get Single Note (Includes full heavy body + file data)
app.get("/api/notes/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notes WHERE id = $1", [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    const row = result.rows[0];
    const files = row.files_json ? JSON.parse(row.files_json) : [];

    res.json({
      id: row.id,
      title: row.title,
      created_at: row.created_at,
      salt: row.salt,
      iv: row.iv,
      data: row.data, // The encrypted text body
      files: files    // The encrypted files (including base64 data)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 3. Create or Update Note
app.post("/api/notes", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, title, salt, iv, data, files } = req.body; // 'files' here contains new uploads with data
    
    if (!title || !salt || !iv || !data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const noteId = id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();

    // 1. Check if note exists to MERGE file lists
    const checkRes = await client.query("SELECT files_json FROM notes WHERE id = $1", [noteId]);
    
    let finalFiles = [];
    
    // If updating existing note, keep old files
    if (checkRes.rows.length > 0) {
      const oldFiles = JSON.parse(checkRes.rows[0].files_json || "[]");
      finalFiles = [...oldFiles];
    }

    // Add NEW files (ensure they have data)
    if (Array.isArray(files)) {
      files.forEach(f => {
        if (f.data && f.filename) {
          finalFiles.push({
            filename: f.filename,
            size: f.data.length, // approximate size in bytes (base64)
            iv: f.iv,
            data: f.data // storing base64 blob directly in DB
          });
        }
      });
    }

    const filesStr = JSON.stringify(finalFiles);

    // 2. Upsert (Insert or Update)
    const query = `
      INSERT INTO notes (id, title, created_at, salt, iv, data, files_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        data = EXCLUDED.data,
        iv = EXCLUDED.iv,
        files_json = EXCLUDED.files_json
    `;

    await client.query(query, [noteId, title, createdAt, salt, iv, data, filesStr]);

    res.json({ ok: true, id: noteId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 4. Delete Note
app.delete("/api/notes/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM notes WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));


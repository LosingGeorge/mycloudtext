const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

// Configuration
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "notes.db");
const FILES_DIR = path.join(DATA_DIR, "files");
const MAX_FILE_BYTES = 10 * 1024 * 1024; // Increased to 10 MB

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR);

// Initialize Database
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  // We store files as a JSON string inside the text column for simplicity in this setup
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT,
      salt TEXT,
      iv TEXT,
      data TEXT,
      files TEXT
    )
  `);
});

const app = express();
app.use(cors());
// Increase payload limit to handle the Base64 encrypted files
app.use(express.json({ limit: "50mb" })); 
app.use(express.static(__dirname));

// --- API ROUTES ---

// 1. List Notes (Metadata only - lighter payload)
app.get("/api/notes", (req, res) => {
  db.all("SELECT id, title, created_at, salt, iv, files FROM notes ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Parse the files JSON string to return valid objects
    const notes = rows.map(n => ({
      ...n,
      files: n.files ? JSON.parse(n.files) : []
    }));
    res.json({ notes });
  });
});

// 2. Get Single Note (Includes heavy encrypted body)
app.get("/api/notes/:id", (req, res) => {
  db.get("SELECT * FROM notes WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Note not found" });

    const filesMeta = row.files ? JSON.parse(row.files) : [];
    const responseFiles = [];

    // Attach the actual Base64 file content from disk
    for (const f of filesMeta) {
      const filePath = path.join(FILES_DIR, f.path);
      if (fs.existsSync(filePath)) {
        try {
          const buf = fs.readFileSync(filePath);
          responseFiles.push({
            filename: f.filename,
            size: f.size,
            data: buf.toString("base64"), // Encrypted blob
            iv: f.iv
          });
        } catch (e) {
          console.error(`Error reading file ${f.path}`, e);
        }
      }
    }

    res.json({
      ...row,
      files: responseFiles // Send full file data to client
    });
  });
});

// 3. Create or Update Note
app.post("/api/notes", (req, res) => {
  const { id, title, salt, iv, data, files } = req.body;
  
  if (!title || !salt || !iv || !data) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Generate ID if new
  const noteId = id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  // 1. Save new uploaded files to disk
  const newFilesMeta = [];
  if (Array.isArray(files)) {
    for (const f of files) {
      // Basic validation
      if (!f.data || !f.filename) continue;
      
      const buf = Buffer.from(f.data, "base64");
      if (buf.length > MAX_FILE_BYTES) {
        return res.status(400).json({ error: `File ${f.filename} too large` });
      }

      const safeName = `${noteId}-${Date.now()}-${f.filename.replace(/[^a-z0-9\.\-\_]/gi, '_')}`;
      fs.writeFileSync(path.join(FILES_DIR, safeName), buf);

      newFilesMeta.push({
        filename: f.filename,
        path: safeName,
        size: buf.length,
        iv: f.iv
      });
    }
  }

  // 2. Check if note exists to MERGE file lists (Fixes the overwrite bug)
  db.get("SELECT files FROM notes WHERE id = ?", [noteId], (err, row) => {
    let finalFileList = newFilesMeta;

    if (row && row.files) {
      // Note exists: Append new files to existing files
      const existingFiles = JSON.parse(row.files);
      finalFileList = [...existingFiles, ...newFilesMeta];
    }

    const filesJson = JSON.stringify(finalFileList);

    // 3. Upsert (Insert or Replace) into SQLite
    const stmt = db.prepare(`
      INSERT INTO notes (id, title, created_at, salt, iv, data, files)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        data=excluded.data,
        iv=excluded.iv,
        files=excluded.files
    `);

    stmt.run(noteId, title, createdAt, salt, iv, data, filesJson, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, id: noteId });
    });
    stmt.finalize();
  });
});

// 4. Delete Note
app.delete("/api/notes/:id", (req, res) => {
  const id = req.params.id;
  
  // First get the file paths to clean up disk
  db.get("SELECT files FROM notes WHERE id = ?", [id], (err, row) => {
    if (row && row.files) {
      const files = JSON.parse(row.files);
      files.forEach(f => {
        const fp = path.join(FILES_DIR, f.path);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      });
    }

    // Now delete from DB
    db.run("DELETE FROM notes WHERE id = ?", [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    });
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Secure Notes running on http://localhost:${port}`));

const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const cors = require("cors");

const DATA_DIR = path.join(__dirname, "data");
const NOTES_JSON = path.join(DATA_DIR, "notes.json");
const FILES_DIR = path.join(DATA_DIR, "files");
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(FILES_DIR);
if (!fs.existsSync(NOTES_JSON)) fs.writeJsonSync(NOTES_JSON, []);

const app = express();
app.use(cors());
app.use(express.json({ limit: "30mb" })); // allow uploads (encrypted) up to ~30MB total
app.use(express.static(__dirname)); // serve index.html

// List notes metadata (id, title, createdAt, salt (base64) - needed for client derive key)
app.get("/api/notes", (req, res) => {
  const notes = fs.readJsonSync(NOTES_JSON);
  // return only public metadata needed by client to display list
  const meta = notes.map(n => ({
    id: n.id,
    title: n.title,
    createdAt: n.createdAt,
    salt: n.salt,
    iv: n.iv,
    files: n.files.map(f => ({ filename: f.filename, size: f.size }))
  }));
  res.json({ notes: meta });
});

// Get a note (returns encrypted note payload + files' encrypted blobs)
app.get("/api/notes/:id", (req, res) => {
  const id = req.params.id;
  const notes = fs.readJsonSync(NOTES_JSON);
  const note = notes.find(n => n.id === id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  // read files from disk and attach base64 encrypted content for client to decrypt
  const responseFiles = [];
  for (const f of note.files) {
    const filePath = path.join(FILES_DIR, f.path);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      responseFiles.push({
        filename: f.filename,
        size: f.size,
        data: buf.toString("base64"),
        iv: f.iv
      });
    }
  }

  res.json({
    id: note.id,
    title: note.title,
    createdAt: note.createdAt,
    salt: note.salt,
    iv: note.iv,
    data: note.data, // encrypted note data (base64)
    files: responseFiles
  });
});

// Create or update a note (client sends fully encrypted base64 data and metadata)
app.post("/api/notes", async (req, res) => {
  try {
    const { id, title, salt, iv, data, files } = req.body;
    if (!title || !salt || !iv || !data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const notes = fs.readJsonSync(NOTES_JSON);

    const noteId = id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    const createdAt = new Date().toISOString();

    // Save files (they are already encrypted & base64-encoded by client)
    const savedFiles = [];
    if (Array.isArray(files)) {
      for (const f of files) {
        const b64 = f.data;
        if (!b64) continue;
        const buf = Buffer.from(b64, "base64");
        if (buf.length > MAX_FILE_BYTES) {
          return res.status(400).json({ error: `File ${f.filename} exceeds 5MB limit` });
        }
        const safeName = `${noteId}-${Date.now()}-${f.filename.replace(/[^a-z0-9\.\-\_]/gi,'_')}`;
        const fp = path.join(FILES_DIR, safeName);
        fs.writeFileSync(fp, buf);
        savedFiles.push({ filename: f.filename, path: safeName, size: buf.length, iv: f.iv });
      }
    }

    // store note entry (encrypted data is saved as base64 string)
    const existingIndex = notes.findIndex(n => n.id === noteId);
    const entry = {
      id: noteId,
      title,
      createdAt,
      salt,
      iv,
      data,
      files: savedFiles
    };

    if (existingIndex >= 0) {
      notes[existingIndex] = entry;
    } else {
      notes.push(entry);
    }

    fs.writeJsonSync(NOTES_JSON, notes, { spaces: 2 });

    res.json({ ok: true, id: noteId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a note
app.delete("/api/notes/:id", (req, res) => {
  const id = req.params.id;
  const notes = fs.readJsonSync(NOTES_JSON);
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return res.status(404).json({ error: "Note not found" });

  const note = notes[idx];
  // remove files
  for (const f of note.files) {
    const fp = path.join(FILES_DIR, f.path);
    if (fs.existsSync(fp)) fs.removeSync(fp);
  }
  notes.splice(idx, 1);
  fs.writeJsonSync(NOTES_JSON, notes, { spaces: 2 });
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server listening on", port));

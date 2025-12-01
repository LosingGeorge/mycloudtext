<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>MyCloudText — Secure</title>
<style>
  :root{ --bg:#f6f6f7; --card:#fff; --text:#111; --muted:#666; --accent:#0a66ff; }
  [data-theme="dark"]{ --bg:#0b0b0d; --card:#15171a; --text:#e6e6e6; --muted:#9aa0a6; }
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;background:var(--bg);color:var(--text);height:100vh;overflow:hidden;}
  
  /* Layout */
  header{height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:var(--card);border-bottom:1px solid rgba(128,128,128,0.1);}
  main{display:flex;height:calc(100vh - 51px);}
  
  .sidebar{width:300px;background:var(--card);border-right:1px solid rgba(128,128,128,0.1);display:flex;flex-direction:column;}
  .note-list{flex:1;overflow-y:auto;padding:10px;}
  .editor{flex:1;display:flex;flex-direction:column;padding:20px;overflow-y:auto;}

  /* Components */
  .note-item{padding:12px;border-radius:6px;margin-bottom:4px;cursor:pointer;border:1px solid transparent;}
  .note-item:hover{background:rgba(128,128,128,0.05);}
  .note-item.active{background:rgba(10,102,255,0.1);border-color:rgba(10,102,255,0.2);color:var(--accent);}
  
  input, textarea{background:transparent;border:none;color:var(--text);outline:none;font-family:inherit;}
  input{font-size:1.5rem;font-weight:700;width:100%;margin-bottom:10px;padding:5px 0;}
  textarea{flex:1;resize:none;font-size:1.1rem;line-height:1.6;}
  
  button{padding:8px 16px;border-radius:6px;border:0;background:var(--accent);color:white;cursor:pointer;font-weight:500;}
  button:hover{opacity:0.9;}
  .btn-ghost{background:transparent;color:var(--muted);border:1px solid rgba(128,128,128,0.2);}
  .btn-danger{background:#ff3333;color:white;}
  
  .toolbar{display:flex;gap:10px;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid rgba(128,128,128,0.1);}
  .file-area{margin-top:20px;padding-top:10px;border-top:1px dashed rgba(128,128,128,0.2);}
  .file-chip{display:inline-flex;align-items:center;gap:8px;background:rgba(128,128,128,0.1);padding:4px 10px;border-radius:20px;font-size:0.85rem;margin-right:5px;margin-bottom:5px;}
  
  .overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:var(--bg);z-index:999;display:flex;align-items:center;justify-content:center;}
  .login-box{width:350px;background:var(--card);padding:30px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.1);text-align:center;}
  .hidden{display:none !important;}
  .spin{animation: spin 1s linear infinite;}
  @keyframes spin { 100% { transform: rotate(360deg); } }
</style>
</head>
<body data-theme="light">

<div id="loginOverlay" class="overlay">
  <div class="login-box">
    <h2 style="margin-top:0">MyCloudText</h2>
    <p class="muted" style="margin-bottom:20px">End-to-End Encrypted Notes</p>
    <input id="pwInput" type="password" placeholder="Encryption Password" style="font-size:1rem;border:1px solid #ccc;border-radius:4px;padding:10px;margin-bottom:15px;">
    <button onclick="doLogin()" style="width:100%">Unlock Notes</button>
    <div style="margin-top:15px">
      <button class="btn-ghost" onclick="doGuest()">Guest Mode</button>
    </div>
  </div>
</div>

<header>
  <div style="font-weight:700;font-size:1.1rem;">mycloudtext</div>
  <div style="display:flex;gap:10px;align-items:center">
    <span id="status" class="muted" style="font-size:0.8rem"></span>
    <select onchange="setTheme(this.value)" style="border:1px solid #ccc;padding:4px;border-radius:4px;font-size:0.8rem">
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </div>
</header>

<main>
  <aside class="sidebar">
    <div style="padding:15px;border-bottom:1px solid rgba(128,128,128,0.1);display:flex;justify-content:space-between;align-items:center;">
      <strong>All Notes</strong>
      <button class="btn-ghost" style="padding:4px 10px;font-size:0.8rem" onclick="initNewNote()">+ New</button>
    </div>
    <div id="noteList" class="note-list"></div>
  </aside>

  <section class="editor">
    <div class="toolbar">
      <div style="flex:1"></div>
      <input type="file" id="filePicker" multiple style="display:none" onchange="handleFileSelect(this)">
      <button class="btn-ghost" onclick="document.getElementById('filePicker').click()">📎 Attach</button>
      <button onclick="saveNote()">Save Changes</button>
      <button class="btn-danger" onclick="deleteNote()">Delete</button>
    </div>

    <input id="noteTitle" type="text" placeholder="Note Title...">
    <textarea id="noteBody" placeholder="Start typing your encrypted note..."></textarea>
    
    <div class="file-area">
      <div style="font-size:0.8rem;color:var(--muted);margin-bottom:5px">Attachments</div>
      <div id="fileList"></div>
    </div>
  </section>
</main>

<script>
/* --- 1. Crypto Engine (Web Crypto API) --- */
const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(password, saltB64) {
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const keyMat = await crypto.subtle.importKey("raw", enc.encode(password), {name:"PBKDF2"}, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMat, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function encryptData(dataStr, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = enc.encode(dataStr);
  const ct = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, buf);
  return { 
    iv: btoa(String.fromCharCode(...iv)), 
    data: btoa(String.fromCharCode(...new Uint8Array(ct))) 
  };
}

async function decryptData(b64Data, b64Iv, key) {
  const iv = Uint8Array.from(atob(b64Iv), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({name:"AES-GCM", iv}, key, ct);
  return dec.decode(pt);
}

// Helper for files (Binary <-> Base64)
async function encryptFile(arrayBuf, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, arrayBuf);
  return { 
    iv: btoa(String.fromCharCode(...iv)), 
    data: btoa(String.fromCharCode(...new Uint8Array(ct))) 
  };
}
async function decryptFile(b64Data, b64Iv, key) {
  const iv = Uint8Array.from(atob(b64Iv), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
  return crypto.subtle.decrypt({name:"AES-GCM", iv}, key, ct);
}

/* --- 2. App State & Logic --- */
let STATE = {
  password: null,
  notes: [],
  currentNote: null,
  pendingFiles: [] // Files waiting to be uploaded
};

// UI Helpers
const $ = id => document.getElementById(id);
const setStatus = msg => $('status').innerText = msg;

// Theme
if(localStorage.getItem('theme')) setTheme(localStorage.getItem('theme'));
function setTheme(t) { document.body.setAttribute('data-theme', t); localStorage.setItem('theme', t); }

// Auth
function doLogin() {
  const pw = $('pwInput').value;
  if(!pw) return alert("Password required");
  STATE.password = pw;
  $('loginOverlay').classList.add('hidden');
  loadNotes();
}
function doGuest() {
  STATE.password = "guest-" + Math.random();
  $('loginOverlay').classList.add('hidden');
  loadNotes();
}

// API
async function loadNotes() {
  setStatus("Loading...");
  try {
    const r = await fetch('/api/notes');
    const d = await r.json();
    STATE.notes = d.notes || [];
    renderList();
    setStatus("Ready");
  } catch(e) { setStatus("Error loading notes"); }
}

function renderList() {
  const el = $('noteList');
  el.innerHTML = "";
  STATE.notes.forEach(n => {
    const div = document.createElement('div');
    div.className = `note-item ${STATE.currentNote && STATE.currentNote.id === n.id ? 'active' : ''}`;
    div.innerHTML = `<strong>${esc(n.title)}</strong><br><small class="muted">${new Date(n.created_at).toLocaleDateString()}</small>`;
    div.onclick = () => loadFullNote(n.id);
    el.appendChild(div);
  });
}

function initNewNote() {
  STATE.currentNote = null;
  STATE.pendingFiles = [];
  $('noteTitle').value = "";
  $('noteBody').value = "";
  $('fileList').innerHTML = "";
  renderList(); // clears active class
}

async function loadFullNote(id) {
  setStatus("Downloading & Decrypting...");
  try {
    const r = await fetch(`/api/notes/${id}`);
    const note = await r.json();
    
    // Decrypt
    const key = await deriveKey(STATE.password, note.salt);
    const body = await decryptData(note.data, note.iv, key); // Body is encrypted JSON {text: "..."}
    const bodyObj = JSON.parse(body);

    STATE.currentNote = note;
    STATE.currentNote.files = note.files || []; // Store existing files
    STATE.pendingFiles = []; // Clear pending

    $('noteTitle').value = note.title;
    $('noteBody').value = bodyObj.text || "";
    
    renderFiles();
    renderList();
    setStatus("Decrypted");
  } catch(e) {
    console.error(e);
    alert("Decryption failed. Wrong password?");
    setStatus("Error");
  }
}

function renderFiles() {
  const el = $('fileList');
  el.innerHTML = "";

  // 1. Existing Server Files
  if (STATE.currentNote && STATE.currentNote.files) {
    STATE.currentNote.files.forEach(f => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.innerHTML = `<span>📄 ${esc(f.filename)} <small>(${(f.size/1024).toFixed(0)}KB)</small></span>`;
      
      const btn = document.createElement('button');
      btn.innerText = "⬇";
      btn.className = "btn-ghost";
      btn.style.padding = "2px 6px";
      btn.onclick = () => downloadFile(f);
      chip.appendChild(btn);
      el.appendChild(chip);
    });
  }

  // 2. Pending Uploads
  STATE.pendingFiles.forEach(f => {
    const chip = document.createElement('div');
    chip.className = 'file-chip';
    chip.style.border = "1px solid var(--accent)";
    chip.innerHTML = `<span>📎 ${esc(f.filename)} <small>(Ready to upload)</small></span>`;
    el.appendChild(chip);
  });
}

// File Logic
async function handleFileSelect(input) {
  for (const file of input.files) {
    if (file.size > 10 * 1024 * 1024) { alert(`Skipping ${file.name} (Too big)`); continue; }
    const buf = await file.arrayBuffer();
    STATE.pendingFiles.push({ filename: file.name, raw: buf });
  }
  renderFiles();
  input.value = ""; // reset
}

async function downloadFile(fMeta) {
  setStatus("Decrypting file...");
  try {
    const key = await deriveKey(STATE.password, STATE.currentNote.salt);
    const decryptedBuf = await decryptFile(fMeta.data, fMeta.iv, key);
    
    const blob = new Blob([decryptedBuf]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fMeta.filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  } catch(e) {
    alert("File decryption failed");
    setStatus("Error");
  }
}

// Save & Delete
async function saveNote() {
  const title = $('noteTitle').value.trim() || "Untitled";
  const bodyText = $('noteBody').value;
  setStatus("Encrypting & Uploading...");

  // Generate Salt
  let saltB64;
  if (STATE.currentNote) {
    saltB64 = STATE.currentNote.salt;
  } else {
    const s = crypto.getRandomValues(new Uint8Array(16));
    saltB64 = btoa(String.fromCharCode(...s));
  }

  const key = await deriveKey(STATE.password, saltB64);

  // Encrypt Body
  const payload = JSON.stringify({ text: bodyText });
  const encBody = await encryptData(payload, key);

  // Encrypt Pending Files
  const filesToUpload = [];
  for (const pf of STATE.pendingFiles) {
    const encF = await encryptFile(pf.raw, key);
    filesToUpload.push({
      filename: pf.filename,
      data: encF.data,
      iv: encF.iv
    });
  }

  const reqBody = {
    id: STATE.currentNote ? STATE.currentNote.id : null,
    title: title,
    salt: saltB64,
    iv: encBody.iv,
    data: encBody.data,
    files: filesToUpload // Only sending NEW files. Server will merge.
  };

  try {
    const r = await fetch('/api/notes', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(reqBody)
    });
    const res = await r.json();
    
    if (res.ok) {
      // If success, we reload the note to get the full merged state from server
      await loadFullNote(res.id);
      await loadNotes(); // Refresh list
      setStatus("Saved");
    } else {
      alert("Save failed: " + res.error);
    }
  } catch(e) {
    alert("Network error");
  }
}

async function deleteNote() {
  if(!STATE.currentNote) return;
  if(!confirm("Permanently delete this note?")) return;
  
  await fetch(`/api/notes/${STATE.currentNote.id}`, {method:'DELETE'});
  initNewNote();
  loadNotes();
}

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
</script>
</body>
</html>

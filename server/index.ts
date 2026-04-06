import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Set up default root based on OS (drive root on Windows, / on Unix)
const SYSTEM_ROOT = path.parse(process.cwd()).root;

// Setup Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = req.body.path || SYSTEM_ROOT;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Dummy log storage for demonstration
let logs: string[] = [
  '[SYSTEM] Mission Control initialized.',
  '[SYSTEM] Connection to OpenClaw standing by...'
];

// --- Status & Logs API ---
app.get('/api/status', (req, res) => {
  res.json({
    status: 'Ready',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

app.get('/api/logs', (req, res) => {
  res.json({ logs });
});

app.post('/api/command', (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  const timestamp = new Date().toISOString();
  logs.push(`[${timestamp}] > ${command}`);
  console.log(`Received command for OpenClaw: ${command}`);

  setTimeout(() => {
    logs.push(`[${new Date().toISOString()}] [OpenClaw Response] Executed: ${command}`);
  }, 1000);

  res.json({ success: true, message: 'Command queued' });
});

// --- File Explorer API ---

// 1. List directory
app.get('/api/fs/list', (req, res) => {
  const dirPath = (req.query.dir as string) || SYSTEM_ROOT;
  
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    // Process items to add some metadata
    const parsedItems = items.map(item => {
      const itemPath = path.join(dirPath, item.name);
      let stat = null;
      try {
        stat = fs.statSync(itemPath);
      } catch (e) {
        // Skip files we can't access
      }
      
      return {
        name: item.name,
        isDirectory: item.isDirectory(),
        path: itemPath,
        size: stat ? stat.size : 0,
        modified: stat ? stat.mtime : null
      };
    });
    
    res.json({ currentDir: dirPath, items: parsedItems });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Upload file
app.post('/api/fs/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ success: true, message: 'File uploaded successfully', file: req.file });
});

// 3. Rename file/folder
app.post('/api/fs/rename', (req, res) => {
  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) return res.status(400).json({ error: 'Missing parameters' });
  
  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, newName);
  
  try {
    fs.renameSync(oldPath, newPath);
    res.json({ success: true, message: 'Renamed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Delete file/folder
app.delete('/api/fs/delete', (req, res) => {
  const { targetPath } = req.body;
  if (!targetPath) return res.status(400).json({ error: 'Missing targetPath' });
  
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Download file
app.get('/api/fs/download', (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'Missing path' });
  
  try {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Serve entirely from memory instead of pipe to bypass stream hangs
    const buffer = fs.readFileSync(absPath);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(absPath)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.status(200).send(buffer);
  } catch (error: any) {
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

// 6. View file (for streaming media in browser without download prompt)
app.get('/api/fs/view', (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'Missing path' });
  
  try {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stat = fs.statSync(absPath);
    
    // Basic explicit MIME types
    const ext = path.extname(absPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.pdf') contentType = 'application/pdf';
    else if (['.txt', '.md', '.json', '.ts', '.tsx', '.js'].includes(ext)) contentType = 'text/plain';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      
      const buffer = fs.readFileSync(absPath);
      const slice = buffer.subarray(start, end + 1);
      
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', slice.length);
      res.status(206).send(slice);
    } else {
      const buffer = fs.readFileSync(absPath);
      res.status(200).send(buffer);
    }
  } catch (error: any) {
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Mission Control Backend running on http://localhost:${PORT}`);
});

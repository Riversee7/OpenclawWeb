import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Dummy log storage for demonstration
let logs: string[] = [
  '[SYSTEM] Mission Control initialized.',
  '[SYSTEM] Connection to OpenClaw standing by...'
];

// 1. Get Status
app.get('/api/status', (req, res) => {
  // Simulating an agent status request
  // In a real scenario, this might check a local process or a specific file
  res.json({
    status: 'Ready',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

// 2. Get Logs
app.get('/api/logs', (req, res) => {
  res.json({ logs });
});

// 3. Send Command
app.post('/api/command', (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  const timestamp = new Date().toISOString();
  logs.push(`[${timestamp}] > ${command}`);

  // Here we would pass the command to the actual OpenClaw agent
  // For demonstration, we simply execute safe dummy commands or log them.
  console.log(`Received command for OpenClaw: ${command}`);

  // Simulate execution delay
  setTimeout(() => {
    logs.push(`[${new Date().toISOString()}] [OpenClaw Response] Executed: ${command}`);
  }, 1000);

  res.json({ success: true, message: 'Command queued' });
});

app.listen(PORT, () => {
  console.log(`Mission Control Backend running on http://localhost:${PORT}`);
});

import React, { useState, useEffect, useRef } from 'react';

interface TerminalProps {
  serverUrl: string;
}

export const Terminal: React.FC<TerminalProps> = ({ serverUrl }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch logs periodically
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${serverUrl}/api/logs`);
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs);
        }
      } catch (error) {
        console.error('Failed to fetch logs', error);
      }
    };
    
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  // Scroll to bottom when logs change
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input;
    setInput('');
    
    try {
      await fetch(`${serverUrl}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
    } catch (error) {
      console.error('Failed to send command', error);
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-dots">
          <div className="dot dot-red"></div>
          <div className="dot dot-yellow"></div>
          <div className="dot dot-green"></div>
        </div>
        <div className="terminal-title">openclaw-agent@localhost:~</div>
      </div>
      
      <div className="terminal-logs">
        {logs.map((log, i) => (
          <div key={i} className="log-entry">
            {log}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      <form className="terminal-input-container" onSubmit={handleSubmit}>
        <span className="terminal-prompt">&gt;</span>
        <input
          type="text"
          className="terminal-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command..."
          autoComplete="off"
          spellCheck="false"
        />
      </form>
    </div>
  );
};

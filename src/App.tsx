import React, { useState, useEffect } from 'react';
import { Bot, Terminal as TerminalIcon, Settings, Compass, Cpu, Activity, ListTodo, HardDrive } from 'lucide-react';
import { Terminal } from './Terminal';
import { Explorer } from './Explorer';

// Erlaubt den Zugriff über das Netzwerk, indem die richtige IP-Adresse des Hosts ermittelt wird.
const SERVER_URL = `http://${window.location.hostname}:3001`;

interface StatusData {
  status: string;
  uptime: number;
  memory?: any;
  cpu?: any;
}

function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/status`);
        const data = await res.json();
        setStatus(data);
      } catch (error) {
        console.error('Failed to fetch status', error);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <Bot className="sidebar-logo-icon" size={28} />
          <span>OpenClaw Control</span>
        </div>
        
        <nav>
          {['Overview', 'Logs & Commands', 'Server Storage', 'Skills', 'Settings'].map((item) => (
            <div 
              key={item} 
              className={`nav-item ${activeTab === item ? 'active' : ''}`}
              onClick={() => setActiveTab(item)}
            >
              {item === 'Overview' && <Activity size={18} />}
              {item === 'Logs & Commands' && <TerminalIcon size={18} />}
              {item === 'Server Storage' && <HardDrive size={18} />}
              {item === 'Skills' && <Compass size={18} />}
              {item === 'Settings' && <Settings size={18} />}
              <span>{item}</span>
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 500 }}>{activeTab}</h2>
          <div className="agent-status" style={{ borderColor: status ? 'var(--success)' : 'var(--danger)', color: status ? 'var(--success)' : 'var(--danger)' }}>
            <div className="status-indicator" style={{ background: status ? 'var(--success)' : 'var(--danger)', boxShadow: `0 0 8px ${status ? 'var(--success)' : 'var(--danger)'}` }}></div>
            {status ? `Agent ${status.status}` : 'Disconnected'}
          </div>
        </div>

        <div className="content-wrapper">
          {activeTab === 'Overview' && (
            <>
              {/* Stat Cards */}
              <div className="stat-card">
                <div className="card-header">
                  <span>System Uptime</span>
                  <Activity className="card-header-icon" size={20} />
                </div>
                <div className="card-value">{status ? formatUptime(status.uptime) : '--:--:--'}</div>
                <div className="card-sub">Active session length</div>
              </div>

              <div className="stat-card">
                <div className="card-header">
                  <span>Active Skill</span>
                  <Compass className="card-header-icon" size={20} />
                </div>
                <div className="card-value">None</div>
                <div className="card-sub">Agent is currently idle</div>
              </div>

              <div className="stat-card">
                <div className="card-header">
                  <span>Memory Usage</span>
                  <Cpu className="card-header-icon" size={20} />
                </div>
                <div className="card-value">
                  {status && status.memory ? Math.round(status.memory.heapUsed / 1024 / 1024) : '0'} MB
                </div>
                <div className="card-sub">Local process memory footprint</div>
              </div>

              <h3 className="dashboard-title" style={{ marginTop: '1rem' }}>Live Systems</h3>
              
              {/* Terminal View */}
              <Terminal serverUrl={SERVER_URL} />

              {/* Tasks Summary */}
              <div className="tasks-container">
                <div className="tasks-header">
                  Recent Tasks
                  <ListTodo size={20} className="card-header-icon" />
                </div>
                
                <div className="task-item">
                  <div className="task-title">
                    <Activity size={14} color="var(--success)"/> System Diagnostic
                  </div>
                  <div className="task-status">Completed 2m ago</div>
                </div>

                <div className="task-item">
                  <div className="task-title">
                    <Bot size={14} color="var(--accent-color)"/> Bootstrap Agent
                  </div>
                  <div className="task-status">Completed 10m ago</div>
                </div>
                
                <div className="task-item" style={{ opacity: 0.5 }}>
                  <div className="task-title">
                    Waiting for instructions...
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Logs & Commands' && (
            <div style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Terminal serverUrl={SERVER_URL} />
            </div>
          )}

          {activeTab === 'Server Storage' && (
            <div style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Explorer serverUrl={SERVER_URL} />
            </div>
          )}
          
          {activeTab !== 'Overview' && activeTab !== 'Logs & Commands' && activeTab !== 'Server Storage' && (
            <div className="stat-card" style={{ gridColumn: 'span 12', height: '200px', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ color: 'var(--text-secondary)' }}>Module under construction</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

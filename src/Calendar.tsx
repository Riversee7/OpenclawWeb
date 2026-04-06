import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Moon, Sun, Play, Power, ListTodo } from 'lucide-react';

interface WorkingHours {
  start: string;
  end: string;
  sleepModeEnabled: boolean;
}

interface Routine {
  id: string;
  name: string;
  description: string;
  schedule: string;
  nextRun: string;
  active: boolean;
}

interface Event {
  id: string;
  title: string;
  time: string;
  type: string;
  status: string;
}

interface CalendarData {
  workingHours: WorkingHours;
  routines: Routine[];
  events: Event[];
}

interface CalendarProps {
  serverUrl: string;
}

export const Calendar: React.FC<CalendarProps> = ({ serverUrl }) => {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'routines' | 'timeline'>('routines');

  const fetchCalendar = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/calendar`);
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch calendar', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [serverUrl]);

  const updateCalendar = async (newData: CalendarData) => {
    setData(newData); // Optimistic UI update
    try {
      await fetch(`${serverUrl}/api/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
    } catch (error) {
      console.error('Failed to update calendar', error);
    }
  };

  const handleWorkingHoursChange = (field: keyof WorkingHours, value: any) => {
    if (!data) return;
    const newData = { ...data };
    newData.workingHours = { ...newData.workingHours, [field]: value };
    updateCalendar(newData);
  };

  const toggleRoutine = (id: string) => {
    if (!data) return;
    const newData = { ...data };
    const routine = newData.routines.find(r => r.id === id);
    if (routine) {
      routine.active = !routine.active;
      updateCalendar(newData);
    }
  };

  if (loading || !data) {
    return <div className="tools-loading">Loading Calendar Data...</div>;
  }

  return (
    <div className="calendar-container">
      {/* Working Hours Section */}
      <div className="working-hours-card">
        <div className="wh-header">
          <Moon size={20} color="var(--accent-color)" />
          <h3>Agent Working Hours & Sleep Mode</h3>
          <label className="switch" style={{ marginLeft: 'auto' }}>
            <input 
              type="checkbox" 
              checked={data.workingHours.sleepModeEnabled} 
              onChange={(e) => handleWorkingHoursChange('sleepModeEnabled', e.target.checked)} 
            />
            <span className="slider round"></span>
          </label>
        </div>
        
        {data.workingHours.sleepModeEnabled ? (
          <div className="wh-settings">
            <div className="wh-field">
              <label>Wake Up Time</label>
              <input 
                type="time" 
                value={data.workingHours.start} 
                onChange={(e) => handleWorkingHoursChange('start', e.target.value)} 
              />
            </div>
            <div className="wh-field">
              <label>Sleep Time</label>
              <input 
                type="time" 
                value={data.workingHours.end} 
                onChange={(e) => handleWorkingHoursChange('end', e.target.value)} 
              />
            </div>
            <div className="wh-info">
              OpenClaw will automatically suspend generic background tasks outside these hours to save API usage.
            </div>
          </div>
        ) : (
          <div className="wh-info" style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
            Sleep mode is disabled. OpenClaw runs 24/7.
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="calendar-tabs">
        <button 
          className={`cal-tab ${subTab === 'routines' ? 'active' : ''}`}
          onClick={() => setSubTab('routines')}
        >
          <Clock size={16} /> Routines (Cron Jobs)
        </button>
        <button 
          className={`cal-tab ${subTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setSubTab('timeline')}
        >
          <CalendarIcon size={16} /> Schedule & Timeline
        </button>
      </div>

      <div className="calendar-content">
        {subTab === 'routines' && (
          <div className="routines-grid">
            {data.routines.map(routine => (
              <div key={routine.id} className={`routine-card ${routine.active ? 'active' : ''}`}>
                <div className="routine-header">
                  <div className="routine-title">
                    <Power size={16} color={routine.active ? "var(--success)" : "var(--text-secondary)"} />
                    <h4>{routine.name}</h4>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={routine.active} 
                      onChange={() => toggleRoutine(routine.id)} 
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="routine-body">
                  <p>{routine.description}</p>
                  <div className="routine-meta">
                    <div className="meta-item">
                      <span>Schedule:</span> <code className="cron-code">{routine.schedule}</code>
                    </div>
                    {routine.active && (
                      <div className="meta-item next-run">
                        <Play size={12} /> Next Run: {routine.nextRun}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {subTab === 'timeline' && (
          <div className="timeline-container">
             <div className="timeline-line"></div>
             {data.events.map((event, i) => {
               const d = new Date(event.time);
               const timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
               const dateString = d.toLocaleDateString();
               const isPending = event.status === 'pending';
               
               return (
                 <div key={event.id} className={`timeline-item ${isPending ? 'pending' : 'completed'}`}>
                   <div className="timeline-dot"></div>
                   <div className="timeline-content">
                      <div className="tl-time">{dateString} - {timeString}</div>
                      <div className="tl-card">
                         <div className="tl-title">
                            <ListTodo size={16} />
                            {event.title}
                         </div>
                         <div className={`tl-status ${event.status}`}>
                            {event.status.toUpperCase()}
                         </div>
                      </div>
                   </div>
                 </div>
               );
             })}
          </div>
        )}
      </div>
    </div>
  );
};

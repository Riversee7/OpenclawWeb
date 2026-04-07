import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Moon, Sun, Play, Power, ListTodo, ChevronLeft, ChevronRight, X, Bot, User, Info } from 'lucide-react';

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
  description: string;
  start: string; // ISO String
  end: string;   // ISO String
  allDay: boolean;
  category: 'agent' | 'user' | 'meeting' | 'routine';
  status: 'pending' | 'completed' | 'cancelled';
  metadata?: any;
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
  const [view, setView] = useState<'grid' | 'routines'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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

  // Helper: Month Navigation
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  // Helper: Grid Generation
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderGrid = () => {
    if (!data) return null;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    // Empty days for padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
    }
    
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateString = date.toISOString().split('T')[0];
      const isToday = new Date().toDateString() === date.toDateString();
      
      const dayEvents = data.events.filter(e => e.start.startsWith(dateString));
      
      days.push(
        <div key={d} className={`cal-day ${isToday ? 'today' : ''}`}>
          <div className="day-number">{d}</div>
          <div className="day-events">
            {dayEvents.map(event => (
              <div 
                key={event.id} 
                className={`cal-event ${event.category}`}
                onClick={() => setSelectedEvent(event)}
              >
                {event.category === 'agent' && <Bot size={10} style={{marginRight: '4px'}} />}
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return days;
  };

  if (loading || !data) {
    return <div className="tools-loading">Loading Smart Calendar...</div>;
  }

  return (
    <div className="calendar-container">
      {/* Header controls */}
      <div className="calendar-grid-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{fontSize: '1.5rem', margin: 0}}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="calendar-grid-nav">
             <button className="cal-nav-btn" onClick={prevMonth}><ChevronLeft size={16}/></button>
             <button className="cal-nav-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
             <button className="cal-nav-btn" onClick={nextMonth}><ChevronRight size={16}/></button>
          </div>
        </div>
        
        <div className="calendar-tabs" style={{marginBottom: 0}}>
          <button 
            className={`cal-tab ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
          >
            <CalendarIcon size={16} /> Grid View
          </button>
          <button 
            className={`cal-tab ${view === 'routines' ? 'active' : ''}`}
            onClick={() => setView('routines')}
          >
            <Clock size={16} /> Routines
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="calendar-grid-container">
          <div className="calendar-grid-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="calendar-grid">
            {renderGrid()}
          </div>
          
          <div className="working-hours-card" style={{marginTop: '1rem'}}>
             <div className="wh-header">
                <Bot size={18} color="var(--success)" />
                <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                  OpenClaw Smart-Sync: Active | {data.workingHours.sleepModeEnabled ? `Sleeping at ${data.workingHours.end}` : 'Running 24/7'}
                </span>
             </div>
          </div>
        </div>
      ) : (
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

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal" onClick={e => e.stopPropagation()}>
            <div className="event-modal-header">
               <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  {selectedEvent.category === 'agent' ? <Bot size={20} color="var(--success)" /> : <User size={20} color="var(--accent-color)" />}
                  <h3 style={{margin: 0}}>{selectedEvent.title}</h3>
               </div>
               <button onClick={() => setSelectedEvent(null)} className="modal-close-btn"><X size={20}/></button>
            </div>
            <div className="event-modal-body">
               <div className="form-group">
                  <label>Description</label>
                  <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)'}}>{selectedEvent.description}</p>
               </div>
               <div style={{display: 'flex', gap: '1rem'}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Start</label>
                    <div style={{fontSize: '0.85rem'}}>{new Date(selectedEvent.start).toLocaleString()}</div>
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>End</label>
                    <div style={{fontSize: '0.85rem'}}>{new Date(selectedEvent.end).toLocaleString()}</div>
                  </div>
               </div>
               <div className="form-group">
                  <label>Category</label>
                  <div className={`cal-event ${selectedEvent.category}`} style={{width: 'fit-content'}}>
                    {selectedEvent.category.toUpperCase()}
                  </div>
               </div>
               
               {selectedEvent.metadata?.ai_reasoning && (
                 <div className="form-group">
                    <label>AI Reasoning (OpenClaw Notes)</label>
                    <div className="ai-reasoning-box">
                       {selectedEvent.metadata.ai_reasoning}
                    </div>
                 </div>
               )}
               
               <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'flex-end'}}>
                  <button className="cal-nav-btn" onClick={() => setSelectedEvent(null)}>Close</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

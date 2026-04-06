import React, { useState, useEffect } from 'react';
import { Box, Plug, Key, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface ToolField {
  key: string;
  label: string;
  type: string;
}

interface ToolConfig {
  name: string;
  description: string;
  type: 'local' | 'external';
  installed: boolean;
  fields: ToolField[];
  config: Record<string, string>;
}

interface ToolsManagerProps {
  serverUrl: string;
}

export const ToolsManager: React.FC<ToolsManagerProps> = ({ serverUrl }) => {
  const [tools, setTools] = useState<Record<string, ToolConfig>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const fetchTools = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/tools`);
      const data = await res.json();
      setTools(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch tools', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [serverUrl]);

  const updateTools = async (newTools: Record<string, ToolConfig>) => {
    setTools(newTools);
    try {
      await fetch(`${serverUrl}/api/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTools)
      });
    } catch (error) {
      console.error('Failed to update tools', error);
    }
  };

  const handleToggle = (toolKey: string) => {
    const updated = { ...tools };
    updated[toolKey].installed = !updated[toolKey].installed;
    updateTools(updated);
    if (updated[toolKey].installed) {
        setExpandedTool(toolKey);
    }
  };

  const handleConfigChange = (toolKey: string, fieldKey: string, value: string) => {
    const updated = { ...tools };
    updated[toolKey].config[fieldKey] = value;
    setTools(updated);
  };

  const handleConfigBlur = () => {
    updateTools(tools);
  };

  if (loading) {
    return <div className="tools-loading">Loading configuration...</div>;
  }

  return (
    <div className="tools-container">
      <div className="tools-header">
        <h2>Agent Tools & Plugins</h2>
        <p>Manage integrations, API keys, and local extensions for OpenClaw. Configuration is saved securely on your local server.</p>
      </div>

      <div className="tools-grid">
        {Object.entries(tools).map(([key, tool]) => (
          <div key={key} className={`tool-card ${tool.installed ? 'installed' : ''}`}>
             <div className="tool-card-header">
                <div className="tool-icon-wrapper">
                  {tool.type === 'external' ? <Plug size={20} /> : <Box size={20} />}
                </div>
                <div className="tool-title-area">
                  <h3>{tool.name}</h3>
                  <span className={`tool-badge ${tool.type}`}>{tool.type === 'external' ? 'External API' : 'Local Module'}</span>
                </div>
                <div className="tool-toggle">
                  <label className="switch">
                    <input type="checkbox" checked={tool.installed} onChange={() => handleToggle(key)} />
                    <span className="slider round"></span>
                  </label>
                </div>
             </div>

             <div className="tool-card-body">
                <p className="tool-description">{tool.description}</p>
             </div>

             {tool.installed && tool.fields && tool.fields.length > 0 && (
                 <div className="tool-config-section">
                     <div 
                        className="tool-config-toggle" 
                        onClick={() => setExpandedTool(expandedTool === key ? null : key)}
                     >
                        <Key size={14}/> Configuration
                        <div style={{marginLeft: 'auto'}}>
                          {expandedTool === key ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </div>
                     </div>

                     {expandedTool === key && (
                         <div className="tool-config-fields">
                             {tool.fields.map(field => (
                                 <div className="config-field" key={field.key}>
                                     <label>{field.label}</label>
                                     <input 
                                        type={field.type} 
                                        value={tool.config[field.key] || ''} 
                                        onChange={(e) => handleConfigChange(key, field.key, e.target.value)}
                                        onBlur={handleConfigBlur}
                                        placeholder={`Enter ${field.label}...`}
                                        autoComplete="new-password"
                                        spellCheck="false"
                                     />
                                 </div>
                             ))}
                             <div className="config-status-save">
                                <CheckCircle2 size={12} color="var(--success)"/>
                                <span>Auto-saved securely</span>
                             </div>
                         </div>
                     )}
                 </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};

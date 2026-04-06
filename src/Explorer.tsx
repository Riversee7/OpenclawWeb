import React, { useState, useEffect, useRef } from 'react';
import { Folder, File, FileImage, FileText, Download, Trash, Edit, Upload, ChevronRight, HardDrive } from 'lucide-react';

interface ExplorerProps {
  serverUrl: string;
}

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  size: number;
  modified: string;
}

export const Explorer: React.FC<ExplorerProps> = ({ serverUrl }) => {
  const [currentDir, setCurrentDir] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem | null } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchList = async (dir?: string) => {
    setLoading(true);
    try {
      const url = dir ? `${serverUrl}/api/fs/list?dir=${encodeURIComponent(dir)}` : `${serverUrl}/api/fs/list`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error) {
        setItems(data.items);
        setCurrentDir(data.currentDir);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    
    // Close context menu on external click
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [serverUrl]);

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      fetchList(item.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getIcon = (item: FileItem) => {
    if (item.isDirectory) return <Folder color="#ffd166" size={32} />;
    const ext = item.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'].includes(ext || '')) return <FileImage color="#06d6a0" size={32} />;
    if (['txt', 'md', 'pdf', 'doc', 'csv'].includes(ext || '')) return <FileText color="#118ab2" size={32} />;
    return <File color="#8a8d91" size={32} />;
  };

  const goUp = () => {
    // Basic un-escaping of path for navigating up. Works for both linux & windows strings
    const separator = currentDir.includes('\\') ? '\\' : '/';
    const parts = currentDir.split(separator).filter(Boolean);
    if (parts.length > 0) {
      // If Windows C:\ it might behave differently. A quick hack:
      if (currentDir.endsWith(':\\') || currentDir === '/') return;
      
      const newPath = currentDir.substring(0, currentDir.lastIndexOf(separator));
      fetchList(newPath || '/');
    }
  };

  // Actions
  const handleDownload = () => {
    if (!contextMenu?.item || contextMenu.item.isDirectory) return;
    window.open(`${serverUrl}/api/fs/download?path=${encodeURIComponent(contextMenu.item.path)}`, '_blank');
  };

  const handleDelete = async () => {
    if (!contextMenu?.item) return;
    if (!confirm(`Wirklich löschen: ${contextMenu.item.name}?`)) return;
    
    await fetch(`${serverUrl}/api/fs/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPath: contextMenu.item.path })
    });
    fetchList(currentDir);
  };

  const handleRename = async () => {
    if (!contextMenu?.item) return;
    const newName = prompt('Neuer Name:', contextMenu.item.name);
    if (!newName || newName === contextMenu.item.name) return;

    await fetch(`${serverUrl}/api/fs/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath: contextMenu.item.path, newName })
    });
    fetchList(currentDir);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentDir);

    setLoading(true);
    await fetch(`${serverUrl}/api/fs/upload`, {
      method: 'POST',
      body: formData
    });
    fetchList(currentDir);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="explorer-container">
      <div className="explorer-toolbar">
        <div className="breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HardDrive size={18} color="var(--accent-color)" />
          <span style={{ cursor: 'pointer', color: 'var(--accent-hover)' }} onClick={goUp}>[ Hoch ]</span>
          <ChevronRight size={14} />
          <span style={{ fontFamily: 'Fira Code' }}>{currentDir}</span>
        </div>
        
        <button className="upload-btn" onClick={handleUploadClick}>
          <Upload size={16} /> Upload
        </button>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
      </div>

      <div className={`explorer-grid ${loading ? 'loading' : ''}`}>
        {items.map((item, i) => (
          <div 
            key={i} 
            className="explorer-item"
            onClick={() => handleItemClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            <div className="item-icon">{getIcon(item)}</div>
            <div className="item-name" title={item.name}>{item.name}</div>
            {!item.isDirectory && <div className="item-size">{formatSize(item.size)}</div>}
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div style={{ padding: '2rem', color: '#666', gridColumn: 'span 12' }}>Leerer Ordner</div>
        )}
      </div>

      {/* Custom Context Menu */}
      {contextMenu && contextMenu.item && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="menu-header">{contextMenu.item.name}</div>
          {!contextMenu.item.isDirectory && (
            <div className="menu-item" onClick={handleDownload}><Download size={14}/> Download</div>
          )}
          <div className="menu-item" onClick={handleRename}><Edit size={14}/> Umbenennen</div>
          <div className="menu-item danger" onClick={handleDelete}><Trash size={14}/> Löschen</div>
        </div>
      )}
    </div>
  );
};

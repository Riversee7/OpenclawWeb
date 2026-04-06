import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Folder, File, FileImage, FileText, Download, Trash, Edit, Upload, ChevronRight, HardDrive, X, Play, Music, Video } from 'lucide-react';

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
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem | null } | null>(null);
  const [filePreview, setFilePreview] = useState<FileItem | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  
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
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [serverUrl]);

  const getExt = (name: string) => name.split('.').pop()?.toLowerCase() || '';

  const handleItemClick = async (item: FileItem) => {
    if (item.isDirectory) {
      fetchList(item.path);
    } else {
      const ext = getExt(item.name);
      const mediaExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'pdf'];
      const textExts = ['txt', 'md', 'json', 'yaml', 'yml', 'env', 'ts', 'tsx', 'js', 'css', 'html', 'json5', 'lock'];
      
      if (mediaExts.includes(ext)) {
        setTextContent('');
        setFilePreview(item);
      } else if (textExts.includes(ext)) {
        setTextContent('Loading...');
        setFilePreview(item);
        try {
          const res = await fetch(`${serverUrl}/api/fs/view?path=${encodeURIComponent(item.path)}`);
          const text = await res.text();
          setTextContent(text);
        } catch (e) {
          setTextContent('Fehler beim Laden der Textdatei.');
        }
      } else {
        // Unknown type, just download
        window.open(`${serverUrl}/api/fs/download?path=${encodeURIComponent(item.path)}`, '_blank');
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, item });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getIcon = (item: FileItem) => {
    if (item.isDirectory) return <Folder color="#ffd166" size={32} />;
    const ext = getExt(item.name);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FileImage color="#06d6a0" size={32} />;
    if (['mp4', 'mov', 'webm'].includes(ext)) return <Video color="#ef476f" size={32} />;
    if (['mp3', 'wav'].includes(ext)) return <Music color="#9d4edd" size={32} />;
    if (['txt', 'md', 'pdf', 'doc', 'json'].includes(ext)) return <FileText color="#118ab2" size={32} />;
    return <File color="#8a8d91" size={32} />;
  };

  // Breadcrumbs UI logic
  const separator = currentDir.includes('\\') ? '\\' : '/';
  const rawParts = currentDir.split(separator).filter(Boolean);
  
  // On Windows, the drive letter might be part 0. On unix, it's just parts.
  const isWindows = currentDir.includes(':\\');
  
  const generateBreadcrumbs = () => {
    const crumbs = [];
    let accumPath = isWindows ? '' : '/';
    
    for (let i = 0; i < rawParts.length; i++) {
      const part = rawParts[i];
      accumPath += (i > 0 || !isWindows ? (i===0 && !isWindows ? '' : separator) : '') + part;
      if (isWindows && i === 0 && !accumPath.includes('\\')) accumPath += '\\'; // C:\ fix
      
      const targetPath = accumPath;
      crumbs.push(
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={14} color="#555" />}
          <span className="breadcrumb-btn" onClick={() => fetchList(targetPath)}>{part}</span>
        </React.Fragment>
      );
    }
    return crumbs;
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentDir);
    setLoading(true);
    await fetch(`${serverUrl}/api/fs/upload`, { method: 'POST', body: formData });
    fetchList(currentDir);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Render Modals
  const renderContextMenu = () => {
    if (!contextMenu || !contextMenu.item) return null;
    return createPortal(
      <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
        <div className="menu-header">{contextMenu.item.name}</div>
        {!contextMenu.item.isDirectory && (
          <div className="menu-item" onClick={handleDownload}><Download size={14}/> Download</div>
        )}
        <div className="menu-item" onClick={handleRename}><Edit size={14}/> Umbenennen</div>
        <div className="menu-item danger" onClick={handleDelete}><Trash size={14}/> Löschen</div>
      </div>,
      document.body
    );
  };

  const renderPreviewContent = () => {
    if (!filePreview) return null;
    const ext = getExt(filePreview.name);
    const viewUrl = `${serverUrl}/api/fs/view?path=${encodeURIComponent(filePreview.path)}`;
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <img src={viewUrl} className="preview-media" alt={filePreview.name} />;
    } else if (['mp4', 'mov', 'webm'].includes(ext)) {
      return <video src={viewUrl} controls autoPlay className="preview-media" />;
    } else if (['mp3', 'wav'].includes(ext)) {
      return (
        <div className="preview-audio-container">
          <Music size={48} color="#9d4edd" style={{ marginBottom: 20 }} />
          <audio src={viewUrl} controls autoPlay />
        </div>
      );
    } else if (['pdf'].includes(ext)) {
      return <iframe src={viewUrl} className="preview-iframe" title="PDF Preview" />;
    } else {
      // Text
      return <pre className="preview-text">{textContent}</pre>;
    }
  };

  return (
    <div className="explorer-container">
      <div className="explorer-toolbar">
        <div className="breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HardDrive size={18} color="var(--accent-color)" style={{ marginRight: 4 }} />
          {generateBreadcrumbs()}
        </div>
        
        <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /> Upload
        </button>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
      </div>

      <div className={`explorer-grid ${loading ? 'loading' : ''}`}>
        {items.map((item, i) => (
          <div key={i} className="explorer-item" onClick={() => handleItemClick(item)} onContextMenu={(e) => handleContextMenu(e, item)}>
            <div className="item-icon">{getIcon(item)}</div>
            <div className="item-name" title={item.name}>{item.name}</div>
            {!item.isDirectory && <div className="item-size">{formatSize(item.size)}</div>}
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div style={{ padding: '2rem', color: '#666', gridColumn: 'span 12' }}>Ordner ist leer</div>
        )}
      </div>

      {renderContextMenu()}

      {filePreview && (
        <div className="modal-overlay" onClick={() => setFilePreview(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{filePreview.name}</span>
              <div style={{display:'flex', gap:'8px'}}>
                 <button className="modal-action-btn" onClick={() => window.open(`${serverUrl}/api/fs/download?path=${encodeURIComponent(filePreview.path)}`, '_blank')}><Download size={16}/> Download</button>
                 <button className="modal-close-btn" onClick={() => setFilePreview(null)}><X size={20}/></button>
              </div>
            </div>
            <div className="modal-body">
              {renderPreviewContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Music, Upload, Trash2, Plus, Download, Menu, PanelLeftOpen, Film, Play, Pause } from 'lucide-react';
import { Asset } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';

interface AssetsAreaProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

function AssetMediaItem({ asset, onDelete, onDownload }: any) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play().catch(err => console.error("Play failed", err));
      }
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (mediaRef.current && (asset.type === 'video' || asset.type === 'audio')) {
      mediaRef.current.play().catch(err => console.log("Autoplay blocked or failed", err));
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (mediaRef.current && (asset.type === 'video' || asset.type === 'audio')) {
      mediaRef.current.pause();
      mediaRef.current.currentTime = 0;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', asset.url);
    e.dataTransfer.setData('application/x-custom-type', asset.type);
    e.dataTransfer.setData('application/x-source', 'assets-area');
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col aspect-square cursor-grab active:cursor-grabbing"
    >
      {asset.type === 'image' ? (
        <div className="flex-1 w-full bg-neutral-100 flex items-center justify-center overflow-hidden">
          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" draggable={false} />
        </div>
      ) : asset.type === 'video' ? (
        <div className="flex-1 w-full bg-black flex items-center justify-center overflow-hidden relative">
          <video 
            ref={mediaRef as any}
            src={asset.url} 
            className="w-full h-full object-cover" 
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            draggable={false}
            muted={isHovered} // Mute on hover auto-play to avoid being annoying, or keep unmuted? Usually video previews are muted.
            loop
          />
          <div className={cn("absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-300", !isPlaying ? "bg-black/40" : "bg-transparent")}>
             <button
                onClick={(e) => togglePlay(e)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-none shadow-xl backdrop-blur-md cursor-pointer pointer-events-auto transition-all",
                  isPlaying 
                    ? "bg-white/10 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:text-white" 
                    : "bg-white/20 text-white hover:bg-white/30 hover:scale-110"
                )}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full bg-neutral-100 flex items-center justify-center flex-col gap-2 relative">
          <audio 
            ref={mediaRef as any}
            src={asset.url} 
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            loop
          />
          <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center shadow-inner">
            <Music className={cn("w-8 h-8 transition-colors", isPlaying ? "text-purple-600 animate-pulse" : "text-neutral-400")} />
          </div>
          <div className={cn("absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-300", !isPlaying ? "bg-black/5" : "bg-transparent")}>
             <button
                onClick={(e) => togglePlay(e)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-none shadow-xl backdrop-blur-md cursor-pointer pointer-events-auto transition-all",
                  isPlaying
                    ? "bg-black/20 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/40"
                    : "bg-black/40 text-white hover:bg-black/60 hover:scale-110"
                )}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
          </div>
        </div>
      )}
      
      <div className="p-2.5 bg-white border-t border-neutral-100 flex items-center gap-2">
        {asset.type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : asset.type === 'video' ? <Film className="w-3.5 h-3.5 text-purple-500 shrink-0" /> : <Music className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
        <span className="text-xs text-neutral-700 truncate flex-1">{asset.name}</span>
      </div>
      
      {/* Overlay actions */}
      <div className="absolute inset-x-0 top-0 p-2 flex justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/50 to-transparent">
        <button 
          onClick={(e) => onDownload(asset, e)}
          className="w-6 h-6 bg-white/20 hover:bg-white/40 text-white rounded flex items-center justify-center border-none cursor-pointer backdrop-blur-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={(e) => onDelete(asset.id, e)}
          className="w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded flex items-center justify-center border-none cursor-pointer backdrop-blur-sm transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AssetsArea({ assets, setAssets, sidebarOpen, setSidebarOpen }: AssetsAreaProps) {
  const [filter, setFilter] = useState<'all' | 'image' | 'audio'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAssets: Asset[] = [];
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('audio/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            newAssets.push({
              id: `asset-${uuidv4()}`,
              type: file.type.startsWith('image/') ? 'image' : 'audio',
              url: ev.target.result as string,
              name: file.name,
              createdAt: Date.now()
            });
            
            if (newAssets.length === Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('audio/')).length) {
                setAssets(prev => [...newAssets, ...prev]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssets(prev => prev.filter(a => a.id !== id));
  };
  
  const handleDownload = (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = asset.url;
    a.download = asset.name;
    a.click();
  };

  const filteredAssets = assets.filter(a => filter === 'all' || a.type === filter);

  return (
    <div className="flex-1 w-full h-full bg-white flex flex-col font-sans">
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1 -ml-1 border-none bg-transparent text-neutral-900 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="hidden md:block p-1.5 -ml-2 rounded-md hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
              title="展开边栏"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">资产</h2>
            <p className="text-xs text-neutral-500 mt-1">管理您上传的图片、音频或系统生成的资源</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-neutral-100 p-1 rounded-md">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors border-none cursor-pointer ${filter === 'all' ? 'bg-white shadow-sm text-neutral-900' : 'bg-transparent text-neutral-500 hover:text-neutral-700'}`}
            >
              全部
            </button>
            <button 
              onClick={() => setFilter('image')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors border-none cursor-pointer ${filter === 'image' ? 'bg-white shadow-sm text-neutral-900' : 'bg-transparent text-neutral-500 hover:text-neutral-700'}`}
            >
              图片
            </button>
            <button 
              onClick={() => setFilter('audio')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors border-none cursor-pointer ${filter === 'audio' ? 'bg-white shadow-sm text-neutral-900' : 'bg-transparent text-neutral-500 hover:text-neutral-700'}`}
            >
              音频
            </button>
          </div>
          <button 
            onClick={handleUploadClick}
            className="flex items-center gap-1.5 bg-neutral-900 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-neutral-800 transition-colors border-none cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            上传资产
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,audio/*" 
            multiple 
            onChange={handleFileChange} 
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {filteredAssets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-3">
               <Plus className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm">资产目前是空的</p>
            <p className="text-xs mt-1 opacity-70">点击右上角上传本地文件，或在其他功能中保存到资产</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAssets.map(asset => (
              <AssetMediaItem 
                key={asset.id} 
                asset={asset} 
                onDelete={handleDelete} 
                onDownload={handleDownload} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

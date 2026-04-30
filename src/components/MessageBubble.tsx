import { Brain, Copy, RefreshCw, User, BookmarkPlus, Download, X, Pencil, Play, Pause, Film, Music } from 'lucide-react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { useState, useEffect, useRef } from 'react';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  isLast?: boolean;
  isGenerating?: boolean;
  onSaveAsset?: (url: string, type: 'image' | 'audio') => void;
  onEdit?: () => void;
}

function MediaMessageItem({ src, type, onSaveAsset, onDownload }: { src: string, type: 'video' | 'audio', onSaveAsset?: any, onDownload?: any }) {
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
    if (mediaRef.current) {
      mediaRef.current.play().catch(err => console.log("Autoplay blocked", err));
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (mediaRef.current) {
      mediaRef.current.pause();
    }
  };

  return (
    <div 
      className="group border border-neutral-200 rounded-xl overflow-hidden mb-4 max-w-lg shadow-sm bg-white block text-left"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
        {type === 'video' ? (
          <video 
            ref={mediaRef as any}
            src={src} 
            className="w-full h-full object-cover" 
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            muted={isHovered}
            loop
          />
        ) : (
          <div className="w-full h-full bg-neutral-50 flex items-center justify-center flex-col gap-2">
            <audio 
              ref={mediaRef as any}
              src={src} 
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              loop
            />
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-100">
               <Music className={cn("w-8 h-8", isPlaying ? "text-purple-600 animate-pulse" : "text-neutral-400")} />
            </div>
            <span className="text-[10px] text-neutral-400 font-medium tracking-wider uppercase">Audio Content</span>
          </div>
        )}
        
        <div className={cn("absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-300", !isPlaying ? "bg-black/20" : "bg-transparent")}>
           <button
              onClick={(e) => togglePlay(e)}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center border-none shadow-2xl backdrop-blur-md cursor-pointer pointer-events-auto transition-all",
                isPlaying 
                  ? "bg-white/10 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:text-white" 
                  : "bg-white/30 text-white hover:bg-white/50 hover:scale-110"
              )}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
            </button>
        </div>
      </div>
      
      <div className="bg-neutral-50 px-3 py-2.5 flex items-center justify-between border-t border-neutral-200">
        <div className="flex items-center gap-2">
          {type === 'video' ? <Film className="w-3.5 h-3.5 text-purple-500" /> : <Music className="w-3.5 h-3.5 text-emerald-500" />}
          <span className="text-[11px] font-medium text-neutral-500 truncate max-w-[150px]">
            {type === 'video' ? '生成的视频' : '生成的音频'}
          </span>
        </div>
        <div className="flex gap-2">
          {onSaveAsset && (
            <button 
              onClick={() => onSaveAsset(src, type)}
              className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-neutral-200 bg-white shadow-sm font-medium"
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> 一键存入资产
            </button>
          )}
          <button 
            onClick={() => onDownload(src)}
            className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-neutral-200 bg-white shadow-sm font-medium"
          >
            <Download className="w-3.5 h-3.5" /> 点击下载
          </button>
        </div>
      </div>
    </div>
  );
}

export function MessageBubble({ message, onRegenerate, isLast, isGenerating, onSaveAsset, onEdit }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(() => isLast);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (url: string) => {
    try {
      if (url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `image-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `image-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (e) {
      console.error("Download failed:", e);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${Date.now()}.png`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const isThinkingActive = isLast && isGenerating && !message.content;

  return (
    <>
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <img src={zoomedImage} alt="zoomed" className="max-w-full max-h-full object-contain select-none" />
          <button 
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center border-none cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className={cn("flex gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 group", isUser ? "flex-row-reverse user" : "flex-row assistant")}>
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center text-[13px] shrink-0 mt-0.5",
          isUser ? "bg-neutral-900 text-white border border-neutral-800" : "bg-neutral-100 text-neutral-900"
        )}>
          {isUser ? <User className="w-4 h-4" /> : "✦"}
        </div>
        
        <div className={cn("flex-1 min-w-0 flex flex-col", isUser ? "items-end" : "items-start")}>
          <div className="text-xs font-semibold text-neutral-500 mb-1">
            {isUser ? "你" : "繁星AI"}
          </div>
          
          {message.thinking && (
            <details 
              className="bg-neutral-50 border-l-2 border-blue-500 rounded-r-md px-3.5 py-2.5 mb-2.5 text-[13px] text-neutral-500 leading-relaxed group/thinking w-full text-left"
              open={isOpen}
              onToggle={(e) => setIsOpen(e.currentTarget.open)}
            >
              <summary className="cursor-pointer font-semibold text-neutral-500 text-xs select-none hover:text-neutral-900 flex items-center gap-1.5">
                <Brain className={cn("w-3.5 h-3.5", isThinkingActive ? "animate-pulse text-blue-500" : "")} /> 
                {isThinkingActive ? "正在深度思考..." : "思考过程"}
              </summary>
              <div className="mt-2 whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto scrollbar-thin">
                {message.thinking}
              </div>
            </details>
          )}
          
          {(message.content || isThinkingActive || (message.images && message.images.length > 0)) && (
            <div className={cn(
              "text-sm leading-relaxed text-neutral-900 break-words",
              isUser ? "bg-neutral-100 px-4 py-3 rounded-xl rounded-tr-sm inline-block max-w-[85%] text-left" : "py-1 w-full"
            )}>
              {message.images && message.images.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {message.images.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt="attached" 
                      title="双击放大" 
                      onDoubleClick={() => setZoomedImage(img)} 
                      draggable 
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', img);
                        e.dataTransfer.setData('application/x-custom-type', 'image');
                        e.dataTransfer.setData('application/x-source', 'assets-area');
                      }}
                      className="max-w-[200px] max-h-[200px] object-cover rounded-md cursor-zoom-in border border-neutral-200" 
                    />
                  ))}
                </div>
              )}
              {isUser ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                message.content ? (
                  <div className="prose prose-sm prose-neutral max-w-none prose-pre:bg-neutral-50 prose-pre:border prose-pre:border-neutral-100 prose-pre:text-neutral-900 prose-img:rounded-xl">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      urlTransform={(value: string) => {
                        if (value.startsWith('data:image/')) return value;
                        return defaultUrlTransform(value);
                      }}
                      components={{
                        p: ({node, children, ...props}) => {
                          const hasElementNode = node && (node as any).children?.some((child: any) => child.type === 'element');
                          if (hasElementNode) {
                             return <div className="mb-4 last:mb-0" {...props}>{children}</div>;
                          }
                          return <p className="mb-4 last:mb-0" {...props}>{children}</p>;
                        },
                        img: ({node, ...props}) => {
                          const src = props.src || '';
                          const isVideo = src.includes('video') || src.endsWith('.mp4') || src.endsWith('.webm');
                          const isAudio = src.includes('audio') || src.endsWith('.mp3') || src.endsWith('.wav');
                          
                          if (isVideo || isAudio) {
                            return <MediaMessageItem src={src} type={isVideo ? 'video' : 'audio'} onSaveAsset={onSaveAsset} onDownload={handleDownload} />;
                          }

                          return (
                            <div className="group border border-neutral-200 rounded-xl overflow-hidden mb-4 max-w-lg shadow-sm bg-white block text-left">
                              <img 
                                {...props} 
                                onDoubleClick={() => props.src && setZoomedImage(props.src)} 
                                title="双击放大" 
                                draggable 
                                onDragStart={(e) => {
                                  if (props.src) {
                                    e.dataTransfer.setData('text/plain', props.src);
                                    e.dataTransfer.setData('application/x-custom-type', 'image');
                                    e.dataTransfer.setData('application/x-source', 'assets-area');
                                  }
                                }}
                                className="w-full m-0 block object-cover cursor-zoom-in" 
                              />
                              <div className="bg-neutral-50 px-3 py-2.5 flex justify-end gap-2 border-t border-neutral-200">
                                {onSaveAsset && props.src && (
                                  <button 
                                    onClick={() => {
                                      onSaveAsset(props.src!, 'image');
                                    }}
                                    className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-neutral-200 bg-white shadow-sm font-medium"
                                  >
                                    <BookmarkPlus className="w-3.5 h-3.5" /> 一键存入资产
                                  </button>
                                )}
                                <button 
                                  onClick={() => props.src && handleDownload(props.src)}
                                  className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-neutral-200 bg-white shadow-sm font-medium"
                                >
                                  <Download className="w-3.5 h-3.5" /> 点击下载
                                </button>
                              </div>
                            </div>
                          );
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex gap-1 py-2">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
                  </div>
                )
              )}
            </div>
          )}
          
          {(message.content || (message.images && message.images.length > 0)) && (
            <div className={cn("flex gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity", isUser ? "justify-end" : "justify-start")}>
              {isUser && onEdit && (
                <button
                  onClick={onEdit}
                  className="px-2 py-1 border-none bg-transparent rounded cursor-pointer text-[11px] text-neutral-400 transition-all flex items-center gap-1 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <Pencil className="w-3 h-3" /> 重新编辑
                </button>
              )}
              <button
                onClick={handleCopy}
                className="px-2 py-1 border-none bg-transparent rounded cursor-pointer text-[11px] text-neutral-400 transition-all flex items-center gap-1 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <Copy className="w-3 h-3" /> {copied ? "已复制" : "复制"}
              </button>
              {!isUser && isLast && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="px-2 py-1 border-none bg-transparent rounded cursor-pointer text-[11px] text-neutral-400 transition-all flex items-center gap-1 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <RefreshCw className="w-3 h-3" /> 重新生成
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

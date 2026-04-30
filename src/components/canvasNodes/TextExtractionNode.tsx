import { Position } from '@xyflow/react';
import React, { useState } from 'react';
import { Play, FileText, Music } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseVideoAndExtractText } from '../../lib/api';
import { MagneticHandle } from './MagneticHandle';

export const TextExtractionNode = React.memo(function TextExtractionNode({ data, id, selected }: any) {
  const [url, setUrl] = useState('');

  const handleExtract = () => {
    if (!url.trim() || data.isExtracting) return;
    if (data.onExtractText) {
      data.onExtractText(id, url);
    }
  };

  const handleNodeNativeDragStart = (e: React.DragEvent) => {
    if (data.audioUrl) {
      e.dataTransfer.setData('text/plain', data.audioUrl);
      e.dataTransfer.setData('application/x-custom-type', 'audio');
      e.dataTransfer.setData('application/x-source', 'canvas-node');
      e.dataTransfer.effectAllowed = 'copy';
    }
  };

  return (
    <div 
      draggable={!!data.audioUrl && selected}
      onDragStart={selected ? handleNodeNativeDragStart : undefined}
      className={cn(
      "bg-white rounded-xl shadow-lg border overflow-visible relative group transition-all duration-300 w-[380px]",
      selected ? "border-purple-500 ring-4 ring-purple-500/10" : "border-neutral-200"
    )}>
      {/* Input Handle (Left) */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center z-[100]">
        <MagneticHandle type="target" position={Position.Left} id="left" />
      </div>

      <div className="bg-neutral-900 px-4 py-3 flex items-center justify-between drag-handle cursor-grab active:cursor-grabbing rounded-t-xl">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-white" />
          <span className="text-white font-medium text-sm">文本提取插件</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700">视频链接</label>
          <input
            type="text"
            placeholder="输入抖音、快手等视频分享链接..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <button
          onClick={handleExtract}
          disabled={!url.trim() || data.isExtracting}
          className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed border-none py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
        >
          {data.isExtracting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              正在处理...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> 开始提取
            </>
          )}
        </button>

        {data.audioUrl && (
          <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100 flex flex-col gap-2 relative">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600">
              <Music className="w-3.5 h-3.5 text-blue-500" /> 提取的音频地址
            </div>
            <a href={data.audioUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 break-all hover:underline line-clamp-3">
              {data.audioUrl}
            </a>
          </div>
        )}

        {(data.content || data.error) && (
          <div className={cn("rounded-lg p-3 border text-sm max-h-[250px] overflow-y-auto whitespace-pre-wrap leading-relaxed", data.error ? "bg-red-50 border-red-100 text-red-600" : "bg-neutral-50 border-neutral-100 text-neutral-700")}>
            {data.error || data.content}
          </div>
        )}
      </div>

      {/* Output Handle (Right) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-[100]">
        <MagneticHandle type="source" position={Position.Right} id="right" />
      </div>
    </div>
  );
});

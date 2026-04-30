import React from 'react';
import { Position, NodeProps } from '@xyflow/react';
import { MagneticHandle } from './MagneticHandle';
import { cn } from '../../lib/utils';

export const TextNode = React.memo(function TextNode({ data, id, selected }: NodeProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl shadow-md border flex flex-col font-sans relative group transition-all duration-300 w-[480px] cursor-grab active:cursor-grabbing",
      selected ? "border-purple-500 ring-4 ring-purple-500/10" : "border-neutral-200"
    )}>
      {/* Input Handle (Left) */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center z-[100]">
        <MagneticHandle type="target" position={Position.Left} id="left" />
      </div>

      <div className="p-2 border-b border-neutral-100 bg-neutral-50 rounded-t-xl text-xs font-medium text-neutral-600 text-center">
        {(data.title as string) || '文本段落'}
      </div>
      <div className="p-3">
        <textarea
          className="w-full min-h-[120px] max-h-[400px] border border-neutral-200 rounded-md p-2 text-xs focus:border-purple-500 outline-none text-neutral-800 nodrag"
          value={data.content as string}
          onChange={(e) => data.onChange && (data.onChange as any)(id, { content: e.target.value })}
        />
      </div>

      {/* Output Handle (Right) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-[100]">
        <MagneticHandle type="source" position={Position.Right} id="right" />
      </div>
    </div>
  );
});

import React, { useState, useRef, useEffect, useContext } from "react";
import { CanvasContext } from "../../lib/CanvasContext";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { MagneticHandle } from "./MagneticHandle";
import {
  Plus,
  X,
  Image as ImageIcon,
  Music,
  BookmarkPlus,
  Upload,
  Film,
  Play,
  Pause,
} from "lucide-react";
import { Asset } from "../../types";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";

function MediaItem({
  asset,
  isOnlyMedia,
  handleImageDoubleClick,
  handleSaveToLibrary,
  handleRemoveAsset,
  selected,
  isSpacePressed,
}: any) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current
          .play()
          .catch((err) => console.error("Play failed", err));
      }
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", asset.url);
    e.dataTransfer.setData("application/x-custom-type", asset.type);
    e.dataTransfer.setData("application/x-source", "asset-node");
    e.dataTransfer.effectAllowed = "copy";

    if (isOnlyMedia) {
      const target = e.currentTarget as HTMLElement;
      const mediaEl = target.querySelector("img, video") as HTMLElement;
      if (mediaEl) {
        const rect = mediaEl.getBoundingClientRect();
        const dragGhost = mediaEl.cloneNode(true) as HTMLElement;
        dragGhost.style.position = "absolute";
        dragGhost.style.top = "-9999px";
        dragGhost.style.left = "-9999px";
        dragGhost.style.width = `${rect.width}px`;
        dragGhost.style.height = `${rect.height}px`;
        dragGhost.style.objectFit = "contain";
        document.body.appendChild(dragGhost);

        // Calculate the exact offset so the drag preview aligns perfectly with the cursor where they grabbed it
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        e.dataTransfer.setDragImage(dragGhost, offsetX, offsetY);
        setTimeout(() => {
          if (dragGhost.parentNode) {
            dragGhost.parentNode.removeChild(dragGhost);
          }
        }, 0);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      draggable={isSpacePressed}
      onDragStart={isSpacePressed ? (handleDragStart as any) : undefined}
      className={cn(
        "relative group/asset rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:border-white/30 cursor-grab active:cursor-grabbing shrink-0",
        isSpacePressed && "nodrag",
        isOnlyMedia ? "w-full aspect-video max-h-full mx-auto" : "aspect-video",
        !selected && !isSpacePressed && "pointer-events-none",
      )}
    >
      {asset.type === "image" ? (
        <img
          src={asset.url}
          alt={asset.name}
          className={cn(
            "w-full h-full",
            isOnlyMedia ? "object-contain" : "object-cover",
          )}
          onDoubleClick={() => handleImageDoubleClick(asset.url)}
          draggable={false}
        />
      ) : asset.type === "video" ? (
        <>
          <video
            ref={mediaRef as any}
            src={asset.url}
            className={cn(
              "w-full h-full",
              isOnlyMedia ? "object-contain" : "object-cover",
            )}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            draggable={false}
          />
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-300",
              !isPlaying ? "bg-black/40" : "",
            )}
          >
            <button
              onClick={togglePlay}
              className={cn(
                "w-[60px] h-[60px] rounded-full flex items-center justify-center border-none shadow-xl backdrop-blur-md cursor-pointer pointer-events-auto transition-all",
                isPlaying
                  ? "bg-white/10 text-white/50 opacity-0 group-hover/asset:opacity-100 hover:bg-white/20 hover:text-white"
                  : "bg-white/20 text-white hover:bg-white/30 hover:scale-110",
              )}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 relative w-full h-full justify-center">
          <audio
            ref={mediaRef as any}
            src={asset.url}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          <Music className="w-10 h-10 text-blue-400" />
          <span className="text-[15px] text-neutral-400 px-3 truncate w-full text-center">
            {asset.name}
          </span>
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <button
              onClick={togglePlay}
              className={cn(
                "w-[60px] h-[60px] rounded-full flex items-center justify-center border-none shadow-lg backdrop-blur-md cursor-pointer pointer-events-auto transition-all bg-black/40 text-white hover:bg-black/60",
              )}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-0 group-hover/asset:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute top-3 right-3 opacity-0 group-hover/asset:opacity-100 transition-opacity flex gap-3 z-20">
        {asset.id.startsWith("temp-") && (
          <button
            onClick={(e) =>
              handleSaveToLibrary(e, asset.url, asset.type as any)
            }
            className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center border-none cursor-pointer shadow-lg transition-transform hover:scale-110"
            title="存入资产"
          >
            <BookmarkPlus className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => handleRemoveAsset(asset.id)}
          className="w-10 h-10 bg-black/60 hover:bg-red-500 text-white rounded-xl flex items-center justify-center border-none cursor-pointer shadow-lg transition-transform hover:scale-110"
          title="移除"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

export const AssetNode = React.memo(function AssetNode({ data, id, selected }: NodeProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const { assets: globalAssets } = useContext(CanvasContext);
  const localAssets = (data.localAssets || []) as Asset[];
  const allAssets = [...globalAssets, ...localAssets];
  const selectedAssetIds = (data.selectedAssetIds || []) as string[];

  const selectedAssets = selectedAssetIds
    .map((assetId) => allAssets.find((a) => a.id === assetId))
    .filter(Boolean) as Asset[];

  const handleAddAsset = (assetId: string) => {
    const newSelected = [...selectedAssetIds, assetId];
    if (data.onChange) {
      (data.onChange as any)(id, { selectedAssetIds: newSelected });
    }
    setIsDropdownOpen(false);
  };

  const handleRemoveAsset = (assetId: string) => {
    const newSelected = selectedAssetIds.filter((id) => id !== assetId);
    if (data.onChange) {
      (data.onChange as any)(id, { selectedAssetIds: newSelected });
    }
  };

  const handleSaveToLibrary = (
    e: React.MouseEvent,
    url: string,
    type: "image" | "audio" | "video",
  ) => {
    e.stopPropagation();
    if (data.onSaveAsset) {
      (data.onSaveAsset as any)(url, type);
    }
  };

  const handleImageDoubleClick = (url: string) => {
    setFullscreenImage(url);
    setIsFullscreen(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(
      (f) =>
        f.type.startsWith("image/") ||
        f.type.startsWith("audio/") ||
        f.type.startsWith("video/"),
    );
    if (validFiles.length === 0) return;

    const filePromises = validFiles.map((file) => {
      return new Promise<{ url: string; type: string; file: File }>(
        (resolve) => {
          const reader = new FileReader();
          reader.onload = (e) =>
            resolve({
              url: e.target?.result as string,
              type: file.type.startsWith("image/")
                ? "image"
                : file.type.startsWith("audio/")
                  ? "audio"
                  : file.type.startsWith("video/")
                    ? "video"
                    : "unknown",
              file,
            });
          reader.readAsDataURL(file);
        },
      );
    });

    Promise.all(filePromises).then((results) => {
      const newAssets: Asset[] = [];
      const newIds: string[] = [];

      results.forEach((r) => {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        newAssets.push({
          id: tempId,
          url: r.url,
          type: r.type as any,
          name: r.file.name,
          createdAt: Date.now(),
        });
        newIds.push(tempId);
      });

      if (data.onChange) {
        (data.onChange as any)(id, {
          localAssets: [...localAssets, ...newAssets],
          selectedAssetIds: [...selectedAssetIds, ...newIds],
        });
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 1. Local Files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
      return;
    }

    // 2. Data Transfer items
    const text = e.dataTransfer.getData("text/plain");
    const customType = e.dataTransfer.getData("application/x-custom-type");
    const source = e.dataTransfer.getData("application/x-source");

    if (
      text &&
      (text.startsWith("http") ||
        text.startsWith("data:") ||
        text.startsWith("blob:"))
    ) {
      // Check if this URL already exists in global assets
      const existingGlobalAsset = globalAssets.find((a) => a.url === text);
      
      if (existingGlobalAsset) {
        // Reuse global asset
        if (!selectedAssetIds.includes(existingGlobalAsset.id)) {
          handleAddAsset(existingGlobalAsset.id);
        }
        return;
      }

      // If not in global assets, create a temp one (or it might be from another asset node)
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      let name = "拖入素材";
      if (source === "canvas-node") {
        name = `画布-${customType === "image" ? "图像" : customType === "video" ? "视频" : "音频"}`;
      } else if (source === "asset-node") {
        name = "转移资产";
      }

      const newAsset: Asset = {
        id: tempId,
        url: text,
        type: (customType || "image") as any,
        name: name,
        createdAt: Date.now(),
      };

      if (data.onChange) {
        (data.onChange as any)(id, {
          localAssets: [...localAssets, newAsset],
          selectedAssetIds: [...selectedAssetIds, tempId],
        });
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "bg-[#1a1a1a]/90 backdrop-blur-xl rounded-2xl flex flex-col font-sans relative group transition-all duration-300 w-[810px] h-[600px] border shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-grab active:cursor-grabbing",
          isSpacePressed && "p-2",
          selected
            ? "ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] border-transparent"
            : "border-white/10 hover:border-white/20",
          isDragOver && "ring-2 ring-green-500 bg-[#2a3a2a]/90",
        )}
      >
        <div
          className={cn(
            "p-[18px] border-b-2 border-white/5 bg-white/5 text-[16px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center rounded-t-2xl",
            isSpacePressed && "nodrag",
          )}
        >
          {(data.title as string) || "资产集合"}
        </div>

        <div
          className={cn(
            "p-6 flex-1 flex flex-col gap-6 overflow-hidden",
            isSpacePressed && "nodrag cursor-default",
          )}
        >
          <div
            className={cn(
              "gap-4 overflow-y-auto custom-scrollbar pr-1.5 flex-1",
              selectedAssets.length === 1
                ? "flex flex-col h-full items-center justify-center"
                : "grid grid-cols-2 sm:grid-cols-3 auto-rows-max",
            )}
          >
            <AnimatePresence>
              {selectedAssets.map((asset, idx) => {
                const isOnlyMedia = selectedAssets.length === 1;
                return (
                  <MediaItem
                    key={asset.id}
                    asset={asset}
                    isOnlyMedia={isOnlyMedia}
                    handleImageDoubleClick={handleImageDoubleClick}
                    handleSaveToLibrary={handleSaveToLibrary}
                    handleRemoveAsset={handleRemoveAsset}
                    selected={selected}
                    isSpacePressed={isSpacePressed}
                  />
                );
              })}
            </AnimatePresence>
            {selectedAssets.length === 0 && (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center gap-3 border-[3px] border-dashed border-white/5 rounded-[20px] text-neutral-500">
                <ImageIcon className="w-12 h-12 opacity-20" />
                <span className="text-base">暂无资产内容</span>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="flex gap-3">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex-1 py-[18px] bg-white/5 border-2 border-white/10 rounded-2xl text-[18px] font-bold text-neutral-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3 cursor-pointer shadow-inner"
              >
                <Plus className="w-6 h-6" /> 选择资产
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-[18px] bg-white/5 border-2 border-white/10 rounded-2xl text-[18px] font-bold text-neutral-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3 cursor-pointer shadow-inner"
              >
                <Upload className="w-6 h-6" /> 本地上传
              </button>
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                multiple
                accept="image/*,audio/*,video/*"
                onChange={handleFileUpload}
              />
            </div>

            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-3 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[380px] overflow-y-auto p-1.5 py-3 animate-in fade-in slide-in-from-bottom-2 duration-200 custom-scrollbar">
                <div className="px-4 py-2 text-[12px] font-bold text-neutral-500 uppercase tracking-widest border-b border-white/5 mb-1">
                  可用资产
                </div>
                {allAssets.length === 0 ? (
                  <div className="p-8 text-center text-[14px] text-neutral-500 italic">
                    资产库为空...
                  </div>
                ) : (
                  allAssets.map((asset) => {
                    const isSelected = selectedAssetIds.includes(asset.id);
                    if (isSelected) return null;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => handleAddAsset(asset.id)}
                        className="p-3 mx-1.5 rounded-xl hover:bg-white/5 cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-white/5"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                          {asset.type === "image" ? (
                            <img
                              src={asset.url}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                          ) : asset.type === "video" ? (
                            <video
                              src={asset.url}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="w-6 h-6 text-blue-400" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[15px] font-bold text-neutral-200 truncate">
                            {asset.name}
                          </span>
                          <span className="text-[10px] text-neutral-500 uppercase">
                            {asset.type === "image"
                              ? "图片"
                              : asset.type === "video"
                                ? "视频"
                                : "音频"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Output Handle (Right) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-[100]">
          <MagneticHandle type="source" position={Position.Right} id="right" />
        </div>

        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </motion.div>

      {isFullscreen && fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={() => setIsFullscreen(false)}
        >
          <img
            src={fullscreenImage}
            alt="Fullscreen"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <button
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all border-none cursor-pointer hover:scale-110 text-2xl"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
});

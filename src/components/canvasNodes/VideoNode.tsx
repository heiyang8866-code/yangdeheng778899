import React, { useState, useRef, useEffect, useContext } from "react";
import { CanvasContext } from "../../lib/CanvasContext";
import {
  Handle,
  Position,
  NodeProps,
  useStore,
  useUpdateNodeInternals,
} from "@xyflow/react";
import {
  Video,
  Monitor,
  BoxSelect,
  Loader2,
  BookmarkPlus,
  Library,
  X,
  Maximize2,
  SlidersHorizontal,
  ArrowUp,
  Film,
  Play,
  Pause,
  Edit,
} from "lucide-react";
import { VIDEO_MODELS } from "../../constants";
import { cn } from "../../lib/utils";
import { Asset } from "../../types";
import { MagneticHandle } from "./MagneticHandle";
import { motion, AnimatePresence } from "motion/react";

export const VideoNode = React.memo(function VideoNode({ data, id, selected, dragging }: NodeProps) {
  const zoom = useStore((s: any) => s.transform[2]);
  const selectedNodesCount = useStore(
    (s: any) => s.nodes.filter((n: any) => n.selected).length,
  );
  const isExtracted = data.variant === "extracted";
  const [modelOpen, setModelOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [replaceVideoOpen, setReplaceVideoOpen] = useState<
    false | "menu" | "assets"
  >(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [funcOpen, setFuncOpen] = useState(false);
  const [newStyleName, setNewStyleName] = useState("");
  const [newStyleContent, setNewStyleContent] = useState("");
  const [newFuncName, setNewFuncName] = useState("");
  const [newFuncContent, setNewFuncContent] = useState("");

  const [editingStyleIdx, setEditingStyleIdx] = useState<number | null>(null);
  const [editingStyleName, setEditingStyleName] = useState("");
  const [editingStyleContent, setEditingStyleContent] = useState("");

  const [editingFuncIdx, setEditingFuncIdx] = useState<number | null>(null);
  const [editingFuncName, setEditingFuncName] = useState("");
  const [editingFuncContent, setEditingFuncContent] = useState("");

  const [customStyles, setCustomStyles] = useState<
    { name: string; content: string }[]
  >(() => {
    const saved = localStorage.getItem("video-node-styles");
    return saved ? JSON.parse(saved) : [];
  });
  const [customFuncs, setCustomFuncs] = useState<
    { name: string; content: string }[]
  >(() => {
    const saved = localStorage.getItem("video-node-functions");
    return saved ? JSON.parse(saved) : [];
  });
  const [countOpen, setCountOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current
          .play()
          .catch((err) => console.error("Play failed", err));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p =
        (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(isNaN(p) ? 0 : p);
    }
  };

  const handleProgressScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime =
        (Number(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
    }
  };

  const handleVideoDragStart = (e: React.DragEvent) => {
    if (data.videoSrc) {
      e.stopPropagation();
      e.dataTransfer.setData("text/plain", data.videoSrc as string);
      e.dataTransfer.setData("application/x-custom-type", "video");
      e.dataTransfer.setData("application/x-source", "canvas-node");
      e.dataTransfer.effectAllowed = "copy";

      if (videoRef.current) {
        const canvas = document.createElement("canvas");
        const rect = videoRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          try {
            // Try to draw the video onto the canvas at its scaled size
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.style.position = "absolute";
            canvas.style.top = "-9999px";
            document.body.appendChild(canvas);

            // Calculate precise drag offsets
            const scaleX = rect.width / videoRef.current.clientWidth;
            const scaleY = rect.height / videoRef.current.clientHeight;
            const offsetX = e.nativeEvent.offsetX * scaleX;
            const offsetY = e.nativeEvent.offsetY * scaleY;

            e.dataTransfer.setDragImage(canvas, offsetX, offsetY);
            setTimeout(() => document.body.removeChild(canvas), 0);
          } catch (err) {
            // If canvas is tainted (CORS) or other error, fallback to nothing
          }
        }
      }
    }
  };

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

  useEffect(() => {
    const handleGlobalClick = () => {
      setModelOpen(false);
      setRatioOpen(false);
      setAssetOpen(false);
      setResOpen(false);
      setDurationOpen(false);
    };

    window.addEventListener("pointerdown", handleGlobalClick);
    return () => window.removeEventListener("pointerdown", handleGlobalClick);
  }, []);

  const currentModel =
    VIDEO_MODELS.find((m) => m.id === data.modelId) || VIDEO_MODELS[0];
  const { assets: globalAssets } = useContext(CanvasContext);
  const localAssets = (data.localAssets || []) as Asset[];
  const allAssets = [...globalAssets, ...localAssets];
  const inputImages = (data.attachedImages as string[]) || [];

  const builtInStyles = [
    {
      name: "电影质感",
      content: "电影级画质，自然光效，色彩丰富且有层次感，4k分辨率。",
    },
  ];

  const builtInFuncs = [
    { name: "缓慢运镜", content: "镜头缓慢向前推进，画面平稳不抖动。" },
  ];

  const allStyles = [...builtInStyles, ...customStyles];
  const allFuncs = [...builtInFuncs, ...customFuncs];

  const handleAddStyle = () => {
    if (newStyleName.trim() && newStyleContent.trim()) {
      const updated = [
        ...customStyles,
        { name: newStyleName.trim(), content: newStyleContent.trim() },
      ];
      setCustomStyles(updated);
      localStorage.setItem("video-node-styles", JSON.stringify(updated));
      setNewStyleName("");
      setNewStyleContent("");
    }
  };

  const handleRemoveStyle = (index: number) => {
    const updated = customStyles.filter((_, i) => i !== index);
    setCustomStyles(updated);
    localStorage.setItem("video-node-styles", JSON.stringify(updated));
  };

  const handleAddFunc = () => {
    if (newFuncName.trim() && newFuncContent.trim()) {
      const updated = [
        ...customFuncs,
        { name: newFuncName.trim(), content: newFuncContent.trim() },
      ];
      setCustomFuncs(updated);
      localStorage.setItem("video-node-functions", JSON.stringify(updated));
      setNewFuncName("");
      setNewFuncContent("");
    }
  };

  const handleRemoveFunc = (index: number) => {
    const updated = customFuncs.filter((_, i) => i !== index);
    setCustomFuncs(updated);
    localStorage.setItem("video-node-functions", JSON.stringify(updated));
  };

  const startEditStyle = (index: number, s: any) => {
    setEditingStyleIdx(index);
    setEditingStyleName(s.name);
    setEditingStyleContent(s.content);
  };

  const saveEditStyle = () => {
    if (
      editingStyleIdx !== null &&
      editingStyleName.trim() &&
      editingStyleContent.trim()
    ) {
      const customIdx = editingStyleIdx - builtInStyles.length;
      const updated = [...customStyles];
      updated[customIdx] = {
        name: editingStyleName.trim(),
        content: editingStyleContent.trim(),
      };
      setCustomStyles(updated);
      localStorage.setItem("video-node-styles", JSON.stringify(updated));
      setEditingStyleIdx(null);
    }
  };

  const startEditFunc = (index: number, f: any) => {
    setEditingFuncIdx(index);
    setEditingFuncName(f.name);
    setEditingFuncContent(f.content);
  };

  const saveEditFunc = () => {
    if (
      editingFuncIdx !== null &&
      editingFuncName.trim() &&
      editingFuncContent.trim()
    ) {
      const customIdx = editingFuncIdx - builtInFuncs.length;
      const updated = [...customFuncs];
      updated[customIdx] = {
        name: editingFuncName.trim(),
        content: editingFuncContent.trim(),
      };
      setCustomFuncs(updated);
      localStorage.setItem("video-node-functions", JSON.stringify(updated));
      setEditingFuncIdx(null);
    }
  };

  const applyStyle = (style: { name: string; content: string }) => {
    if (data.onChange) {
      (data.onChange as any)(id, { selectedStyle: style });
    }
    setStyleOpen(false);
  };

  const applyFunc = (func: { name: string; content: string }) => {
    if (data.onChange) {
      (data.onChange as any)(id, { selectedFunction: func });
    }
    setFuncOpen(false);
  };

  const selectedStyle = data.selectedStyle as
    | { name: string; content: string }
    | undefined;
  const selectedFunction = data.selectedFunction as
    | { name: string; content: string }
    | undefined;

  const handleClearVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onChange) {
      (data.onChange as any)(id, { videoSrc: null, videoSrcs: null });
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.videoSrc) {
      const a = document.createElement("a");
      a.href = data.videoSrc as string;
      a.download = `video-${id}.mp4`;
      a.click();
    }
  };

  const onGenerate = () => {
    if (data.onGenerate) {
      (data.onGenerate as any)(id);
    }
  };

  const handleNodeNativeDragStart = (e: React.DragEvent) => {
    if (data.videoSrc) {
      e.dataTransfer.setData("text/plain", data.videoSrc as string);
      e.dataTransfer.setData("application/x-custom-type", "video");
      e.dataTransfer.setData("application/x-source", "canvas-node");
      e.dataTransfer.effectAllowed = "copy";
    }
  };

  const displayBoxRef = useRef<HTMLDivElement>(null);
  const inputBoxRef = useRef<HTMLDivElement>(null);
  const [inputHandleStyle, setInputHandleStyle] = useState<React.CSSProperties>({
    top: "150px",
    left: "0px",
  });
  const [outputHandleStyle, setOutputHandleStyle] = useState<React.CSSProperties>({
    top: "150px",
  });
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    const updateHandlePos = () => {
      if (displayBoxRef.current) {
        const outBox = displayBoxRef.current;
        const outTop = outBox.offsetTop + outBox.offsetHeight / 2;
        setOutputHandleStyle({ top: `${outTop}px` });

        if (isExtracted && inputBoxRef.current) {
          const inBox = inputBoxRef.current;
          const inTop = inBox.offsetTop + inBox.offsetHeight / 2;
          const inLeft = inBox.offsetLeft;
          setInputHandleStyle({ top: `${inTop}px`, left: `${inLeft}px` });
        } else {
          const inTop = outBox.offsetTop + outBox.offsetHeight / 2;
          const inLeft = outBox.offsetLeft;
          setInputHandleStyle({ top: `${inTop}px`, left: `${inLeft}px` });
        }
      }
    };

    const obs = new ResizeObserver(updateHandlePos);
    if (displayBoxRef.current) obs.observe(displayBoxRef.current);
    if (inputBoxRef.current) obs.observe(inputBoxRef.current);
    updateHandlePos();
    return () => obs.disconnect();
  }, [isExtracted, data.videoSrc, data.ratio, id]);

  useEffect(() => {
    requestAnimationFrame(() => updateNodeInternals(id));
  }, [inputHandleStyle.top, inputHandleStyle.left, outputHandleStyle.top, id, updateNodeInternals]);

  const [isTextExpanded, setIsTextExpanded] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isTextExpanded && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-20 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsTextExpanded(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#1a1a1a] border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Edit className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg uppercase tracking-wider">编辑视频描述</h3>
                    <p className="text-neutral-500 text-xs">{(data.title as string) || "视频描述"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTextExpanded(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar nodrag" onPointerDown={(e) => e.stopPropagation()}>
                <textarea
                  className="w-full bg-transparent border-none text-xl text-neutral-200 placeholder:text-neutral-600 resize-none outline-none leading-relaxed min-h-[400px] nodrag"
                  value={data.content as string}
                  onChange={(e) =>
                    data.onChange &&
                    (data.onChange as any)(id, { content: e.target.value })
                  }
                  autoFocus
                />
              </div>
              <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end">
                <button
                  onClick={() => setIsTextExpanded(false)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-xl shadow-blue-900/20 border-none cursor-pointer active:scale-95"
                >
                  确认并关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div
        draggable={!!data.videoSrc && selected && !isSpacePressed}
        onDragStart={
          selected && !isSpacePressed ? handleNodeNativeDragStart : undefined
        }
        className={cn(
          "bg-transparent rounded-xl flex flex-col font-sans relative transition-all duration-300 overflow-visible border border-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] group cursor-grab active:cursor-grabbing",
          isSpacePressed && "p-2",
          isExtracted ? "w-[660px]" : "w-max",
          selected
            ? "ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            : "hover:border-white/70",
        )}
      >
        {/* Input Handle (Left) */}
        <div
          className="absolute flex items-center justify-center z-[100]"
          style={inputHandleStyle}
        >
          <MagneticHandle type="target" position={Position.Left} id="left" />
        </div>

        {/* Content Wrapper */}
        <div
          className={cn(
            "flex w-full",
            isExtracted ? "flex-row" : "flex-col items-center",
            isSpacePressed && "nodrag cursor-default",
          )}
        >
          {isExtracted && (
            <div
              ref={inputBoxRef}
              className="flex-1 p-4 bg-[#1a1a1a] rounded-l-xl flex flex-col gap-4 border-r border-white/5 cursor-text nodrag"
              onDoubleClick={(e) => e.stopPropagation()}
              draggable={true}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 p-2 px-3 bg-white/5 rounded-2xl">
                  <span className="text-[13px] font-black text-white uppercase tracking-widest leading-none">
                    {(data.title as string) || "视频提示词"}
                  </span>
                </div>
                <button 
                  onClick={() => setIsTextExpanded(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer nodrag"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="relative flex-1 flex flex-col gap-2">
                {inputImages.length > 0 && (
                  <div className="w-full flex gap-2 overflow-x-auto custom-scrollbar py-1">
                    {inputImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-12 h-12 rounded-xl overflow-hidden ring-1 ring-white/10 group/thumb shrink-0"
                      >
                        <img
                          src={img}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                        <div className="absolute top-0 right-0 bg-black/60 px-1 text-[8px] text-white rounded-bl-lg">
                          {idx + 1}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newAttached = [...inputImages];
                            newAttached.splice(idx, 1);
                            (data.onChange as any)(id, {
                              attachedImages: newAttached,
                            });
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity border-none cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  className="w-full flex-1 min-h-[150px] bg-transparent border-none p-0 text-sm text-neutral-200 placeholder:text-neutral-500 resize-none outline-none leading-relaxed custom-scrollbar nodrag"
                  value={data.content as string}
                  onChange={(e) =>
                    data.onChange &&
                    (data.onChange as any)(id, { content: e.target.value })
                  }
                  placeholder="形容视频内容..."
                  onDoubleClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="flex items-center justify-between pt-3 nodrag">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="relative">
                    <button
                      onClick={() => setModelOpen(!modelOpen)}
                      className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors border-none bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md cursor-pointer font-medium tracking-wide"
                    >
                      <span>{currentModel.name}</span>
                      <svg
                        className="w-3 h-3 opacity-50"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {modelOpen && (
                      <div
                        className="absolute bottom-full left-0 mb-3 w-[180px] bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {VIDEO_MODELS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              (data.onChange as any)(id, { modelId: m.id });
                              setModelOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-[11px] transition-colors border-none bg-transparent cursor-pointer",
                              data.modelId === m.id ||
                                (!data.modelId && m.id === "veo3.1-components")
                                ? "text-purple-400 bg-purple-400/10 font-bold"
                                : "text-neutral-400 hover:bg-white/5",
                            )}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setRatioOpen(!ratioOpen)}
                      className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors border-none bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md cursor-pointer font-medium tracking-wide"
                    >
                      <span>{(data.ratio as string) || "16:9"}</span>
                      <svg
                        className="w-3 h-3 opacity-50"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {ratioOpen && (
                      <div
                        className="absolute bottom-full left-0 w-[100px] mb-3 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map(
                          (r) => (
                            <button
                              key={r}
                              onClick={() => {
                                (data.onChange as any)(id, { ratio: r });
                                setRatioOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-2.5 text-[11px] border-none bg-transparent cursor-pointer transition-colors",
                                data.ratio === r ||
                                  (!data.ratio && r === "16:9")
                                  ? "text-purple-400 bg-purple-400/10 font-bold"
                                  : "text-neutral-400 hover:bg-white/5",
                              )}
                            >
                              {r}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setResOpen(!resOpen)}
                      className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors border-none bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md cursor-pointer font-medium tracking-wide"
                    >
                      <span>{(data.resolution as string) || "1080p"}</span>
                      <svg
                        className="w-3 h-3 opacity-50"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {resOpen && (
                      <div
                        className="absolute bottom-full left-0 w-[100px] mb-3 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {["720p", "1080p", "2k", "4k"].map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              (data.onChange as any)(id, { resolution: r });
                              setResOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-[11px] border-none bg-transparent cursor-pointer transition-colors",
                              ((data.resolution as string) || "1080p") === r
                                ? "text-purple-400 bg-purple-400/10 font-bold"
                                : "text-neutral-400 hover:bg-white/5",
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setDurationOpen(!durationOpen)}
                      className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors border-none bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md cursor-pointer font-medium tracking-wide"
                    >
                      <span>{(data.duration as string) || "5s"}</span>
                      <svg
                        className="w-3 h-3 opacity-50"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {durationOpen && (
                      <div
                        className="absolute bottom-full left-0 w-[100px] mb-3 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[200px] overflow-y-auto custom-scrollbar py-1"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {[
                          "4s",
                          "5s",
                          "6s",
                          "7s",
                          "8s",
                          "9s",
                          "10s",
                          "11s",
                          "12s",
                          "13s",
                          "14s",
                          "15s",
                        ].map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              (data.onChange as any)(id, { duration: r });
                              setDurationOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-[11px] border-none bg-transparent cursor-pointer transition-colors",
                              ((data.duration as string) || "5s") === r
                                ? "text-purple-400 bg-purple-400/10 font-bold"
                                : "text-neutral-400 hover:bg-white/5",
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  disabled={data.isGenerating as boolean}
                  onClick={onGenerate}
                  className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-90 border-none cursor-pointer disabled:opacity-50"
                >
                  <ArrowUp className="w-5 h-5 stroke-[3px]" />
                </button>
              </div>
            </div>
          )}

          {/* Top: Video Output Area */}
          <div
            ref={displayBoxRef}
            className={cn(
              "bg-black/50 backdrop-blur-md flex flex-none items-center justify-center overflow-hidden relative group/vid cursor-pointer transition-all duration-300 shadow-sm",
              isExtracted
                ? "w-[360px] min-h-[250px] rounded-r-xl"
                : "h-[450px] rounded-xl",
              selected &&
                "ring-2 ring-white ring-offset-1 ring-offset-transparent",
            )}
            style={{
              aspectRatio: isExtracted
                ? undefined
                : (data.ratio as string)?.replace(":", "/") || "16/9",
              zIndex: 10, // Lower than handles and edges
            }}
          >
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-neutral-900/40 backdrop-blur-md px-2 py-0.5 rounded-full text-white/90 text-[10px] z-10 font-medium border border-white/10">
              <Video className="w-3 h-3" />
              <span>视频节点 {id.split("-").pop()}</span>
            </div>

            {data.videoSrc ? (
              <>
                <video
                  ref={videoRef}
                  src={data.videoSrc as string}
                  draggable={isSpacePressed}
                  onDragStart={
                    isSpacePressed ? handleVideoDragStart : undefined
                  }
                  className={cn(
                    "w-full h-full object-contain relative z-20 cursor-grab active:cursor-grabbing",
                    !selected && !isSpacePressed && "pointer-events-none",
                  )}
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                />

                {/* Play/Pause Center Overlay Button */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center z-30 transition-all duration-300 pointer-events-none group-hover/vid:bg-black/20",
                    !isPlaying ? "bg-black/40" : "",
                  )}
                >
                  <button
                    onClick={togglePlay}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center border-none shadow-xl backdrop-blur-md cursor-pointer pointer-events-auto transition-all",
                      isPlaying
                        ? "bg-white/10 text-white/50 opacity-0 group-hover/vid:opacity-100 hover:bg-white/20 hover:text-white"
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

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/60 to-transparent z-40 opacity-0 group-hover/vid:opacity-100 transition-opacity nodrag flex items-end">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleProgressScrub}
                    className="w-full h-1.5 appearance-none bg-white/20 cursor-pointer accent-blue-500 m-0"
                    style={{ WebkitAppearance: "none" }}
                  />
                </div>

                <button
                  onClick={handleClearVideo}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity z-50 border-none cursor-pointer nodrag"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 right-2 flex items-center gap-2 z-50 nodrag">
                  {isExtracted && (
                    <div className="relative">
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssetOpen(assetOpen ? false : true);
                        }}
                        className="bg-black/60 hover:bg-black/80 text-white text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border-none cursor-pointer h-8 shadow-lg backdrop-blur-sm"
                      >
                        <Library className="w-3.5 h-3.5" /> 替换视频
                      </button>

                      {assetOpen && (
                        <div
                          className="absolute bottom-full right-0 mb-2 w-[240px] bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[300px] overflow-y-auto p-1 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200 cursor-default"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-2 mb-1 border-b border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                              选择替换视频
                            </span>
                            <X
                              className="w-3 h-3 text-neutral-500 cursor-pointer hover:text-white transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssetOpen(false);
                              }}
                            />
                          </div>
                          {allAssets.filter((a) => a.type === "video")
                            .length === 0 ? (
                            <div className="p-6 text-center text-[10px] text-neutral-500 italic">
                              资产库暂无视频...
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 p-2">
                              {allAssets
                                .filter((a) => a.type === "video")
                                .map((asset) => (
                                  <button
                                    key={asset.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (data.onChange) {
                                        (data.onChange as any)(id, {
                                          videoSrc: asset.url,
                                        });
                                      }
                                      setAssetOpen(false);
                                    }}
                                    className="relative aspect-video rounded-xl overflow-hidden border border-white/5 hover:border-blue-500 group/asset p-0 cursor-pointer transition-all"
                                  >
                                    <video
                                      src={asset.url}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {data.videoSrc ? (
                    <div className="flex items-center gap-2 opacity-0 group-hover/vid:opacity-100 transition-opacity">
                      {data.onSaveAsset && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            (data.onSaveAsset as any)(
                              data.videoSrc as string,
                              "video",
                            );
                          }}
                          className="bg-black/60 hover:bg-black/80 text-white text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border-none cursor-pointer h-8 shadow-lg backdrop-blur-sm"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" /> 存入
                        </button>
                      )}

                      <button
                        onClick={handleDownload}
                        className="w-8 h-8 bg-black/60 hover:bg-neutral-800 text-white rounded-lg flex items-center justify-center border-none cursor-pointer shadow-lg backdrop-blur-sm"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-blue-400/60 text-xs flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                  <Film className="w-6 h-6 text-blue-400" />
                </div>
                <span className="font-semibold tracking-tight">待生成视频</span>
              </div>
            )}

            {data.isGenerating && (
              <div className="absolute inset-0 bg-[#0a0a0a]/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-40">
                <div className="p-3 bg-[#1a1a1a] rounded-2xl shadow-xl border border-white/5">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
                <span className="text-xs font-bold text-neutral-300 tracking-wider uppercase">
                  视频生成中...
                </span>
                {data.genStatus && (
                  <span className="text-[10px] text-neutral-400 max-w-[80%] text-center px-4">
                    {data.genStatus as string}
                  </span>
                )}
              </div>
            )}

            {data.error && !data.isGenerating && (
              <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30 p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-red-400 tracking-wider uppercase">
                    生成失败
                  </span>
                  <span className="text-[10px] text-red-300/80 line-clamp-3">
                    {data.error as string}
                  </span>
                </div>
                <button
                  onClick={onGenerate}
                  className="mt-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] rounded-full font-bold transition-colors border-none cursor-pointer"
                >
                  重试
                </button>
              </div>
            )}
          </div>

          {/* Bottom Control Area - Inspired by ImageNode */}
          {selected &&
            !isExtracted &&
            !dragging &&
            selectedNodesCount === 1 && (
              <div
                className="absolute top-full left-1/2 mt-4 p-4 bg-[#1a1a1a] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 border border-white/5 ring-4 ring-black/5 nodrag"
                style={{
                  width: "600px",
                  transform: `translate(-50%, 0) scale(${1 / zoom})`,
                  transformOrigin: "top center",
                  zIndex: 50,
                }}
                draggable={true}
                onDragStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {/* Top Row: Info & Images */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 p-2 px-3 bg-white/5 rounded-2xl">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                      首帧/参考图
                    </span>
                  </div>

                  {/* Thumbnails */}
                  <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {inputImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-12 h-12 rounded-xl overflow-hidden ring-1 ring-white/10 group/thumb shrink-0"
                      >
                        <img
                          src={img}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                        <div className="absolute top-0 right-0 bg-black/60 px-1 text-[8px] text-white rounded-bl-lg">
                          {idx + 1}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newAttached = [...inputImages];
                            newAttached.splice(idx, 1);
                            (data.onChange as any)(id, {
                              attachedImages: newAttached,
                            });
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity border-none cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setAssetOpen(true)}
                      className="w-12 h-12 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 hover:text-white/40 hover:border-white/20 transition-all shrink-0 bg-transparent cursor-pointer"
                    >
                      <BookmarkPlus className="w-5 h-5" />
                    </button>
                    {assetOpen && (
                      <div className="absolute top-0 right-full mr-3 w-[240px] bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[300px] overflow-y-auto p-1 py-2 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="px-3 py-2 mb-1 border-b border-white/5 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                            我的资产
                          </span>
                          <X
                            className="w-3 h-3 text-neutral-500 cursor-pointer hover:text-white transition-colors"
                            onClick={() => setAssetOpen(false)}
                          />
                        </div>
                        {allAssets.filter((a) => a.type === "image").length ===
                        0 ? (
                          <div className="p-8 text-center text-[11px] text-neutral-500 italic">
                            资产中没有图片素材...
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 p-2">
                            {allAssets
                              .filter((a) => a.type === "image")
                              .map((asset) => (
                                <button
                                  key={asset.id}
                                  onClick={() => {
                                    const newAttached = [
                                      ...inputImages,
                                      asset.url,
                                    ];
                                    (data.onChange as any)(id, {
                                      attachedImages: newAttached,
                                    });
                                    setAssetOpen(false);
                                  }}
                                  className="relative aspect-square rounded-xl overflow-hidden border border-white/5 hover:border-purple-500 group/asset p-0 cursor-pointer transition-all"
                                >
                                  <img
                                    src={asset.url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/asset:opacity-100 flex items-center justify-center transition-all">
                                    <span className="text-[9px] text-white bg-purple-600 px-2 py-0.5 rounded-full font-bold shadow-lg">
                                      选用
                                    </span>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer">
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Input Row */}
                <div className="relative flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setStyleOpen(!styleOpen)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-colors border cursor-pointer",
                          selectedStyle
                            ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20"
                            : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20",
                        )}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        {selectedStyle ? selectedStyle.name : "视频风格"}
                      </button>
                      {styleOpen && (
                        <div
                          className="absolute bottom-full left-0 mb-3 w-[280px] bg-[#1e1f24] border border-white/10 rounded-2xl shadow-2xl z-[70] p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                              预设风格
                            </div>
                            {selectedStyle && (
                              <button
                                onClick={() => {
                                  (data.onChange as any)(id, {
                                    selectedStyle: null,
                                  });
                                  setStyleOpen(false);
                                }}
                                className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer"
                              >
                                清除选择
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {allStyles.map((s, idx) => (
                              <div key={idx} className="group relative">
                                {editingStyleIdx === idx ? (
                                  <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 mb-1 z-10 relative">
                                    <input
                                      className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-blue-500/50"
                                      value={editingStyleName}
                                      onChange={(e) =>
                                        setEditingStyleName(e.target.value)
                                      }
                                      placeholder="风格名称..."
                                    />
                                    <textarea
                                      className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white placeholder:text-neutral-500 outline-none focus:border-blue-500/50 resize-none h-16"
                                      value={editingStyleContent}
                                      onChange={(e) =>
                                        setEditingStyleContent(e.target.value)
                                      }
                                      placeholder="风格描述内容..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => setEditingStyleIdx(null)}
                                        className="text-[10px] px-2 py-1 text-neutral-400 hover:text-white bg-white/5 rounded-md border-none cursor-pointer"
                                      >
                                        取消
                                      </button>
                                      <button
                                        onClick={saveEditStyle}
                                        className="text-[10px] px-2 py-1 text-white bg-blue-600 hover:bg-blue-500 rounded-md border-none cursor-pointer"
                                      >
                                        保存
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => applyStyle(s)}
                                      className={cn(
                                        "w-full text-left p-2.5 rounded-xl transition-all border flex flex-col gap-0.5 bg-transparent cursor-pointer",
                                        selectedStyle?.name === s.name
                                          ? "bg-blue-500/10 border-blue-500/30"
                                          : "hover:bg-white/5 border-transparent hover:border-white/10",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "text-xs font-bold",
                                          selectedStyle?.name === s.name
                                            ? "text-blue-400"
                                            : "text-neutral-200",
                                        )}
                                      >
                                        {s.name}
                                      </span>
                                      <span className="text-[10px] text-neutral-500 line-clamp-1">
                                        {s.content}
                                      </span>
                                    </button>
                                    {idx >= builtInStyles.length && (
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditStyle(idx, s);
                                          }}
                                          className="w-6 h-6 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center border-none cursor-pointer"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveStyle(
                                              idx - builtInStyles.length,
                                            );
                                          }}
                                          className="w-6 h-6 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border-none cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 pt-3 border-t border-white/5 flex flex-col gap-2">
                            <input
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-blue-500/50 transition-colors"
                              placeholder="风格名称..."
                              value={newStyleName}
                              onChange={(e) => setNewStyleName(e.target.value)}
                            />
                            <textarea
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-blue-500/50 transition-colors resize-none h-[60px]"
                              placeholder="风格描述内容..."
                              value={newStyleContent}
                              onChange={(e) =>
                                setNewStyleContent(e.target.value)
                              }
                            />
                            <button
                              onClick={handleAddStyle}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors border-none cursor-pointer shadow-lg shadow-blue-900/20"
                            >
                              保存到风格库
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setFuncOpen(!funcOpen)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-colors border cursor-pointer",
                          selectedFunction
                            ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/20"
                            : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20",
                        )}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        {selectedFunction
                          ? selectedFunction.name
                          : "运镜/功能库"}
                      </button>
                      {funcOpen && (
                        <div
                          className="absolute bottom-full left-0 mb-3 w-[280px] bg-[#1e1f24] border border-white/10 rounded-2xl shadow-2xl z-[70] p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                              运镜/功能预设
                            </div>
                            {selectedFunction && (
                              <button
                                onClick={() => {
                                  (data.onChange as any)(id, {
                                    selectedFunction: null,
                                  });
                                  setFuncOpen(false);
                                }}
                                className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer"
                              >
                                清除选择
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {allFuncs.map((f, idx) => (
                              <div key={idx} className="group relative">
                                {editingFuncIdx === idx ? (
                                  <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 mb-1 z-10 relative">
                                    <input
                                      className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-purple-500/50"
                                      value={editingFuncName}
                                      onChange={(e) =>
                                        setEditingFuncName(e.target.value)
                                      }
                                      placeholder="功能名称..."
                                    />
                                    <textarea
                                      className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white placeholder:text-neutral-500 outline-none focus:border-purple-500/50 resize-none h-16"
                                      value={editingFuncContent}
                                      onChange={(e) =>
                                        setEditingFuncContent(e.target.value)
                                      }
                                      placeholder="功能描述内容..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => setEditingFuncIdx(null)}
                                        className="text-[10px] px-2 py-1 text-neutral-400 hover:text-white bg-white/5 rounded-md border-none cursor-pointer"
                                      >
                                        取消
                                      </button>
                                      <button
                                        onClick={saveEditFunc}
                                        className="text-[10px] px-2 py-1 text-white bg-purple-600 hover:bg-purple-500 rounded-md border-none cursor-pointer"
                                      >
                                        保存
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => applyFunc(f)}
                                      className={cn(
                                        "w-full text-left p-2.5 rounded-xl transition-all border flex flex-col gap-0.5 bg-transparent cursor-pointer",
                                        selectedFunction?.name === f.name
                                          ? "bg-purple-500/10 border-purple-500/30"
                                          : "hover:bg-white/5 border-transparent hover:border-white/10",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "text-xs font-bold",
                                          selectedFunction?.name === f.name
                                            ? "text-purple-400"
                                            : "text-neutral-200",
                                        )}
                                      >
                                        {f.name}
                                      </span>
                                      <span className="text-[10px] text-neutral-500 line-clamp-1">
                                        {f.content}
                                      </span>
                                    </button>
                                    {idx >= builtInFuncs.length && (
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditFunc(idx, f);
                                          }}
                                          className="w-6 h-6 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center border-none cursor-pointer"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveFunc(
                                              idx - builtInFuncs.length,
                                            );
                                          }}
                                          className="w-6 h-6 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border-none cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 pt-3 border-t border-white/5 flex flex-col gap-2">
                            <input
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-purple-500/50 transition-colors"
                              placeholder="功能名称..."
                              value={newFuncName}
                              onChange={(e) => setNewFuncName(e.target.value)}
                            />
                            <textarea
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-purple-500/50 transition-colors resize-none h-[60px]"
                              placeholder="功能描述内容..."
                              value={newFuncContent}
                              onChange={(e) =>
                                setNewFuncContent(e.target.value)
                              }
                            />
                            <button
                              onClick={handleAddFunc}
                              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition-colors border-none cursor-pointer shadow-lg shadow-purple-900/20"
                            >
                              保存到功能库
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <textarea
                    className="w-full h-[100px] bg-transparent border-none p-0 text-[15px] text-neutral-200 placeholder:text-neutral-500 resize-none outline-none leading-relaxed nodrag"
                    value={data.content as string}
                    onChange={(e) =>
                      data.onChange &&
                      (data.onChange as any)(id, { content: e.target.value })
                    }
                    placeholder="描述视频的动效、运镜或场景变化..."
                    onDoubleClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Bottom Row Controls */}
                <div className="flex items-center justify-between pt-3 nodrag">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="relative">
                      <button
                        onClick={() => setModelOpen(!modelOpen)}
                        className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors border-none bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md cursor-pointer font-medium tracking-wide"
                      >
                        <span>{currentModel.name}</span>
                        <svg
                          className="w-3 h-3 opacity-50"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {modelOpen && (
                        <div
                          className="absolute bottom-full left-0 mb-3 w-[180px] bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {VIDEO_MODELS.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                (data.onChange as any)(id, { modelId: m.id });
                                setModelOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-2.5 text-[11px] transition-colors border-none bg-transparent cursor-pointer",
                                data.modelId === m.id ||
                                  (!data.modelId &&
                                    m.id === "veo3.1-components")
                                  ? "text-purple-400 bg-purple-400/10 font-bold"
                                  : "text-neutral-400 hover:bg-white/5",
                              )}
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setRatioOpen(!ratioOpen)}
                        className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors border-none bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md cursor-pointer font-medium tracking-wide"
                      >
                        <span>{(data.ratio as string) || "16:9"}</span>
                        <svg
                          className="w-3 h-3 opacity-50"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {ratioOpen && (
                        <div
                          className="absolute bottom-full left-0 w-[100px] mb-3 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map(
                            (r) => (
                              <button
                                key={r}
                                onClick={() => {
                                  (data.onChange as any)(id, { ratio: r });
                                  setRatioOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-2.5 text-[11px] border-none bg-transparent cursor-pointer transition-colors",
                                  data.ratio === r ||
                                    (!data.ratio && r === "16:9")
                                    ? "text-purple-400 bg-purple-400/10 font-bold"
                                    : "text-neutral-400 hover:bg-white/5",
                                )}
                              >
                                {r}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setResOpen(!resOpen)}
                        className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors border-none bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md cursor-pointer font-medium tracking-wide"
                      >
                        <span>{(data.resolution as string) || "1080p"}</span>
                        <svg
                          className="w-3 h-3 opacity-50"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {resOpen && (
                        <div
                          className="absolute bottom-full left-0 w-[100px] mb-3 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {["720p", "1080p", "2k", "4k"].map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                (data.onChange as any)(id, { resolution: r });
                                setResOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-2.5 text-[11px] border-none bg-transparent cursor-pointer transition-colors",
                                ((data.resolution as string) || "1080p") === r
                                  ? "text-purple-400 bg-purple-400/10 font-bold"
                                  : "text-neutral-400 hover:bg-white/5",
                              )}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setDurationOpen(!durationOpen)}
                        className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors border-none bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md cursor-pointer font-medium tracking-wide"
                      >
                        <span>{(data.duration as string) || "5s"}</span>
                        <svg
                          className="w-3 h-3 opacity-50"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {durationOpen && (
                        <div
                          className="absolute bottom-full left-0 w-[100px] mb-3 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[200px] overflow-y-auto custom-scrollbar py-1"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {[
                            "4s",
                            "5s",
                            "6s",
                            "7s",
                            "8s",
                            "9s",
                            "10s",
                            "11s",
                            "12s",
                            "13s",
                            "14s",
                            "15s",
                          ].map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                (data.onChange as any)(id, { duration: r });
                                setDurationOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-2.5 text-[11px] border-none bg-transparent cursor-pointer transition-colors",
                                ((data.duration as string) || "5s") === r
                                  ? "text-purple-400 bg-purple-400/10 font-bold"
                                  : "text-neutral-400 hover:bg-white/5",
                              )}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      disabled={data.isGenerating as boolean}
                      onClick={onGenerate}
                      className="w-10 h-10 ml-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-90 border-none cursor-pointer disabled:opacity-50"
                    >
                      <ArrowUp className="w-5 h-5 stroke-[3px]" />
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Output Handle (Right) */}
        <div
          className="absolute right-0 flex items-center justify-center z-[100]"
          style={{ top: outputHandleStyle.top }}
        >
          <MagneticHandle type="source" position={Position.Right} id="right" />
        </div>

        {(modelOpen ||
          ratioOpen ||
          assetOpen ||
          resOpen ||
          durationOpen ||
          styleOpen ||
          funcOpen) && (
          <div
            className="fixed inset-0 z-40"
            onPointerDown={(e) => {
              e.stopPropagation();
              setModelOpen(false);
              setRatioOpen(false);
              setAssetOpen(false);
              setResOpen(false);
              setDurationOpen(false);
              setStyleOpen(false);
              setFuncOpen(false);
            }}
            onClick={(e) => {
              e.stopPropagation();
              setModelOpen(false);
              setRatioOpen(false);
              setAssetOpen(false);
              setResOpen(false);
              setDurationOpen(false);
              setStyleOpen(false);
              setFuncOpen(false);
            }}
          />
        )}
      </div>

      {isFullscreen && fullscreenVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-md"
          style={{ position: "fixed", top: 0, left: 0 }}
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="relative max-w-5xl w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={fullscreenVideo}
              className="w-full h-full object-contain"
              controls
              autoPlay
            />
            <button
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all border-none cursor-pointer z-50 text-xl"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(false);
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
});

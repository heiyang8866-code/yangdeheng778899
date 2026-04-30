import { motion, useDragControls } from "motion/react";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { CanvasContext } from "../lib/CanvasContext";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
  MarkerType,
  addEdge,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  SelectionMode,
} from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import {
  Plus,
  FileText,
  Image as ImageIcon,
  Video,
  Layout,
  Search,
  MousePointer2,
  Pencil,
  X,
  History,
  FolderOpen,
  Share2,
  Headphones,
  HelpCircle,
  MessageCircle,
  Download,
  Network,
  Menu,
  PanelLeftOpen,
  Play,
  Pause,
} from "lucide-react";
import "@xyflow/react/dist/style.css";
import { MainScriptNode } from "./canvasNodes/MainScriptNode";
import { TextNode } from "./canvasNodes/TextNode";
import { ImageNode } from "./canvasNodes/ImageNode";
import { VideoNode } from "./canvasNodes/VideoNode";
import { AssetNode } from "./canvasNodes/AssetNode";
import { TextExtractionNode } from "./canvasNodes/TextExtractionNode";
import { DeletableEdge } from "./canvasNodes/DeletableEdge";
import {
  callGeminiAPI,
  callGeminiStreamAPI,
  parseVideoAndExtractText,
  callYunwuVideoAPI,
} from "../lib/api";
import { cn } from "../lib/utils";

function HistoryMediaItem({ item }: { item: any }) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (mediaRef.current) {
      mediaRef.current
        .play()
        .catch((err) => console.log("Autoplay blocked", err));
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="w-full aspect-video p-1 pb-0 relative group/media overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {item.type === "video" ? (
        <div className="w-full h-full relative bg-black rounded-t-lg overflow-hidden">
          <video
            ref={mediaRef as any}
            src={item.url}
            className="w-full h-full object-cover"
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            muted={isHovered}
            loop
          />
        </div>
      ) : (
        <div className="w-full h-full relative bg-neutral-100 rounded-t-lg overflow-hidden flex flex-col items-center justify-center gap-2">
          <audio
            ref={mediaRef as any}
            src={item.url}
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            loop
          />
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Headphones
              size={24}
              className={cn(isPlaying && "animate-pulse")}
            />
          </div>
        </div>
      )}
      <div
        className={cn(
          "absolute inset-1 mb-0 rounded-t-lg flex items-center justify-center z-10 pointer-events-none transition-all duration-300",
          !isPlaying ? "bg-black/40" : "bg-transparent",
        )}
      >
        <button
          onClick={(e) => togglePlay(e)}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center border-none shadow-xl backdrop-blur-md cursor-pointer pointer-events-auto transition-all",
            isPlaying
              ? "bg-white/10 text-white/50 opacity-0 group-hover/media:opacity-100 hover:bg-white/20 hover:text-white"
              : "bg-white/20 text-white hover:bg-white/30 hover:scale-110",
          )}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function AssetMediaItemCanvas({ asset, onDelete }: { asset: any; onDelete?: (id: string) => void }) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (
      mediaRef.current &&
      (asset.type === "video" || asset.type === "audio")
    ) {
      mediaRef.current
        .play()
        .catch((err) => console.log("Autoplay blocked", err));
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (
      mediaRef.current &&
      (asset.type === "video" || asset.type === "audio")
    ) {
      mediaRef.current.pause();
      mediaRef.current.currentTime = 0;
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/50 shadow-sm hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", asset.url);
        e.dataTransfer.setData("application/x-custom-type", asset.type);
        e.dataTransfer.setData("application/x-source", "assets-area");
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.(asset.id);
        }}
        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center border-none cursor-pointer z-30 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
      >
        <X size={10} />
      </button>

      {asset.type === "image" ? (
        <img
          src={asset.url}
          alt={asset.name}
          draggable="false"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      ) : asset.type === "video" ? (
        <div className="w-full h-full bg-black relative flex items-center justify-center">
          <video
            ref={mediaRef as any}
            src={asset.url}
            draggable="false"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            muted={isHovered}
            loop
          />
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-300",
              !isPlaying ? "bg-black/40" : "bg-transparent",
            )}
          >
            <button
              onClick={(e) => togglePlay(e)}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-none shadow-xl backdrop-blur-md cursor-pointer pointer-events-auto transition-all",
                isPlaying
                  ? "opacity-0 group-hover:opacity-100 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                  : "bg-white/20 text-white hover:bg-white/30 hover:scale-110",
              )}
            >
              {isPlaying ? (
                <Pause size={12} />
              ) : (
                <Play size={12} className="ml-0.5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-400 group-hover:text-purple-600 transition-colors relative">
          <audio
            ref={mediaRef as any}
            src={asset.url}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            loop
          />
          <Headphones
            size={20}
            className={cn(isPlaying && "text-purple-600 animate-pulse")}
          />
          <span className="text-[9px] px-1 truncate w-[80%] text-center">
            {asset.name || "音频"}
          </span>
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-300",
              isPlaying
                ? "bg-transparent"
                : "bg-black/5 group-hover:bg-black/10",
            )}
          >
            <button
              onClick={(e) => togglePlay(e)}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-none shadow-xl backdrop-blur-md cursor-pointer pointer-events-auto transition-all",
                isPlaying
                  ? "opacity-0 group-hover:opacity-100 bg-black/20 text-white/70 hover:bg-black/40"
                  : "bg-black/40 text-white hover:bg-black/60 hover:scale-110",
              )}
            >
              {isPlaying ? (
                <Pause size={12} />
              ) : (
                <Play size={12} className="ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
        <div className="text-[9px] text-white/90 font-medium truncate w-full drop-shadow-md">
          {asset.type === "image"
            ? "图像"
            : asset.type === "video"
              ? "视频"
              : "音频"}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  mainScript: MainScriptNode,
  textNode: TextNode,
  imageNode: ImageNode,
  videoNode: VideoNode,
  assetNode: AssetNode,
  textExtractionNode: TextExtractionNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

function CanvasDramaAreaInner({
  apiKey,
  currentModelId,
  conversation,
  onUpdateCanvas,
  onUpdateProjectInfo,
  onUpdateHistory,
  onSaveAsset,
  onDeleteAsset,
  assets,
  sidebarOpen,
  setSidebarOpen,
}: {
  apiKey: string;
  currentModelId?: string;
  conversation?: any;
  onUpdateCanvas?: (nodes: Node[], edges: Edge[], title: string) => void;
  onUpdateProjectInfo?: (title: string, description: string) => void;
  onUpdateHistory?: (historyItem: {
    id: string;
    type: "image" | "audio" | "video";
    url: string;
    timestamp: number;
  }) => void;
  onSaveAsset?: (url: string, type: "image" | "audio") => void;
  onDeleteAsset?: (id: string) => void;
  assets?: any[];
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const dragControls = useDragControls();
  const [isExtracting, setIsExtracting] = useState(false);
  const [tempGroupingActive, setTempGroupingActive] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const { fitView, getEdges, getNodes } = useReactFlow();

  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);

  const takeSnapshot = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    
    setHistory((prev) => {
      const snapshot = {
        nodes: JSON.parse(JSON.stringify(currentNodes)),
        edges: JSON.parse(JSON.stringify(currentEdges)),
      };
      const next = [...prev, snapshot];
      return next.slice(-30);
    });
    setFuture([]);
  }, [getNodes, getEdges]);

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

  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [editProjectTitle, setEditProjectTitle] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");

  const [activeSidebarPanel, setActiveSidebarPanel] = useState<
    "none" | "history" | "assets"
  >("none");
  const [nodeMenuOpen, setNodeMenuOpen] = useState(false);
  const [placingNodeType, setPlacingNodeType] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  const handleShareProject = () => {
    if (!conversation) return;
    const projectContent = JSON.stringify(
      { nodes, edges, title: conversation.title || "星幕项目" },
      null,
      2,
    );
    const blob = new Blob([projectContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conversation.title || "canvas_project"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userText = chatInput.trim();
    setChatInput("");
    setIsChatting(true);

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: "..." },
    ]);

    try {
      const messagesPayload = [
        ...chatMessages,
        { role: "user", content: userText },
      ] as any;
      let finalContent = "";

      await callGeminiStreamAPI(
        messagesPayload,
        "chat",
        currentModelId || "gemini-3.1-pro-preview",
        apiKeyRef.current,
        undefined,
        (chunk) => {
          finalContent = chunk;
          setChatMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = {
              role: "assistant",
              content: finalContent,
            };
            return newMsgs;
          });
        },
        (thinking) => {
          // Handle thinking if needed
        },
        new AbortController().signal,
      );

      setIsChatting(false);
    } catch (error: any) {
      console.error(error);
      setIsChatting(false);
      setChatMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = {
          role: "assistant",
          content: `请求失败: ${error.message || "请检查API Key设置。"}`,
        };
        return newMsgs;
      });
    }
  };

  const apiKeyRef = useRef(apiKey);
  const onUpdateHistoryRef = useRef(onUpdateHistory);
  const onSaveAssetRef = useRef(onSaveAsset);
  const onUpdateCanvasRef = useRef(onUpdateCanvas);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  useEffect(() => {
    onUpdateHistoryRef.current = onUpdateHistory;
  }, [onUpdateHistory]);

  useEffect(() => {
    onSaveAssetRef.current = onSaveAsset;
  }, [onSaveAsset]);

  useEffect(() => {
    onUpdateCanvasRef.current = onUpdateCanvas;
  }, [onUpdateCanvas]);

  const lastUpdateRef = useRef({ nodes: "", edges: "" });

  const [rfInstance, setRfInstance] = useState<any>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    flowPos: { x: number; y: number };
    sourceParams?: {
      nodeId: string;
      handleId: string | null;
      handleType: string;
    };
  } | null>(null);
  const lastConnectionEndRef = useRef<number>(0);
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleId = useRef<string | null>(null);
  const connectingHandleType = useRef<string | null>(null);
  const connectionStartPos = useRef<{ x: number; y: number } | null>(null);
  const connectionHandledRef = useRef(false);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (
          n.type !== "assetNode" &&
          n.type !== "imageNode" &&
          n.type !== "videoNode"
        )
          return n;

        const selectedAssetIds = (n.data.selectedAssetIds || []) as string[];
        const currentLocalAssets = (n.data.localAssets || []) as any[];

        const tempAssets = currentLocalAssets.filter((a) =>
          a.id.startsWith("temp-"),
        );
        let newSelectedIds = [...selectedAssetIds];
        const remainingTempAssets: any[] = [];

        tempAssets.forEach((temp) => {
          const realAsset = (assets || []).find((a) => a.url === temp.url);
          if (realAsset) {
            newSelectedIds = newSelectedIds.map((id) =>
              id === temp.id ? realAsset.id : id,
            );
          } else {
            remainingTempAssets.push(temp);
          }
        });

        // Retain any non-temp assets in localAssets just in case
        const nonTempAssets = currentLocalAssets.filter(
          (a) => !a.id.startsWith("temp-")
        );

        return {
          ...n,
          data: {
            ...n.data,
            localAssets: [...nonTempAssets, ...remainingTempAssets],
            selectedAssetIds: Array.from(new Set(newSelectedIds)),
          },
        };
      }),
    );
  }, [assets, setNodes]);

  const handleDeleteEdge = useCallback(
    (id: string) => {
      takeSnapshot();
      setEdges((eds) => eds.filter((e) => e.id !== id));
    },
    [takeSnapshot],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "deletable",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
      style: { strokeWidth: 2, stroke: "#94a3b8" },
      data: { onDelete: handleDeleteEdge },
    }),
    [handleDeleteEdge],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const handleNodeChange = useCallback(
    (id: string, newData: any) => {
      setNodes((nds) => {
        const updatedNodes = [...nds];
        const index = updatedNodes.findIndex((n) => n.id === id);
        if (index === -1) return nds;

        const oldNodeData = { ...updatedNodes[index].data };
        const mergedNodes = updatedNodes.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, ...newData } };
          }
          return node;
        });

        const triggerNode = mergedNodes.find((n) => n.id === id);
        if (!triggerNode) return mergedNodes;

        let finalNodes = [...mergedNodes];

        // Sync Case 1: Asset Node -> Downstream Image/Video Nodes
        if (triggerNode.type === "assetNode" && newData.selectedAssetIds) {
          const allAssets = [...(assets || []), ...(triggerNode.data.localAssets || [])];
          const selectedImages = allAssets
            .filter(
              (a) =>
                newData.selectedAssetIds.includes(a.id) && a.type === "image",
            )
            .map((a) => a.url);

          setEdges((eds) => {
            eds
              .filter((e) => e.source === id)
              .forEach((edge) => {
                const targetIdx = finalNodes.findIndex(
                  (n) => n.id === edge.target,
                );
                const targetNode = finalNodes[targetIdx];
                if (
                  targetNode?.type === "imageNode" ||
                  targetNode?.type === "videoNode"
                ) {
                  const currentAttached =
                    (targetNode.data.attachedImages as string[]) || [];
                  if (
                    JSON.stringify(currentAttached) !==
                    JSON.stringify(selectedImages)
                  ) {
                    finalNodes[targetIdx] = {
                      ...targetNode,
                      data: {
                        ...targetNode.data,
                        attachedImages: selectedImages,
                      },
                    };
                  }
                }
              });
            return eds;
          });
        }

        // Sync Case 2: Image/Video Node -> Disconnect Upstream if invalid
        if (
          (triggerNode.type === "imageNode" ||
            triggerNode.type === "videoNode") &&
          newData.attachedImages
        ) {
          const attachedImages = newData.attachedImages as string[];
          setEdges((eds) => {
            return eds.filter((e) => {
              if (e.target !== id) return true;
              const sourceNode = finalNodes.find((n) => n.id === e.source);
              if (!sourceNode) return true;

              if (sourceNode.type === "assetNode") {
                const allAssets = [...(assets || []), ...(sourceNode.data.localAssets || [])] as any[];
                const selectedIds = (sourceNode.data.selectedAssetIds ||
                  []) as string[];
                const sourceUrls = allAssets
                  .filter((a) => selectedIds.includes(a.id))
                  .map((a) => a.url);
                if (sourceUrls.length === 0) return true;
                return sourceUrls.some((url) => attachedImages.includes(url));
              } else if (sourceNode.type === "imageNode") {
                const sourceSrc = sourceNode.data.imageSrc as string;
                return !sourceSrc || attachedImages.includes(sourceSrc);
              }
              return true;
            });
          });
        }

        // Sync Case 3: Image Node output -> Downstream Image Nodes
        if (
          triggerNode.type === "imageNode" &&
          "imageSrc" in newData &&
          oldNodeData.imageSrc !== newData.imageSrc
        ) {
          const newSrc = newData.imageSrc as string | null;
          const oldSrc = oldNodeData.imageSrc as string | null;

          setEdges((eds) => {
            eds
              .filter((e) => e.source === id)
              .forEach((edge) => {
                const targetIdx = finalNodes.findIndex(
                  (n) => n.id === edge.target,
                );
                const targetNode = finalNodes[targetIdx];
                if (targetNode?.type === "imageNode") {
                  const currentAttached =
                    (targetNode.data.attachedImages as string[]) || [];
                  let newAttached = [...currentAttached];
                  if (oldSrc && newAttached.includes(oldSrc)) {
                    newAttached = newSrc
                      ? newAttached.map((src) =>
                          src === oldSrc ? newSrc : src,
                        )
                      : newAttached.filter((src) => src !== oldSrc);
                  } else if (newSrc && !newAttached.includes(newSrc)) {
                    newAttached.push(newSrc);
                  }

                  if (
                    JSON.stringify(currentAttached) !==
                    JSON.stringify(newAttached)
                  ) {
                    finalNodes[targetIdx] = {
                      ...targetNode,
                      data: { ...targetNode.data, attachedImages: newAttached },
                    };
                  }
                }
              });
            return eds;
          });
        }

        // Sync Case 4: Node content -> Downstream Extracted Image Nodes content
        if ("content" in newData && oldNodeData.content !== newData.content) {
          setEdges((eds) => {
            eds
              .filter((e) => e.source === id)
              .forEach((edge) => {
                const targetIdx = finalNodes.findIndex(
                  (n) => n.id === edge.target,
                );
                const targetNode = finalNodes[targetIdx];
                if (
                  targetNode?.type === "imageNode" &&
                  targetNode.data.isExtracted
                ) {
                  if (targetNode.data.content !== newData.content) {
                    finalNodes[targetIdx] = {
                      ...targetNode,
                      data: { ...targetNode.data, content: newData.content },
                    };
                  }
                } else if (targetNode?.type === "textNode") {
                  if (targetNode.data.content !== newData.content) {
                    finalNodes[targetIdx] = {
                      ...targetNode,
                      data: { ...targetNode.data, content: newData.content },
                    };
                  }
                }
              });
            return eds;
          });
        }

        return finalNodes;
      });
    },
    [setNodes, setEdges],
  );

  const handleSelectConnected = useCallback(
    (nodeId: string) => {
      const currentEdges = getEdges();

      // Create adjacency list for faster traversal
      const adj = new Map<string, string[]>();
      currentEdges.forEach((e) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source)!.push(e.target);
        adj.get(e.target)!.push(e.source);
      });

      // BFS/DFS to find all connected nodes (undirected component)
      const connectedSet = new Set<string>();
      const queue = [nodeId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (connectedSet.has(currentId)) continue;

        connectedSet.add(currentId);

        const neighbors = adj.get(currentId);
        if (neighbors) {
          for (const neighbor of neighbors) {
            if (!connectedSet.has(neighbor)) {
              queue.push(neighbor);
            }
          }
        }
      }

      setNodes((nds) => {
        return nds.map((n) => ({
          ...n,
          selected: connectedSet.has(n.id),
        }));
      });
      setTempGroupingActive(true);
    },
    [getEdges, setNodes],
  );

  const onNodeDragStop = useCallback(() => {
    takeSnapshot();
    if (tempGroupingActive) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: false,
        })),
      );
      setTempGroupingActive(false);
    }
  }, [tempGroupingActive, setNodes]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      // Small delay to allow onNodeDragStop to fire if it's a drag
      setTimeout(() => {
        if (tempGroupingActive) {
          setNodes((nds) =>
            nds.map((n) => ({
              ...n,
              selected: false,
            })),
          );
          setTempGroupingActive(false);
        }
      }, 50);
    };

    if (tempGroupingActive) {
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [tempGroupingActive, setNodes]);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) =>
      setEdges((els) =>
        addEdge(
          { ...newConnection, ...defaultEdgeOptions },
          els.filter((e) => e.id !== oldEdge.id),
        ),
      ),
    [defaultEdgeOptions],
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      connectionHandledRef.current = true;
      takeSnapshot();
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));

      // Implementation: Pass source node data to target node as input
      // This allows nodes to "consume" the output of the previous node
      setNodes((nds) => {
        const sourceNode = nds.find((n) => n.id === params.source);
        const targetNode = nds.find((n) => n.id === params.target);

        if (!sourceNode || !targetNode) return nds;

        const updatedNodes = [...nds];
        const targetIndex = updatedNodes.findIndex(
          (n) => n.id === targetNode.id,
        );

        if (targetIndex === -1) return nds;

        const newTargetData = { ...(updatedNodes[targetIndex].data as Record<string, any>) };
        let changed = false;

        // Different behavior based on target node type
        if (
          targetNode.type === "imageNode" ||
          targetNode.type === "videoNode"
        ) {
          if (newTargetData.isExtracted) {
            // For extracted image node, copy content and images from whatever source
            if (
              sourceNode.data.content &&
              sourceNode.data.content !== newTargetData.content
            ) {
              newTargetData.content = sourceNode.data.content;
              changed = true;
            }

            const currentAttached =
              (newTargetData.attachedImages as string[]) || [];
            const newAttached = [...currentAttached];
            let imagesAdded = false;

            if (sourceNode.type === "imageNode" && sourceNode.data.imageSrc) {
              if (!newAttached.includes(sourceNode.data.imageSrc as string)) {
                newAttached.push(sourceNode.data.imageSrc as string);
                imagesAdded = true;
              }
            }
            if (sourceNode.data.attachedImages) {
              (sourceNode.data.attachedImages as string[]).forEach((src) => {
                if (!newAttached.includes(src)) {
                  newAttached.push(src);
                  imagesAdded = true;
                }
              });
            }
            if (sourceNode.type === "assetNode") {
              const allAssets = [...(assets || []), ...((sourceNode.data.localAssets as any[]) || [])] as any[];
              const selectedAssetIds = (sourceNode.data.selectedAssetIds ||
                []) as string[];
              const selectedUrls = allAssets
                .filter((a) => selectedAssetIds.includes(a.id))
                .map((a) => a.url);

              selectedUrls.forEach((url) => {
                if (!newAttached.includes(url)) {
                  newAttached.push(url);
                  imagesAdded = true;
                }
              });
            }

            if (imagesAdded) {
              newTargetData.attachedImages = newAttached;
              changed = true;
            }
          } else {
            // Normal image node logic
            if (sourceNode.type === "imageNode" && sourceNode.data.imageSrc) {
              const currentAttached =
                (newTargetData.attachedImages as string[]) || [];
              const src = sourceNode.data.imageSrc as string;
              if (!currentAttached.includes(src)) {
                newTargetData.attachedImages = [...currentAttached, src];
                changed = true;
              }
            } else if (sourceNode.type === "assetNode") {
              const allAssets = [...(assets || []), ...((sourceNode.data.localAssets as any[]) || [])] as any[];
              const selectedAssetIds = (sourceNode.data.selectedAssetIds ||
                []) as string[];
              const selectedUrls = allAssets
                .filter((a) => selectedAssetIds.includes(a.id))
                .map((a) => a.url);

              if (selectedUrls.length > 0) {
                const currentAttached =
                   (newTargetData.attachedImages as string[]) || [];
                const newAttached = [...currentAttached];
                selectedUrls.forEach((url) => {
                  if (!newAttached.includes(url)) newAttached.push(url);
                });

                if (
                  JSON.stringify(currentAttached) !==
                  JSON.stringify(newAttached)
                ) {
                  newTargetData.attachedImages = newAttached;
                  changed = true;
                }
              }
            }
          }
        } else if (targetNode.type === "assetNode") {
          if (sourceNode.type === "imageNode" && sourceNode.data.imageSrc) {
            if (onSaveAssetRef.current) {
              onSaveAssetRef.current(
                sourceNode.data.imageSrc as string,
                "image",
              );
            }
          } else if (sourceNode.type === "assetNode") {
            // Merge AssetNodes: take selected assets from source and add to target
            const sourceAllAssets = [...(assets || []), ...((sourceNode.data.localAssets as any[]) || [])] as any[];
            const sourceSelectedIds = (sourceNode.data.selectedAssetIds || []) as string[];
            const sourceSelectedAssets = sourceAllAssets.filter(a => sourceSelectedIds.includes(a.id));
            
            const targetLocalAssets = (newTargetData.localAssets || []) as any[];
            const targetSelectedAssetIds = (newTargetData.selectedAssetIds || []) as string[];
            
            let targetChanged = false;
            const newLocalAssets = [...targetLocalAssets];
            const newSelectedIds = [...targetSelectedAssetIds];
            
            sourceSelectedAssets.forEach(sa => {
              // If it's a global asset, just add its ID if not present
              const isGlobal = (assets || []).some(ga => ga.id === sa.id);
              if (isGlobal) {
                if (!newSelectedIds.includes(sa.id)) {
                  newSelectedIds.push(sa.id);
                  targetChanged = true;
                }
              } else {
                // It's a local asset from source. We need to copy it to target's local assets
                // unless it already exists by URL
                const exists = [...(assets || []), ...newLocalAssets].some(a => a.url === sa.url);
                if (!exists) {
                  const newSa = { ...sa, id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` };
                  newLocalAssets.push(newSa);
                  newSelectedIds.push(newSa.id);
                  targetChanged = true;
                }
              }
            });
            
            if (targetChanged) {
              newTargetData.localAssets = newLocalAssets;
              newTargetData.selectedAssetIds = newSelectedIds;
              changed = true;
            }
          }
        } else if (targetNode.type === "textNode") {
          if (
            sourceNode.data.content &&
            sourceNode.data.content !== newTargetData.content
          ) {
            newTargetData.content = sourceNode.data.content;
            changed = true;
          }
        }

        if (changed) {
          updatedNodes[targetIndex] = {
            ...updatedNodes[targetIndex],
            data: newTargetData,
          };
          // Trigger downstream updates if needed
          setTimeout(() => handleNodeChange(targetNode.id, newTargetData), 0);
        }

        return updatedNodes;
      });
    },
    [handleNodeChange, defaultEdgeOptions],
  );
  const onConnectStart = useCallback(
    (event: any, { nodeId, handleId, handleType }: any) => {
      connectionHandledRef.current = false;
      connectingNodeId.current = nodeId;
      connectingHandleId.current = handleId;
      connectingHandleType.current = handleType;

      const clientX = event.clientX ?? event.touches?.[0]?.clientX;
      const clientY = event.clientY ?? event.touches?.[0]?.clientY;
      connectionStartPos.current = { x: clientX, y: clientY };
    },
    [],
  );

  const openMenu = useCallback(
    (
      clientX: number,
      clientY: number,
      sourceParams?: {
        nodeId: string;
        handleId: string | null;
        handleType: string;
      },
    ) => {
      if (!reactFlowWrapper.current || !rfInstance) return;

      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const flowPos = rfInstance.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      setMenu({ x, y, flowPos, sourceParams });
      lastConnectionEndRef.current = Date.now();
    },
    [rfInstance],
  );

  const onConnectEnd = useCallback(
    (event: any) => {
      if (
        connectionHandledRef.current ||
        !connectingNodeId.current ||
        !rfInstance
      ) {
        connectingNodeId.current = null;
        connectingHandleId.current = null;
        connectingHandleType.current = null;
        return;
      }

      const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX;
      const clientY = event.clientY ?? event.changedTouches?.[0]?.clientY;

      if (clientX === undefined || clientY === undefined) {
        connectingNodeId.current = null;
        connectingHandleId.current = null;
        connectingHandleType.current = null;
        connectionStartPos.current = null;
        return;
      }

      // Distance check to prevent menu on simple clicks (10px threshold)
      if (connectionStartPos.current) {
        const dx = clientX - connectionStartPos.current.x;
        const dy = clientY - connectionStartPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 10) {
          connectingNodeId.current = null;
          connectingHandleId.current = null;
          connectingHandleType.current = null;
          connectionStartPos.current = null;
          return;
        }
      }

      // Check what elements are at this point (detect if dropped on a node)
      const elements = document.elementsFromPoint(clientX, clientY);
      const nodeElement = elements.find((el) =>
        el.closest(".react-flow__node"),
      );
      const targetNodeId = nodeElement
        ?.closest(".react-flow__node")
        ?.getAttribute("data-id");

      if (targetNodeId && targetNodeId !== connectingNodeId.current) {
        // It landed on a node but not exactly on a handle
        const sourceId = connectingNodeId.current;
        const sourceHandle = connectingHandleId.current;
        const sourceHandleType = connectingHandleType.current;

        const isFromSource = sourceHandleType === "source";

        const targetNode = rfInstance.getNode(targetNodeId);
        const targetHandle = isFromSource
          ? [
              "imageNode",
              "videoNode",
              "textNode",
              "assetNode",
              "textExtractionNode",
            ].includes(targetNode?.type || "")
            ? "left"
            : "top"
          : sourceHandle || undefined;

        onConnect({
          source: isFromSource ? sourceId : targetNodeId,
          sourceHandle: isFromSource ? sourceHandle || undefined : undefined,
          target: isFromSource ? targetNodeId : sourceId,
          targetHandle: targetHandle,
        } as any);

        connectionHandledRef.current = true;
        document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      } else if (!targetNodeId) {
        // It landed on blank space
        openMenu(clientX, clientY, {
          nodeId: connectingNodeId.current,
          handleId: connectingHandleId.current,
          handleType: connectingHandleType.current!,
        });
      }

      connectingNodeId.current = null;
      connectingHandleId.current = null;
      connectingHandleType.current = null;
    },
    [rfInstance, onConnect, openMenu],
  );

  const handleUploadImage = useCallback(
    (id: string, imageSrc: string) => {
      setNodes((nds) => {
        const node = nds.find((n) => n.id === id);
        if (node) {
          const currentSrcs = (node.data.imageSrcs as string[]) || [];
          handleNodeChange(id, {
            imageSrc,
            imageSrcs: [imageSrc, ...currentSrcs],
          });
        }
        return nds;
      });
    },
    [handleNodeChange],
  );

  // Make sure edge additions get the delete callback
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: { ...e.data, onDelete: handleDeleteEdge },
      })),
    );
  }, [handleDeleteEdge]);

  const handleDoubleClickWrapper = useCallback(
    (event: any) => {
      if (!rfInstance) return;

      // Check if it's really the pane or background (not node/edge)
      const target = event.target as HTMLElement;
      const isNode = target.closest(".react-flow__node");
      const isEdge = target.closest(".react-flow__edge");
      const isHandle = target.closest(".react-flow__handle");
      const isControl =
        target.closest(".react-flow__controls") ||
        target.closest(".react-flow__minimap");

      if (!isNode && !isEdge && !isHandle && !isControl) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
        openMenu(event.clientX, event.clientY);
      }
    },
    [rfInstance, openMenu],
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  const onPaneClick = useCallback(
    (event: any) => {
      if (placingNodeType && rfInstance) {
        const position = rfInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addNode(placingNodeType, position);
        setPlacingNodeType(null);
        return;
      }
      if (nodeMenuOpen) {
        setNodeMenuOpen(false);
      }
      setActiveSidebarPanel((prev) => (prev !== "none" ? "none" : prev));
      setIsChatOpen(false);

      // If double click, handle it
      if (event.detail === 2) {
        handleDoubleClickWrapper(event);
        return;
      }

      // If we just opened the menu from onConnectEnd, don't close it immediately
      const timeSinceConnectEnd = Date.now() - lastConnectionEndRef.current;
      if (timeSinceConnectEnd < 100) {
        return;
      }

      closeMenu();
    },
    [
      handleDoubleClickWrapper,
      closeMenu,
      placingNodeType,
      rfInstance,
      nodeMenuOpen,
    ],
  );

  const onPaneMouseMove = useCallback(
    (event: any) => {
      if (placingNodeType) {
        setMousePos({ x: event.clientX, y: event.clientY });
      }
    },
    [placingNodeType],
  );

  const onPaneContextMenu = useCallback(
    (event: any) => {
      if (!rfInstance) return;
      event.preventDefault();
      openMenu(event.clientX, event.clientY);
    },
    [rfInstance, openMenu],
  );

  const handleExtractText = useCallback(async (id: string, url: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                isExtracting: true,
                error: "",
                audioUrl: "",
                content: "",
              },
            }
          : n,
      ),
    );
    try {
      const result = await parseVideoAndExtractText(url, apiKeyRef.current);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  isExtracting: false,
                  audioUrl: result.audioUrl,
                  content: result.transcript,
                },
              }
            : n,
        ),
      );

      // Save audio to history
      if (result.audioUrl && onUpdateHistoryRef.current) {
        onUpdateHistoryRef.current({
          id: uuidv4(),
          type: "audio",
          url: result.audioUrl,
          timestamp: Date.now(),
        });
      }
    } catch (e: any) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  isExtracting: false,
                  error: e.message || "提取失败",
                },
              }
            : n,
        ),
      );
    }
  }, []);

  const handleSwitchToAsset = useCallback(
    (id: string, url: string) => {
      // 1. Save to assets first (if callback exists)
      if (onSaveAsset) {
        onSaveAsset(url, "image");
      }

      // 2. Transform ImageNode to AssetNode
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            // Need to find the newly created asset or just use the URL
            // Actually, AssetNode expects selectedAssetIds and matches them against allAssets.
            // It's better to create a new AssetNode with this image.
            // But since onSaveAsset might take time to populate the global assets list,
            // we might need to wait or just handle it gracefully.

            // For now, let's create a "virtual" asset if it's not in the list yet
            const tempId = `temp-${uuidv4()}`;
            const newAsset = {
              id: tempId,
              url,
              type: "image" as const,
              name: "新素材",
            };

            return {
              ...n,
              type: "assetNode",
              data: {
                ...n.data,
                title: "资产块",
                selectedAssetIds: [tempId],
                localAssets: [newAsset],
              },
            };
          }
          return n;
        }),
      );
    },
    [onSaveAsset, assets],
  );

  const handleExtract = useCallback(async (id: string) => {
    let hasInitiated = false;
    setNodes((currentNodes) => {
      const mainNode = currentNodes.find((n) => n.id === id);
      if (!mainNode || !mainNode.data.script || mainNode.data.isExtracting)
        return currentNodes;

      if (!hasInitiated) {
        hasInitiated = true;
        // Start extraction asynchronously outside the setState
        setTimeout(
          () =>
            performExtraction(
              id,
              mainNode.data.script as string,
              mainNode.data.extractParams,
            ),
          0,
        );
      }

      return currentNodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, isExtracting: true } } : n,
      );
    });
  }, []);

  const performExtraction = async (
    id: string,
    scriptText: string,
    extractParams: any = {},
  ) => {
    let thinkingText = "";
    let resultText = "";

    const updateProcessNode = (newThinking: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  thinking: newThinking,
                },
              }
            : n,
        ),
      );
    };

    try {
      const response = await callGeminiStreamAPI(
        [{ role: "user", content: scriptText }],
        "seedance",
        "gemini-3.1-pro-preview",
        apiKeyRef.current,
        "素材提取",
        (chunk) => {
          resultText = chunk;
        },
        (thinking) => {
          thinkingText = thinking;
          updateProcessNode(thinkingText);
        },
        new AbortController().signal,
      );

      // Parsing the final result text into segments
      const segments = response.text
        .replace(/```[a-z]*\n?/gi, "")
        .split(/(?:\r?\n){2,}/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      segments.forEach((segment, i) => {
        const lines = segment.split(/\r?\n/);
        let title = `素材分段 ${i + 1}`;
        let content = segment;

        if (lines.length > 1) {
          const firstLine = lines[0].replace(/[:：]$/, "").trim();
          if (firstLine.length < 30) {
            title = firstLine;
            content = lines.slice(1).join("\n").trim();
          }
        }

        const imageId = `extract-image-${id}-${i}`;
        // Position relative to parent - Below the thinking process
        const xOffset = 0;
        const yOffset = 800 + i * 500;

        newNodes.push({
          id: imageId,
          type: "imageNode",
          position: { x: xOffset, y: yOffset },
          // Use parentId to group them
          parentId: id,
          data: createNodeData("imageNode", {
            variant: "extracted",
            title: title,
            content: content,
            modelId: extractParams?.modelId || "gpt-image-2-all",
            ratio: extractParams?.ratio || "16:9",
            resolution: extractParams?.resolution || "1080p",
          }),
        });

        newEdges.push({
          id: `e-v-${id}-${imageId}`,
          source: id,
          sourceHandle: "extract",
          target: imageId,
          targetHandle: "left",
          hidden: true,
          ...defaultEdgeOptions,
        });
      });

      setNodes((nds) => [...nds, ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);
    } catch (e) {
      console.error("Extraction error", e);
    } finally {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, isExtracting: false } } : n,
        ),
      );
    }
  };

  const handleGeneratePrompt = useCallback(async (id: string) => {
    let hasInitiated = false;
    setNodes((currentNodes) => {
      const mainNode = currentNodes.find((n) => n.id === id);
      if (
        !mainNode ||
        !mainNode.data.script ||
        mainNode.data.isGeneratingPrompt
      )
        return currentNodes;

      if (!hasInitiated) {
        hasInitiated = true;
        setTimeout(
          () =>
            performGeneratePrompt(
              id,
              mainNode.data.script as string,
              mainNode.data.promptParams,
            ),
          0,
        );
      }
      return currentNodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, isGeneratingPrompt: true } }
          : n,
      );
    });
  }, []);

  const performGeneratePrompt = async (
    id: string,
    scriptText: string,
    promptParams: any = {},
  ) => {
    let thinkingText = "";
    let resultText = "";

    const updateProcessNode = (newThinking: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  thinking: newThinking,
                },
              }
            : n,
        ),
      );
    };

    try {
      const response = await callGeminiStreamAPI(
        [{ role: "user", content: scriptText }],
        "seedance",
        "gemini-3.1-pro-preview",
        apiKeyRef.current,
        "互动剧提示词",
        (chunk) => {
          resultText = chunk;
        },
        (thinking) => {
          thinkingText = thinking;
          updateProcessNode(thinkingText);
        },
        new AbortController().signal,
      );

      // Parsing the final result text into segments
      const segments = response.text
        .replace(/```[a-z]*\n?/gi, "")
        .split(/(?:\r?\n){2,}/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      segments.forEach((segment, i) => {
        const lines = segment.split(/\r?\n/);
        let title = `场号分段 ${i + 1}`;
        let content = segment;

        if (lines.length > 1) {
          const firstLine = lines[0].replace(/[:：]$/, "").trim();
          if (firstLine.length < 30) {
            title = firstLine;
            content = lines.slice(1).join("\n").trim();
          }
        }

        const videoId = `prompt-video-${id}-${i}`;
        // Position relative to parent - Below the thinking process
        const xOffset = 0;
        const yOffset = 800 + i * 500;

        newNodes.push({
          id: videoId,
          type: "videoNode",
          position: { x: xOffset, y: yOffset },
          parentId: id,
          data: createNodeData("videoNode", {
            variant: "extracted",
            title: title,
            content: content,
            modelId: promptParams?.modelId || "veo3.1-components",
            ratio: promptParams?.ratio || "16:9",
            resolution: promptParams?.resolution || "1080p",
            videoDurationId: promptParams?.videoDurationId || "5s",
          }),
        });

        newEdges.push({
          id: `e-v-p-${id}-${videoId}`,
          source: id,
          sourceHandle: "prompt",
          target: videoId,
          targetHandle: "left",
          hidden: true,
          ...defaultEdgeOptions,
        });
      });

      setNodes((nds) => [...nds, ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);
    } catch (e) {
      console.error("Prompt error", e);
    } finally {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, isGeneratingPrompt: false } }
            : n,
        ),
      );
    }
  };

  const handleImageGenerate = useCallback(
    async (nodeId: string, textNodeId?: string) => {
      let hasInitiated = false;
      setNodes((currentNodes) => {
        const imageNode = currentNodes.find((n) => n.id === nodeId);
        const textNode = textNodeId
          ? currentNodes.find((n) => n.id === textNodeId)
          : imageNode;
        if (!textNode || !imageNode || imageNode.data.isGenerating)
          return currentNodes;

        if (!hasInitiated) {
          hasInitiated = true;

          const userContent = textNode.data.content as string;
          const styleInfo = textNode.data.selectedStyle as
            | { name: string; content: string }
            | undefined;
          const funcInfo = textNode.data.selectedFunction as
            | { name: string; content: string }
            | undefined;

          let finalPrompt = userContent;
          if (styleInfo) finalPrompt += `\n\n${styleInfo.content}`;
          if (funcInfo) finalPrompt += `\n\n${funcInfo.content}`;

          setTimeout(
            () =>
              performImageGenerate(
                nodeId,
                finalPrompt,
                imageNode.data.ratio as string,
                imageNode.data.resolution as string,
                (imageNode.data.quality as string) || "standard",
                (imageNode.data.attachedImages as string[]) || [],
                imageNode.data.modelId as string,
                (imageNode.data.imageCount as number) || 1,
              ),
            0,
          );
        }

        return currentNodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, isGenerating: true, error: null } }
            : n,
        );
      });
    },
    [],
  );

  const handleVideoGenerate = useCallback(
    async (nodeId: string, textNodeId?: string) => {
      let hasInitiated = false;
      setNodes((currentNodes) => {
        const videoNode = currentNodes.find((n) => n.id === nodeId);
        const textNode = textNodeId
          ? currentNodes.find((n) => n.id === textNodeId)
          : videoNode;
        if (!textNode || !videoNode || videoNode.data.isGenerating)
          return currentNodes;

        if (!hasInitiated) {
          hasInitiated = true;
          setTimeout(
            () =>
              performVideoGenerate(
                nodeId,
                textNode.data.content as string,
                (videoNode.data.attachedImages as string[]) || [],
                (videoNode.data.modelId as string) || "veo3.1-components",
                (videoNode.data.ratio as string) || "16:9",
                (videoNode.data.resolution as string) || "1080p",
                (videoNode.data.duration as string) || "5s",
              ),
            0,
          );
        }

        return currentNodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, isGenerating: true, error: null } }
            : n,
        );
      });
    },
    [],
  );

  const performVideoGenerate = async (
    nodeId: string,
    textContent: string,
    attachedImages: string[],
    modelId: string,
    ratio: string,
    resolution: string,
    duration: string,
  ) => {
    try {
      const { videoUrl } = await callYunwuVideoAPI(
        textContent,
        attachedImages,
        modelId,
        ratio,
        resolution,
        duration,
        apiKeyRef.current,
      );

      handleNodeChange(nodeId, {
        isGenerating: false,
        videoSrc: videoUrl,
      });

      if (onUpdateHistoryRef.current) {
        onUpdateHistoryRef.current({
          id: uuidv4(),
          type: "video",
          url: videoUrl,
          timestamp: Date.now(),
        });
      }
    } catch (e: any) {
      console.error("Video generation error:", e);
      handleNodeChange(nodeId, {
        isGenerating: false,
        error: e.message,
      });
    }
  };

  const createNodeData = useCallback(
    (type: string, initialData: any = {}) => {
      const defaultTitle =
        type === "mainScript"
          ? "超级提示词"
          : type === "assetNode"
            ? "资产"
            : type === "textExtractionNode"
              ? "文本提取"
              : type === "textNode"
                ? "文本"
                : type === "videoNode"
                  ? "视频"
                  : "图片";

      const currentLocalAssets = (initialData.localAssets || []) as any[];
      const tempAssets = currentLocalAssets.filter((a) =>
        a.id.startsWith("temp-"),
      );

      let newSelectedIds = [...(initialData.selectedAssetIds || [])];
      const remainingTempAssets: any[] = [];
      
      tempAssets.forEach((temp) => {
        const realAsset = (assets || []).find((a) => a.url === temp.url);
        if (!realAsset) {
          remainingTempAssets.push(temp);
        } else {
          newSelectedIds = newSelectedIds.map((id) =>
            id === temp.id ? realAsset.id : id,
          );
        }
      });

      const { allAssets: _, localAssets: __, selectedAssetIds: ___, ...restInitialData } = initialData;

      return {
        title: defaultTitle,
        content: "",
        script: "",
        onChange: handleNodeChange,
        onSelectConnected: handleSelectConnected,
        onExtract: handleExtract,
        onExtractText: handleExtractText,
        onGeneratePrompt: handleGeneratePrompt,
        onGenerate:
          type === "videoNode" ? handleVideoGenerate : handleImageGenerate,
        onUpload: handleUploadImage,
        onSaveAsset: onSaveAsset,
        onSwitchToAsset: handleSwitchToAsset,
        ratio: "16:9",
        resolution: "1080p",
        quality: "standard",
        attachedImages: [],
        modelId: type === "videoNode" ? "veo3.1-components" : "gpt-image-2-all",
        ...restInitialData,
        selectedAssetIds: Array.from(new Set(newSelectedIds)),
        localAssets: remainingTempAssets,
      };
    },
    [
      assets,
      handleNodeChange,
      handleSelectConnected,
      handleExtract,
      handleExtractText,
      handleGeneratePrompt,
      handleImageGenerate,
      handleUploadImage,
      onSaveAsset,
      handleSwitchToAsset,
    ],
  );

  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (event.ctrlKey || event.metaKey) {
        // Duplication logic
        const selectedNodes = nodes.filter((n) => n.selected);
        // If the node being dragged is not in the selection, just duplicate that node
        const nodesToDuplicate = selectedNodes.some((sn) => sn.id === node.id)
          ? selectedNodes
          : [node];

        const idMap: Record<string, string> = {};
        const newNodes = nodesToDuplicate.map((n) => {
          const newId = `${n.type}-${uuidv4()}`;
          idMap[n.id] = newId;

          const cleanData = Object.fromEntries(
            Object.entries(n.data as Record<string, any>).filter(
              ([_, v]) => typeof v !== "function",
            ),
          );

          return {
            ...n,
            id: newId,
            // Position stays same as original (original will move with drag)
            selected: false,
            data: createNodeData(n.type, cleanData),
          };
        });

        const internalEdges = edges.filter(
          (e) =>
            nodesToDuplicate.some((n) => n.id === e.source) &&
            nodesToDuplicate.some((n) => n.id === e.target),
        );

        const newEdges = internalEdges.map((e) => ({
          ...e,
          id: `edge-${uuidv4()}`,
          source: idMap[e.source],
          target: idMap[e.target],
          selected: false,
          data: { ...e.data, onDelete: handleDeleteEdge },
        }));

        setNodes((nds) => [...nds, ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
      }
    },
    [nodes, edges, createNodeData, handleDeleteEdge],
  );

  const [clipboard, setClipboard] = useState<{
    nodes: Node[];
    edges: Edge[];
  } | null>(null);

  const copyNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    // If only nodes are selected, we still try to find edges between them
    let finalEdgesToCopy = [...selectedEdges];
    if (selectedNodes.length > 0) {
      const edgesBetweenSelected = edges.filter(
        (e) =>
          selectedNodes.some((n) => n.id === e.source) &&
          selectedNodes.some((n) => n.id === e.target),
      );
      // Merge unique
      edgesBetweenSelected.forEach((e) => {
        if (!finalEdgesToCopy.some((fe) => fe.id === e.id)) {
          finalEdgesToCopy.push(e);
        }
      });
    }

    setClipboard({
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(finalEdgesToCopy)),
    });
  }, [nodes, edges]);

  const cutNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    takeSnapshot();

    // Copy logic same as copyNodes
    copyNodes();

    // Delete selected
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => {
      const remainingEdges = eds.filter((e) => !e.selected);
      // Also remove edges connected to deleted nodes
      const nodeIdsToDelete = selectedNodes.map((n) => n.id);
      return remainingEdges.filter(
        (e) =>
          !nodeIdsToDelete.includes(e.source) &&
          !nodeIdsToDelete.includes(e.target),
      );
    });
  }, [nodes, edges, takeSnapshot, copyNodes, setNodes, setEdges]);

  const pasteNodes = useCallback(() => {
    if (!clipboard) return;

    const idMap: Record<string, string> = {};
    const newNodes = clipboard.nodes.map((n) => {
      const newId = `${n.type}-${uuidv4()}`;
      idMap[n.id] = newId;

      // Clean up the data from functions before passing to createNodeData
      const cleanData = Object.fromEntries(
        Object.entries(n.data as Record<string, any>).filter(
          ([_, v]) => typeof v !== "function",
        ),
      );

      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
        selected: true,
        data: createNodeData(n.type, cleanData),
      };
    });

    const newEdges = clipboard.edges.map((e) => ({
      ...e,
      id: `edge-${uuidv4()}`,
      source: idMap[e.source],
      target: idMap[e.target],
      selected: false,
      data: { ...e.data, onDelete: handleDeleteEdge },
    }));

    setNodes((nds) =>
      nds.map((n) => ({ ...n, selected: false })).concat(newNodes),
    );
    setEdges((eds) => eds.concat(newEdges));

    // Update local clipboard for repeated pasting (with further offset)
    setClipboard((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => ({
          ...n,
          position: { x: n.position.x + 40, y: n.position.y + 40 },
        })),
      };
    });
  }, [clipboard, createNodeData, handleDeleteEdge, setNodes, setEdges]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const newHistory = prev.slice(0, -1);

      const currentNodes = getNodes();
      const currentEdges = getEdges();
      
      setFuture((f) => [
        {
          nodes: JSON.parse(JSON.stringify(currentNodes)),
          edges: JSON.parse(JSON.stringify(currentEdges)),
        },
        ...f,
      ].slice(0, 30));

      setNodes(last.nodes.map(n => ({
        ...n,
        data: createNodeData(n.type, n.data)
      })));
      setEdges(last.edges.map(e => ({
        ...e,
        data: { ...e.data, onDelete: handleDeleteEdge }
      })));
      return newHistory;
    });
  }, [createNodeData, handleDeleteEdge, getNodes, getEdges, setNodes, setEdges]);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      const newFuture = prev.slice(1);

      const currentNodes = getNodes();
      const currentEdges = getEdges();

      setHistory((h) => [
        ...h,
        {
          nodes: JSON.parse(JSON.stringify(currentNodes)),
          edges: JSON.parse(JSON.stringify(currentEdges)),
        },
      ].slice(-30));

      setNodes(next.nodes.map(n => ({
        ...n,
        data: createNodeData(n.type, n.data)
      })));
      setEdges(next.edges.map(e => ({
        ...e,
        data: { ...e.data, onDelete: handleDeleteEdge }
      })));
      return newFuture;
    });
  }, [createNodeData, handleDeleteEdge, getNodes, getEdges, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        copyNodes();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        cutNodes();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        pasteNodes();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copyNodes, cutNodes, pasteNodes, undo, redo]);

  const addNode = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      const pos = position || (menu ? menu.flowPos : null);
      if (!pos) return;

      takeSnapshot();

      const newNodeId = `${type}-${uuidv4()}`;
      const newNode: Node = {
        id: newNodeId,
        type,
        position: pos,
        data: createNodeData(type),
      };

      // Use functional update to ensure connection logic sees the new node
      setNodes((nds) => {
        const nextNodes = nds.concat(newNode);

        if (menu && menu.sourceParams) {
          const { nodeId, handleId, handleType } = menu.sourceParams;
          const isNewTarget = handleType === "source";
          const targetHandleId = isNewTarget
            ? type === "imageNode"
              ? "left"
              : "top"
            : handleId || undefined;

          // We defer connection to a microtask if we want to be 100% sure the node is rendered
          // in React Flow context, but since we are within setNodes, it's safer to just call it.
          // Note: onConnect calls setEdges and setNodes again.
          setTimeout(() => {
            onConnect({
              source: isNewTarget ? nodeId : newNodeId,
              sourceHandle: isNewTarget ? handleId || undefined : undefined,
              target: isNewTarget ? newNodeId : nodeId,
              targetHandle: targetHandleId,
            } as any);

            // Force clear connection line
            document.dispatchEvent(
              new MouseEvent("mouseup", { bubbles: true }),
            );
          }, 0);
        }

        return nextNodes;
      });

      closeMenu();
    },
    [menu, rfInstance, createNodeData, onConnect, closeMenu],
  );

  const performImageGenerate = async (
    nodeId: string,
    textContent: string,
    ratio: string,
    resolution: string,
    quality: string,
    attachedImages: string[],
    modelId: string,
    count: number,
  ) => {
    try {
      // Force n=1 for the API call, we simulate concurrency by making `count` requests
      const prompt = `【要求：比例 ${ratio}，分辨率 ${resolution}，质量 ${quality}，数量 1】 ${textContent}`;
      const messages = [
        { role: "user" as const, content: prompt, images: attachedImages },
      ];

      // We execute sequentially to avoid 429 rate limit "NoCapacity" errors from the upstream API
      const results = [];
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < count; i++) {
        if (i > 0) {
          // Add a brief delay between sequential requests to let upstream breathe
          await delay(1000);
        }
        try {
          const res = await callGeminiAPI(
            messages,
            "yellowImage",
            modelId,
            apiKeyRef.current,
          );
          if (res && (res.text || res.thinking)) {
            results.push(res);
          }
        } catch (e) {
          console.error(`Error generating image ${i + 1}:`, e);
          // If this was the only requested image, or the first one failed and we have nothing else,
          // we should probably report it if subsequent ones also fail.
          // For now, we continue to try and get at least one.
        }
      }

      const generatedImageSrcs: string[] = [];

      results.forEach((result) => {
        const regex = /!\[.*?\]\((.*?)\)/g;
        let match;
        let foundAny = false;
        while ((match = regex.exec(result.text)) !== null) {
          generatedImageSrcs.push(match[1]);
          foundAny = true;
        }

        if (!foundAny) {
          const trimmed = result.text.trim();
          // Check if the response is just a URL or base64 data
          if (trimmed.startsWith("data:image/") || trimmed.startsWith("http")) {
            generatedImageSrcs.push(trimmed);
            foundAny = true;
          }
        }
      });

      if (generatedImageSrcs.length > 0) {
        const node = rfInstance?.getNode(nodeId);
        const currentSrcs = (node?.data?.imageSrcs as string[]) || [];
        const newSrcs = [...generatedImageSrcs, ...currentSrcs];

        handleNodeChange(nodeId, {
          isGenerating: false,
          imageSrcs: newSrcs,
          imageSrc: newSrcs[0],
        });

        // Save to history
        generatedImageSrcs.forEach((src) => {
          if (onUpdateHistoryRef.current) {
            onUpdateHistoryRef.current({
              id: uuidv4(),
              type: "image",
              url: src,
              timestamp: Date.now(),
            });
          }
        });
      } else {
        handleNodeChange(nodeId, { isGenerating: false });
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
      handleNodeChange(nodeId, { isGenerating: false });
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!rfInstance) return;

      takeSnapshot();

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const handleAssetsDrop = (
        assetsList: { url: string; type: string }[],
      ) => {
        const newTempAssets: any[] = [];
        const newTempSelectedIds: string[] = [];

        assetsList.forEach((asset) => {
          const tempId = `temp-${uuidv4()}`;
          newTempAssets.push({
            id: tempId,
            url: asset.url,
            type: asset.type,
            name: "拖入素材",
          });
          newTempSelectedIds.push(tempId);
        });

        const newNode: Node = {
          id: `asset-${uuidv4()}`,
          type: "assetNode",
          position,
          data: createNodeData("assetNode", {
            selectedAssetIds: newTempSelectedIds,
            localAssets: newTempAssets,
          }),
        };
        setNodes((nds) => nds.concat(newNode));
      };

      // 1. Handle Files (including from WeChat, Desktop, etc)
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        const filePromises = files.map((file) => {
          return new Promise<{ url: string; type: string; file: File }>(
            (resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const fileName = file.name.toLowerCase();
                let detectedType = "unknown";
                if (file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) {
                  detectedType = "image";
                } else if (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|aac|m4a)$/i.test(fileName)) {
                  detectedType = "audio";
                } else if (file.type.startsWith("video/") || /\.(mp4|webm|ogg|mov)$/i.test(fileName)) {
                  detectedType = "video";
                }
                
                resolve({
                  url: e.target?.result as string,
                  type: detectedType,
                  file,
                });
              };
              reader.readAsDataURL(file);
            },
          );
        });

        Promise.all(filePromises).then((results) => {
          const allMediaResults = results.filter(
            (r) =>
              r.type === "image" || r.type === "video" || r.type === "audio",
          );

          if (allMediaResults.length > 0) {
            const newTempAssets: any[] = [];
            const newTempSelectedIds: string[] = [];

            allMediaResults.forEach((asset) => {
              const tempId = `temp-${uuidv4()}`;
              newTempAssets.push({
                id: tempId,
                url: asset.url,
                type: asset.type,
                name: asset.file.name || "拖入素材",
              });
              newTempSelectedIds.push(tempId);
            });

            const newNode: Node = {
              id: `asset-${uuidv4()}`,
              type: "assetNode",
              position,
              data: createNodeData("assetNode", {
                selectedAssetIds: newTempSelectedIds,
                localAssets: newTempAssets,
              }),
            };
            setNodes((nds) => nds.concat(newNode));
          }
        });
        return;
      }

      const text = event.dataTransfer.getData("text/plain");
      const uriList = event.dataTransfer.getData("text/uri-list");
      const customType = event.dataTransfer.getData(
        "application/x-custom-type",
      );
      const dragSource = event.dataTransfer.getData("application/x-source");

      const dropUrl = text || (uriList ? uriList.split("\n")[0] : null);

      if (
        dropUrl &&
        (dropUrl.startsWith("http") ||
          dropUrl.startsWith("data:") ||
          dropUrl.startsWith("blob:"))
      ) {
        if (dragSource === "assets-area" || dragSource === "history-area") {
          const existingAsset = (assets || []).find((a) => a.url === dropUrl);
          const targetId = existingAsset ? existingAsset.id : `temp-${uuidv4()}`;

          const newNode: Node = {
            id: `asset-${uuidv4()}`,
            type: "assetNode",
            position,
            data: createNodeData("assetNode", {
              selectedAssetIds: [targetId],
              localAssets: existingAsset
                ? []
                : [
                    {
                      id: targetId,
                      url: dropUrl,
                      type: customType,
                      name: "拖入素材",
                    },
                  ],
            }),
          };
          setNodes((nds) => nds.concat(newNode));
          return;
        } else if (
          dragSource === "asset-node" ||
          dragSource === "canvas-node"
        ) {
          const existingAsset = (assets || []).find((a) => a.url === dropUrl);
          const targetId = existingAsset ? existingAsset.id : `temp-${uuidv4()}`;

          const newNode: Node = {
            id: `asset-${uuidv4()}`,
            type: "assetNode",
            position,
            data: createNodeData("assetNode", {
              selectedAssetIds: [targetId],
              localAssets: existingAsset
                ? []
                : [
                    {
                      id: targetId,
                      url: dropUrl,
                      type: customType || "image",
                      name: `画布-${customType === "image" ? "图像" : customType === "video" ? "视频" : "音频"}`,
                    },
                  ],
            }),
          };
          setNodes((nds) => nds.concat(newNode));
          return;
        } else {
          // External drop from other apps/tabs
          const url = dropUrl.trim();
          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
          const isVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
          const isAudio = /\.(mp3|wav|ogg|aac)(\?.*)?$/i.test(url);

          const type = isVideo ? "video" : isAudio ? "audio" : "image";

          const existingAsset = (assets || []).find((a) => a.url === url);
          const targetId = existingAsset ? existingAsset.id : `temp-${uuidv4()}`;

          const newNode: Node = {
            id: `asset-${uuidv4()}`,
            type: "assetNode",
            position,
            data: createNodeData("assetNode", {
              selectedAssetIds: [targetId],
              localAssets: existingAsset
                ? []
                : [
                    {
                      id: targetId,
                      url: url,
                      type: type,
                      name: "外部素材",
                    },
                  ],
            }),
          };
          setNodes((nds) => nds.concat(newNode));
          return;
        }
      }

      // 2. Handle image URL drops (e.g. from another browser tab)
      const html = event.dataTransfer.getData("text/html");
      if (html) {
        const div = document.createElement("div");
        div.innerHTML = html;
        const imgs = Array.from(div.querySelectorAll("img"))
          .map((img) => img.src)
          .filter(Boolean);
        if (imgs.length > 0) {
          const newTempAssets: any[] = [];
          const newTempSelectedIds: string[] = [];

          imgs.forEach((url) => {
            const tempId = `temp-${uuidv4()}`;
            newTempAssets.push({
              id: tempId,
              url: url,
              type: "image",
              name: "拖入素材",
            });
            newTempSelectedIds.push(tempId);
          });

          const newNode: Node = {
            id: `asset-${uuidv4()}`,
            type: "assetNode",
            position,
            data: createNodeData("assetNode", {
              selectedAssetIds: newTempSelectedIds,
              localAssets: newTempAssets,
            }),
          };
          setNodes((nds) => nds.concat(newNode));
          return;
        }
      }

      if (
        text &&
        !customType &&
        (text.startsWith("http") ||
          text.startsWith("data:") ||
          text.startsWith("blob:"))
      ) {
        const tempId = `temp-${uuidv4()}`;
        const newNode: Node = {
          id: `asset-${uuidv4()}`,
          type: "assetNode",
          position,
          data: createNodeData("assetNode", {
            selectedAssetIds: [tempId],
            localAssets: [
              {
                id: tempId,
                url: text,
                type: "image",
                name: "拖入素材",
              },
            ],
          }),
        };
        setNodes((nds) => nds.concat(newNode));
      }
    },
    [
      rfInstance,
      handleNodeChange,
      handleExtract,
      handleExtractText,
      handleGeneratePrompt,
      handleImageGenerate,
      handleUploadImage,
      onSaveAsset,
      handleSwitchToAsset,
      assets,
    ],
  );

  // Inject callbacks into loaded nodes
  const injectCallbacks = useCallback(
    (loadedNodes: Node[]) => {
      return loadedNodes.map((n) => ({
        ...n,
        data: createNodeData(n.type || "textNode", n.data),
      }));
    },
    [createNodeData],
  );

  // Inject callbacks into loaded edges
  const injectEdgeCallbacks = useCallback(
    (loadedEdges: Edge[]) => {
      return loadedEdges.map((e) => ({
        ...e,
        data: {
          ...e.data,
          onDelete: handleDeleteEdge,
        },
      }));
    },
    [handleDeleteEdge],
  );

  // Initialization
  useEffect(() => {
    if (conversation?.nodes && conversation.nodes.length > 0) {
      setNodes(injectCallbacks(conversation.nodes));
      setEdges(injectEdgeCallbacks(conversation?.edges || []));
      setTimeout(
        () => fitView({ duration: 800, maxZoom: 1, padding: 0.2 }),
        300,
      );
    } else {
      setNodes([
        {
          id: `mainScript-${uuidv4()}`,
          type: "mainScript",
          position: { x: Math.max(window.innerWidth / 2 - 250, 100), y: 50 },
          data: createNodeData("mainScript", {
            title: "默认剧本",
            script: "",
            isExtracting: false,
            isGeneratingPrompt: false,
          }),
        },
      ]);
      setEdges([]);
      setTimeout(
        () => fitView({ duration: 800, maxZoom: 1, padding: 0.2 }),
        300,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]);

  // Notify parent of changes to save history - debounced to avoid hammering parent state
  const notifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  // Notify parent of changes
  useEffect(() => {
    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
    }

    notifyTimeoutRef.current = setTimeout(() => {
      // Comparison check to avoid unnecessary notifications
      const serializedNodes = JSON.stringify(
        nodes.map((n) => ({
          id: n.id,
          type: n.type,
          pos: n.position,
          data: Object.fromEntries(
            Object.entries(n.data as any).filter(([k]) => k !== "allAssets"),
          ),
        })),
      );
      const serializedEdges = JSON.stringify(
        edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      );

      if (
        lastUpdateRef.current.nodes === serializedNodes &&
        lastUpdateRef.current.edges === serializedEdges
      ) {
        return;
      }

      lastUpdateRef.current = {
        nodes: serializedNodes,
        edges: serializedEdges,
      };

      // Stripping functions from data to ensure serializability for IndexedDB/localStorage
      const cleanNodes = nodes.map((n) => {
        const cleanData = Object.fromEntries(
          Object.entries(n.data as Record<string, any>).filter(
            ([_, v]) => typeof v !== "function",
          ),
        );
        return { ...n, data: cleanData };
      });

      const cleanEdges = edges.map((e) => {
        if (!e.data) return e;
        const cleanData = Object.fromEntries(
          Object.entries(e.data as Record<string, any>).filter(
            ([_, v]) => typeof v !== "function",
          ),
        );
        return { ...e, data: cleanData };
      });

      onUpdateCanvasRef.current &&
        onUpdateCanvasRef.current(cleanNodes, cleanEdges, "超级工作流");
    }, 300); // 300ms debounce for canvas updates

    return () => {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
      }
    };
  }, [nodes, edges]);

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 w-full h-full relative font-sans bg-[#fcfcfc]"
      onDoubleClick={handleDoubleClickWrapper}
      onContextMenu={onPaneContextMenu}
      onMouseMove={(e) => {
        if (placingNodeType) {
          setMousePos({ x: e.clientX, y: e.clientY });
        }
      }}
    >
      <CanvasContext.Provider value={{ assets: assets || [] }}>
      <ReactFlow
        onInit={setRfInstance}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onEdgeDoubleClick={(e, edge) => handleDeleteEdge(edge.id)}
        nodes={nodes}
        edges={edges}
        nodesDraggable={true}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDragStart={onNodeDragStart as any}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes as any}
        edgeTypes={edgeTypes as any}
        onNodesChange={onNodesChange as any}
        onEdgesChange={onEdgesChange as any}
        onReconnect={onReconnect}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={{ stroke: "#94a3b8", strokeWidth: 2 }}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
        minZoom={0.01}
        maxZoom={4}
        zoomOnDoubleClick={false}
        selectionMode={SelectionMode.Partial}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
      >
        <Panel
          position="top-left"
          className="m-4 flex items-start gap-2"
          style={{ marginLeft: sidebarOpen ? "70px" : "20px" }}
        >
          <div
            className={`bg-white/80 backdrop-blur-md border border-neutral-200 text-neutral-900 shadow-sm p-1.5 rounded-lg ${sidebarOpen ? "flex md:hidden" : "flex"}`}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 border-none bg-transparent text-neutral-900 cursor-pointer flex-shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="hidden md:block p-1 rounded-md hover:bg-neutral-50 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer flex-shrink-0"
                title="展开边栏"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="bg-white/80 backdrop-blur-md border border-neutral-200 shadow-sm px-3 py-1.5 rounded-lg max-w-[200px] sm:max-w-[280px] group flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-800 truncate">
                {conversation?.title || "未命名项目"}
              </span>
              {conversation?.description && (
                <span className="text-[11px] text-neutral-400 truncate max-w-[80px] sm:max-w-[120px] hidden sm:inline-block border-l border-neutral-200 pl-2">
                  {conversation.description}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setEditProjectTitle(conversation?.title || "");
                setEditProjectDesc(conversation?.description || "");
                setEditProjectModalOpen(true);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer border-none bg-transparent flex-shrink-0"
              title="编辑项目信息"
            >
              <Pencil size={12} />
            </button>
          </div>
        </Panel>
        <Background
          color="#e5e5e5"
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />
        <Controls />
      </ReactFlow>
      </CanvasContext.Provider>

      {/* Ghost Node for Placing */}
      {placingNodeType && (
        <div
          className="fixed pointer-events-none z-50 animate-in fade-in zoom-in duration-200 opacity-60"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xl w-64 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-neutral-500">
              {placingNodeType === "mainScript" && (
                <>
                  <FileText size={18} />{" "}
                  <span className="font-medium text-sm">剧本节点</span>
                </>
              )}
              {placingNodeType === "imageNode" && (
                <>
                  <ImageIcon size={18} />{" "}
                  <span className="font-medium text-sm">图像节点</span>
                </>
              )}
              {placingNodeType === "videoNode" && (
                <>
                  <Video size={18} />{" "}
                  <span className="font-medium text-sm">视频节点</span>
                </>
              )}
              {placingNodeType === "textNode" && (
                <>
                  <span className="font-serif text-lg leading-none">T</span>{" "}
                  <span className="font-medium text-sm">文本节点</span>
                </>
              )}
            </div>
            <div className="text-xs text-neutral-400">点击画布放置节点...</div>
          </div>
        </div>
      )}

      {/* Floating Toolbar on the Left */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center bg-white border-neutral-200 text-neutral-600 rounded-2xl shadow-xl shadow-black/20 border border-neutral-200 p-2 gap-1.5 isolate">
        <div
          className="relative"
          onMouseEnter={() => setNodeMenuOpen(true)}
          onMouseLeave={() => setNodeMenuOpen(false)}
        >
          <button
            className="p-3 bg-white text-neutral-900 rounded-xl hover:bg-neutral-200 transition-colors shadow-sm relative group cursor-pointer mb-2"
            title="新建节点"
          >
            <Plus size={22} />
          </button>

          {nodeMenuOpen && (
            <div className="absolute left-full top-0 pl-4 z-50">
              <div className="p-2 bg-white border-neutral-200 rounded-xl shadow-xl border flex gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                <button
                  onClick={() => {
                    setPlacingNodeType("mainScript");
                    setNodeMenuOpen(false);
                  }}
                  className="p-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg whitespace-nowrap flex flex-col items-center gap-1 cursor-pointer"
                >
                  <FileText size={20} />
                  <span className="text-xs">脚本</span>
                </button>
                <button
                  onClick={() => {
                    setPlacingNodeType("imageNode");
                    setNodeMenuOpen(false);
                  }}
                  className="p-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg whitespace-nowrap flex flex-col items-center gap-1 cursor-pointer"
                >
                  <ImageIcon size={20} />
                  <span className="text-xs">图像</span>
                </button>
                <button
                  onClick={() => {
                    setPlacingNodeType("videoNode");
                    setNodeMenuOpen(false);
                  }}
                  className="p-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg whitespace-nowrap flex flex-col items-center gap-1 cursor-pointer"
                >
                  <Video size={20} />
                  <span className="text-xs">视频</span>
                </button>
                <button
                  onClick={() => {
                    setPlacingNodeType("textNode");
                    setNodeMenuOpen(false);
                  }}
                  className="p-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg whitespace-nowrap flex flex-col items-center gap-1 cursor-pointer"
                >
                  <span className="font-serif text-lg leading-none">T</span>
                  <span className="text-xs">文本</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className="relative"
          onMouseEnter={() => {
            setActiveSidebarPanel("assets");
            setNodeMenuOpen(false);
          }}
          onMouseLeave={() => setActiveSidebarPanel("none")}
        >
          <button
            className={`p-2.5 rounded-xl hover:bg-neutral-100/50 hover:text-neutral-900 transition-colors cursor-pointer relative group flex items-center justify-center ${activeSidebarPanel === "assets" ? "bg-neutral-100/50 text-neutral-900 shadow-lg" : ""}`}
            title="资产"
          >
            <FolderOpen size={20} />
            {activeSidebarPanel !== "assets" && (
              <div className="absolute left-full ml-4 bg-white border-neutral-200 text-white text-xs py-1.5 px-3 rounded-lg whitespace-nowrap shadow-xl border border-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                资产
              </div>
            )}
          </button>

          {activeSidebarPanel === "assets" && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 pl-4 z-50">
              <div className="w-[320px] max-h-[450px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-neutral-200 flex flex-col animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-200 origin-left">
                <div className="p-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 rounded-t-2xl">
                  <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                    <FolderOpen size={16} className="text-purple-500" />
                    项目资产
                  </h2>
                  <div className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {assets?.length || 0} 个项目
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                  {!assets || assets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-neutral-400 gap-2">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                        <FolderOpen size={18} className="opacity-40" />
                      </div>
                      <span className="text-[11px]">
                        暂无资产，生成后将显示在此
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {assets?.map((asset: any, i: number) => (
                        <AssetMediaItemCanvas
                          key={i}
                          asset={asset}
                          onDelete={onDeleteAsset}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="relative"
          onMouseEnter={() => {
            setActiveSidebarPanel("history");
            setNodeMenuOpen(false);
          }}
          onMouseLeave={() => setActiveSidebarPanel("none")}
        >
          <button
            className={`p-2.5 rounded-xl hover:bg-neutral-100/50 hover:text-neutral-900 transition-colors cursor-pointer relative group flex items-center justify-center ${activeSidebarPanel === "history" ? "bg-neutral-100/50 text-neutral-900 shadow-lg" : ""}`}
            title="历史记录"
          >
            <History size={20} />
            {activeSidebarPanel !== "history" && (
              <div className="absolute left-full ml-4 bg-white border-neutral-200 text-white text-xs py-1.5 px-3 rounded-lg whitespace-nowrap shadow-xl border border-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                历史记录
              </div>
            )}
          </button>

          {activeSidebarPanel === "history" && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 pl-4 z-50">
              <div className="w-[360px] max-h-[500px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-neutral-200 flex flex-col animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-200 origin-left">
                <div className="p-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 rounded-t-2xl">
                  <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                    <History size={16} className="text-blue-500" />
                    历史生成记录
                  </h2>
                  <div className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {conversation?.history?.length || 0} 条
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                  {!conversation?.history ||
                  conversation.history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-neutral-400 gap-2">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                        <History size={18} className="opacity-40" />
                      </div>
                      <span className="text-[11px]">暂无历史记录</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {conversation.history.map((item: any, i: number) => (
                        <div
                          key={i}
                          className="rounded-xl border border-neutral-200/50 overflow-hidden shadow-sm bg-neutral-50 hover:bg-neutral-100 hover:border-blue-300 hover:shadow-md transition-all group relative cursor-pointer"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", item.url);
                            e.dataTransfer.setData(
                              "application/x-custom-type",
                              item.type,
                            );
                            e.dataTransfer.setData(
                              "application/x-source",
                              "history-area",
                            );
                          }}
                          onClick={() => {
                            if (item.type === "image") {
                              onSaveAsset?.(item.url, "image");
                            }
                          }}
                        >
                          {item.type === "image" && (
                            <div className="w-full aspect-video p-1 pb-0">
                              <img
                                src={item.url}
                                alt="History item"
                                className="w-full h-full object-cover rounded-t-lg"
                              />
                            </div>
                          )}
                          {(item.type === "video" || item.type === "audio") && (
                            <HistoryMediaItem item={item} />
                          )}
                          <div className="px-3 py-2 text-[10px] text-neutral-500 flex justify-between items-center bg-white border-t border-neutral-200">
                            <span>
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                            <span className="capitalize px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[9px] font-medium text-neutral-400">
                              {item.type}
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
                              点击保存至资产
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-8 h-px bg-white/10 my-1"></div>

        <button
          onClick={handleShareProject}
          className="p-2.5 rounded-xl hover:bg-neutral-100/50 hover:text-neutral-900 transition-colors cursor-pointer"
          title="分享项目"
        >
          <Share2 size={20} />
        </button>
        <div className="relative">
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2.5 rounded-xl hover:bg-neutral-100/50 hover:text-neutral-900 transition-colors cursor-pointer ${isChatOpen ? "bg-neutral-100/50 text-neutral-900" : ""}`}
            title="AI对话"
          >
            <MessageCircle size={20} />
          </button>

          {isChatOpen && (
            <div className="absolute left-full bottom-0 pl-4 z-50">
              <div className="w-[360px] h-[350px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-neutral-200 flex flex-col animate-in fade-in zoom-in-95 duration-200 origin-bottom-left">
                <div className="p-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 rounded-t-2xl">
                  <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                    <MessageCircle size={16} className="text-blue-500" />
                    AI 对话助手
                  </h2>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-thin">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-2">
                      <MessageCircle size={32} className="opacity-20" />
                      <span className="text-sm">你可以向AI助手提问</span>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`p-2.5 rounded-xl text-sm max-w-[85%] relative whitespace-pre-wrap ${msg.role === "user" ? "bg-blue-500 text-white shadow-md" : "bg-white border border-neutral-200 shadow-sm text-neutral-800"}`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>

                <form
                  onSubmit={handleChatSubmit}
                  className="p-3 border-t border-neutral-200 bg-neutral-50/50 rounded-b-2xl flex gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="输入内容..."
                    className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isChatting}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatting}
                    className="bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-blue-600 transition-colors"
                  >
                    发送
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {menu && (
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          style={{ top: menu.y, left: menu.x }}
          className="absolute z-50 bg-white shadow-2xl rounded-xl border border-neutral-200 overflow-hidden min-w-[200px] animate-in fade-in zoom-in duration-150 cursor-default"
        >
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none"
          >
            <Plus size={14} className="text-neutral-500" />
            <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">
              新建节点
            </span>
          </div>
          <div className="p-1 space-y-0.5">
            <button
              onClick={() => addNode("mainScript")}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-md bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-200 transition-colors">
                <Layout size={18} />
              </div>
              <div>
                <div className="text-[14px] font-bold text-red-600">
                  超级提示词
                </div>
                <div className="text-[11px] text-red-400">主创作者流入口</div>
              </div>
            </button>

            <div className="h-px bg-neutral-100 my-1 mx-2" />

            <button
              onClick={() => addNode("assetNode")}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-neutral-200 transition-colors">
                <Search size={18} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-black">资产</div>
                <div className="text-[10px] text-neutral-400">
                  管理角色与物体 assets
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode("imageNode")}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                <ImageIcon size={18} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-black">图片</div>
                <div className="text-[10px] text-indigo-400">
                  生成剧照与背景图
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode("videoNode")}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                <Video size={18} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-black">视频</div>
                <div className="text-[10px] text-blue-400">
                  将动效应用到画面
                </div>
              </div>
            </button>

            <button
              onClick={() => addNode("textNode")}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-neutral-200 transition-colors">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-black">文本</div>
                <div className="text-[10px] text-neutral-400">
                  记录说明或提示词
                </div>
              </div>
            </button>

            <div className="h-px bg-neutral-100 my-1 mx-2" />

            <button
              onClick={() => addNode("textExtractionNode")}
              className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-neutral-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer group text-left"
            >
              <div className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-400">
                <MousePointer2 size={14} />
              </div>
              <div className="text-[12px] text-black font-medium">
                高级: 提取工具
              </div>
            </button>
          </div>
        </motion.div>
      )}

      {/* Edit Project Modal */}
      {editProjectModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl shadow-neutral-200/50 border border-neutral-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">修改项目信息</h3>
              <button
                onClick={() => setEditProjectModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-400 border-none bg-transparent cursor-pointer p-1 rounded-md hover:bg-neutral-100 transition-colors"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  项目名称
                </label>
                <input
                  type="text"
                  value={editProjectTitle}
                  onChange={(e) => setEditProjectTitle(e.target.value)}
                  autoFocus
                  placeholder="项目名称"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-inherit transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  项目简介 (可选)
                </label>
                <textarea
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  placeholder="项目简介内容..."
                  rows={3}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 border-inherit transition-all resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-2">
              <button
                onClick={() => setEditProjectModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-400 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (editProjectTitle.trim() && onUpdateProjectInfo) {
                    onUpdateProjectInfo(
                      editProjectTitle.trim(),
                      editProjectDesc.trim(),
                    );
                    setEditProjectModalOpen(false);
                  }
                }}
                disabled={!editProjectTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CanvasDramaArea(props: {
  apiKey: string;
  currentModelId?: string;
  conversations?: Record<string, any>;
  setCurrentConvId?: (id: string | null) => void;
  createNewProject?: (title: string, description: string) => void;
  conversation?: any;
  onUpdateCanvas?: (nodes: Node[], edges: Edge[], title: string) => void;
  onUpdateProjectInfo?: (title: string, description: string) => void;
  onUpdateHistory?: (historyItem: {
    id: string;
    type: "image" | "audio" | "video";
    url: string;
    timestamp: number;
  }) => void;
  onSaveAsset?: (url: string, type: "image" | "audio") => void;
  onDeleteAsset?: (id: string) => void;
  assets?: any[];
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  if (!props.conversation) {
    const dramaProjects = props.conversations
      ? Object.values(props.conversations).filter(
          (c: any) => c.func === "canvasDrama",
        )
      : [];

    return (
      <div className="flex-1 w-full h-full relative font-sans flex items-center justify-center bg-[#fcfcfc] overflow-y-auto w-full">
        <div
          className={`absolute top-4 left-4 z-50 items-center justify-center p-2 rounded-xl bg-white backdrop-blur-md border border-neutral-200 shadow-sm ${props.sidebarOpen ? "flex md:hidden" : "flex"}`}
        >
          <button
            onClick={() => props.setSidebarOpen(true)}
            className="md:hidden p-1.5 border-none bg-transparent text-neutral-900 cursor-pointer flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          {!props.sidebarOpen && (
            <button
              onClick={() => props.setSidebarOpen(true)}
              className="hidden md:block p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer flex-shrink-0"
              title="展开边栏"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="w-full max-w-5xl p-8 pt-20 pb-12 flex flex-col gap-8 min-h-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                星幕项⽬厅
              </h2>
              <p className="text-sm text-neutral-500">
                双击进入项目画布，或点击选择并预览
              </p>
            </div>
            <button
              onClick={() => {
                setNewProjectTitle("");
                setNewProjectDesc("");
                setNewProjectModalOpen(true);
              }}
              className="px-4 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-neutral-900/10"
            >
              <Plus className="w-4 h-4" /> 新建星幕项目
            </button>
          </div>

          {dramaProjects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-neutral-200 border-dashed rounded-2xl w-full">
              <Network className="w-12 h-12 text-yellow-500 mb-4 opacity-70" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                还没有项目
              </h3>
              <p className="text-sm text-neutral-500 max-w-sm text-center mb-6">
                创建一个新的星幕项目，开始您的高级数据编排与创作工作流。
              </p>
              <button
                onClick={() => {
                  setNewProjectTitle("");
                  setNewProjectDesc("");
                  setNewProjectModalOpen(true);
                }}
                className="px-5 py-2.5 bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm cursor-pointer"
              >
                创建初始项目
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {dramaProjects
                .sort((a: any, b: any) => b.created - a.created)
                .map((project: any) => (
                  <div
                    key={project.id}
                    className="relative overflow-hidden bg-white border border-neutral-200 rounded-2xl p-6 hover:border-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[180px]"
                    onDoubleClick={() => {
                      if (props.setCurrentConvId) {
                        props.setCurrentConvId(project.id);
                      }
                    }}
                  >
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-100 to-amber-50 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-600 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-100 text-yellow-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                          <Network className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] text-neutral-500 font-medium whitespace-nowrap bg-neutral-100/80 px-2.5 py-1 rounded-full border border-neutral-200/50">
                          {new Date(project.created).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-neutral-900 mb-1.5 group-hover:text-yellow-600 transition-colors line-clamp-1">
                        {project.title}
                      </h3>
                      <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed">
                        {project.description || "无项目描述"}
                      </p>
                    </div>

                    <div className="relative z-10 mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium">
                        <div
                          className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-md"
                          title="节点"
                        >
                          <Layout className="w-3.5 h-3.5 text-neutral-400" />
                          {project.nodes?.length || 0}
                        </div>
                        <div
                          className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-md"
                          title="连接"
                        >
                          <Network className="w-3.5 h-3.5 text-neutral-400" />
                          {project.edges?.length || 0}
                        </div>
                      </div>
                      <span className="text-xs text-yellow-600 font-bold opacity-0 group-hover:opacity-100 flex items-center gap-1 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        双击进入 <MousePointer2 className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* New Project Modal */}
        {newProjectModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl shadow-neutral-200/50 border border-neutral-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900">新建星幕项目</h3>
                <button
                  onClick={() => setNewProjectModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600 border-none bg-transparent cursor-pointer p-1 rounded-md hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    项目名称
                  </label>
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    autoFocus
                    placeholder="如: 黑神话剧情解析"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-inherit transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    项目简介 (可选)
                  </label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="简短描述项目用途..."
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 border-inherit transition-all resize-none"
                  />
                </div>
              </div>
              <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  onClick={() => setNewProjectModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-500 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (newProjectTitle.trim() && props.createNewProject) {
                      props.createNewProject(
                        newProjectTitle.trim(),
                        newProjectDesc.trim(),
                      );
                      setNewProjectModalOpen(false);
                    }
                  }}
                  disabled={!newProjectTitle.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  创建项目
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <CanvasDramaAreaInner
        {...props}
        onDeleteAsset={props.onDeleteAsset}
      />
    </ReactFlowProvider>
  );
}

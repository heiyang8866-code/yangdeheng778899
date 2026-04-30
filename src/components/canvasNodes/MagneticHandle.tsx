import React, { useState, useEffect, useRef } from "react";
import {
  Handle,
  HandleProps,
  Position,
  useStore,
  useNodeId,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

interface MagneticHandleProps extends HandleProps {
  className?: string;
}

export const MagneticHandle = ({
  className,
  ...props
}: MagneticHandleProps) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const [isNear, setIsNear] = useState(false);
  const nodeId = useNodeId();
  const updateNodeInternals = useUpdateNodeInternals();

  // Get the current zoom factor from the store to compensate for viewport scaling
  const zoom = useStore((s: any) => s.transform[2]);

  // Update edges when the magnetic offset changes
  useEffect(() => {
    if (nodeId) {
      // Small animation frame to let React Flow read the new transformed position
      requestAnimationFrame(() => updateNodeInternals(nodeId));
    }
  }, [magneticOffset.x, magneticOffset.y, nodeId, updateNodeInternals]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!handleRef.current) return;

      // Using the parent container (w-0 h-0) as the stable anchor point
      const rect = handleRef.current.getBoundingClientRect();
      const centerX = rect.left;
      const centerY = rect.top;

      const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const maxRange = 50 * zoom;

      if (distance < maxRange) {
        setIsNear(true);
        // Correct for zoom to ensure 1:1 movement with the mouse cursor
        let dx = (e.clientX - centerX) / zoom;
        let dy = (e.clientY - centerY) / zoom;

        setMagneticOffset({ x: dx, y: dy });
      } else {
        setIsNear(false);
        if (magneticOffset.x !== 0 || magneticOffset.y !== 0) {
          setMagneticOffset({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [magneticOffset.x, magneticOffset.y, zoom]);

  return (
    <div
      ref={handleRef}
      className={cn(
        "absolute w-0 h-0 z-[101] flex items-center justify-center",
        className,
      )}
      style={props.style}
      draggable={true}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Magnetic Range Ring - Orange/Yellow Breathing Effect */}
      <AnimatePresence>
        {isNear && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute pointer-events-none rounded-full border-2 border-amber-400/50 bg-amber-400/10 backdrop-blur-[2px]"
            style={{
              width: "100px",
              height: "100px",
              left: "50%",
              top: "50%",
              marginLeft: "-50px",
              marginTop: "-50px",
              boxShadow: "0 0 20px rgba(251, 191, 36, 0.2)",
            }}
          />
        )}
      </AnimatePresence>

      <Handle
        {...props}
        className={cn(
          "nodrag !w-[20px] !h-[20px] !bg-white !border-[3.5px] transition-all duration-200 cursor-crosshair !z-[50]",
          "after:content-[''] after:absolute after:w-[150px] after:h-[150px] after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:bg-transparent after:rounded-full",
          isNear
            ? "!border-amber-500 !shadow-[0_0_15px_rgba(245,158,11,0.8)] !scale-110"
            : "!border-neutral-300 !shadow-[0_0_5px_rgba(0,0,0,0.1)]",
        )}
        style={{
          ...props.style,
          position: "absolute",
          top: "0px",
          left: "0px",
          width: "20px",
          height: "20px",
          // Explicitly center the handle on the 0x0 pivot point plus any magnetic offset
          transform: `translate(calc(-50% + ${magneticOffset.x}px), calc(-50% + ${magneticOffset.y}px))`,
          transition:
            magneticOffset.x === 0 && magneticOffset.y === 0
              ? "transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)"
              : "none",
          pointerEvents: "all",
        }}
      />
    </div>
  );
};

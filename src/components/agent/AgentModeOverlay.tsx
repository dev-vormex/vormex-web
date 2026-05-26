'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, X } from 'lucide-react';
import { AgentChatPanel } from './AgentChatPanel';

interface AgentModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 420;
const PANEL_VIEWPORT_GAP = 24;
const PANEL_VERTICAL_OFFSET = 112;

type ResizeDirection = 'corner' | 'left' | 'top';

type ActiveResize = {
  direction: ResizeDirection;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMaxPanelSize() {
  if (typeof window === 'undefined') {
    return { width: 440, height: 640 };
  }

  return {
    width: Math.max(MIN_PANEL_WIDTH, window.innerWidth - PANEL_VIEWPORT_GAP),
    height: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - PANEL_VERTICAL_OFFSET),
  };
}

export function AgentModeOverlay({ isOpen, onClose }: AgentModeOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && <AgentModeShell key="agent-mode-shell" onClose={onClose} />}
    </AnimatePresence>
  );
}

function AgentModeShell({ onClose }: Pick<AgentModeOverlayProps, 'onClose'>) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 440, height: 640 });
  const resizeStateRef = useRef<ActiveResize | null>(null);
  const bodyStyleRef = useRef<{ cursor: string; userSelect: string } | null>(null);

  useEffect(() => {
    const stopResize = () => {
      resizeStateRef.current = null;

      if (bodyStyleRef.current) {
        document.body.style.cursor = bodyStyleRef.current.cursor;
        document.body.style.userSelect = bodyStyleRef.current.userSelect;
        bodyStyleRef.current = null;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const activeResize = resizeStateRef.current;
      if (!activeResize) return;

      const maxPanelSize = getMaxPanelSize();
      const isWidthResize =
        activeResize.direction === 'left' || activeResize.direction === 'corner';
      const isHeightResize =
        activeResize.direction === 'top' || activeResize.direction === 'corner';
      const nextWidth = isWidthResize
        ? activeResize.startWidth + (activeResize.startX - event.clientX)
        : activeResize.startWidth;
      const nextHeight = isHeightResize
        ? activeResize.startHeight + (activeResize.startY - event.clientY)
        : activeResize.startHeight;

      setPanelSize({
        width: clamp(Math.round(nextWidth), MIN_PANEL_WIDTH, maxPanelSize.width),
        height: clamp(Math.round(nextHeight), MIN_PANEL_HEIGHT, maxPanelSize.height),
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      stopResize();
    };
  }, []);

  const startResize =
    (direction: ResizeDirection, cursor: string) =>
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      resizeStateRef.current = {
        direction,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: panelSize.width,
        startHeight: panelSize.height,
      };

      if (!bodyStyleRef.current) {
        bodyStyleRef.current = {
          cursor: document.body.style.cursor,
          userSelect: document.body.style.userSelect,
        };
      }

      document.body.style.cursor = cursor;
      document.body.style.userSelect = 'none';
    };

  return (
    <div className="pointer-events-none fixed inset-0 z-[1000]">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="agent-bubble"
            type="button"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMinimized(false)}
            className="pointer-events-auto fixed bottom-24 right-5 flex h-16 w-16 items-center justify-center rounded-full border border-blue-200/80 bg-white shadow-2xl shadow-blue-950/20 ring-4 ring-blue-500/10 transition-transform hover:scale-105 dark:border-blue-900/60 dark:bg-neutral-950"
            aria-label="Open Vormex AI"
            title="Open Vormex AI"
          >
            <Image
              src="/logo.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-contain"
              priority
            />
            <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-neutral-950" />
          </motion.button>
        ) : (
          <motion.div
            key="agent-panel"
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-auto fixed bottom-24 right-5 flex max-h-[calc(100vh-7rem)] max-w-[calc(100vw-1.5rem)] min-h-[420px] min-w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-blue-950/20 dark:border-neutral-800 dark:bg-neutral-950"
            style={{
              width: `min(${panelSize.width}px, calc(100vw - 24px))`,
              height: `min(${panelSize.height}px, calc(100vh - 112px))`,
            }}
          >
            <div className="flex h-full min-h-0 w-full flex-col">
              <button
                type="button"
                onPointerDown={startResize('corner', 'nwse-resize')}
                className="absolute left-2 top-2 z-30 flex h-7 w-7 cursor-nwse-resize touch-none items-center justify-center rounded-lg border border-blue-200 bg-white/95 text-blue-500 shadow-sm transition-colors hover:bg-blue-50 dark:border-blue-900/70 dark:bg-neutral-950/95 dark:text-blue-300 dark:hover:bg-blue-950/50"
                aria-label="Resize Vormex AI"
                title="Drag to resize"
              >
                <span className="h-3 w-3 rounded-sm border-l-2 border-t-2 border-current" />
              </button>
              <button
                type="button"
                onPointerDown={startResize('top', 'ns-resize')}
                className="absolute left-12 right-16 top-0 z-20 h-2 cursor-ns-resize touch-none rounded-t-2xl transition-colors hover:bg-blue-500/20"
                aria-label="Resize Vormex AI height"
                title="Drag to resize height"
                tabIndex={-1}
              />
              <button
                type="button"
                onPointerDown={startResize('left', 'ew-resize')}
                className="absolute bottom-12 left-0 top-12 z-20 w-2 cursor-ew-resize touch-none transition-colors hover:bg-blue-500/20"
                aria-label="Resize Vormex AI width"
                title="Drag to resize width"
                tabIndex={-1}
              />

              <div className="flex items-center justify-between border-b border-blue-100 bg-white py-3 pl-11 pr-4 dark:border-blue-950/60 dark:bg-neutral-950">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:ring-blue-900/60">
                    <Image
                      src="/logo.png"
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-contain"
                      priority
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-gray-950 dark:text-white">
                      Vormex AI
                    </h2>
                    <p className="truncate text-xs text-gray-500 dark:text-neutral-400">
                      App-aware assistant
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    aria-label="Minimize Vormex AI"
                    title="Minimize"
                    type="button"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    aria-label="Close Vormex AI"
                    title="Close"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <AgentChatPanel onNavigate={() => setIsMinimized(true)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

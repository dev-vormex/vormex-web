'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw, Check, RefreshCw } from 'lucide-react';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio: number; // width/height ratio (1 for avatar, 4 for banner)
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  cropShape?: 'circle' | 'rectangle';
  minWidth?: number;
  minHeight?: number;
}

export default function ImageCropper({
  imageSrc,
  aspectRatio,
  onCropComplete,
  onCancel,
  cropShape = 'rectangle',
  minWidth = 100,
  minHeight = 100
}: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Constrain movement within reasonable bounds
    const maxOffset = 200 * zoom;
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    });
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    const maxOffset = 200 * zoom;
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleCrop = async () => {
    if (!imageRef.current || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const image = imageRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Calculate output dimensions based on aspect ratio
      const outputWidth = aspectRatio >= 1 ? 800 : 400;
      const outputHeight = outputWidth / aspectRatio;
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const cropArea = getCropAreaDimensions();
      const renderedWidth = image.clientWidth;
      const renderedHeight = image.clientHeight;

      if (!renderedWidth || !renderedHeight) {
        throw new Error('Image dimensions are unavailable');
      }

      // Reproduce the preview's CSS transform in crop-window coordinates.
      // This makes the exported pixels match exactly what is visible inside
      // the crop frame instead of resizing the entire source image.
      ctx.translate(outputWidth / 2, outputHeight / 2);
      ctx.scale(outputWidth / cropArea.width, outputHeight / cropArea.height);
      ctx.translate(position.x, position.y);
      ctx.scale(zoom, zoom);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(
        image,
        -renderedWidth / 2,
        -renderedHeight / 2,
        renderedWidth,
        renderedHeight
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error('Failed to create image blob')),
          'image/jpeg',
          0.95
        );
      });

      onCropComplete(blob);
    } catch (error) {
      console.error('Crop error:', error);
      setIsProcessing(false);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const getCropAreaDimensions = () => {
    const size = 280;
    return {
      width: aspectRatio >= 1 ? size : size * aspectRatio,
      height: aspectRatio >= 1 ? size / aspectRatio : size,
    };
  };

  // Calculate crop area dimensions
  const getCropAreaStyle = (): React.CSSProperties => {
    const { width, height } = getCropAreaDimensions();

    return {
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: cropShape === 'circle' ? '50%' : '8px',
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
    >
      <div className="relative w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Crop Image
          </h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div
          ref={containerRef}
          className="relative w-full aspect-square bg-gray-900 rounded-xl overflow-hidden cursor-move select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Image */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="max-w-none"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              onLoad={handleImageLoad}
              draggable={false}
            />
          </div>

          {/* Overlay with crop window */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60" />
            
            {/* Transparent crop area */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg"
              style={{
                ...getCropAreaStyle(),
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              }}
            >
              {/* Corner indicators */}
              <div className="absolute -left-1 -top-1 w-4 h-4 border-l-2 border-t-2 border-white" />
              <div className="absolute -right-1 -top-1 w-4 h-4 border-r-2 border-t-2 border-white" />
              <div className="absolute -left-1 -bottom-1 w-4 h-4 border-l-2 border-b-2 border-white" />
              <div className="absolute -right-1 -bottom-1 w-4 h-4 border-r-2 border-b-2 border-white" />
            </div>
          </div>

          {/* Loading indicator */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-4 px-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-3">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={ZOOM_STEP}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-32 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-md"
              />
              <span className="text-sm text-gray-400 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            
              <button
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Rotate & Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRotate}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="Rotate 90°"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="Reset"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            disabled={isProcessing || !imageLoaded}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Apply
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Drag to reposition • Scroll or use slider to zoom • Click rotate to adjust orientation
        </p>
      </div>
    </motion.div>
  );
}

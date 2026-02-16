'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import opentype from 'opentype.js';
import type { Font } from 'opentype.js';
import type { Effect } from '../types/effects';
import { renderSVGFrame, serializeSVG } from '../utils/svgRenderer';

interface FontRendererProps {
  fontPath: string | null;
  text: string;
  wireframeMode?: boolean;
  effects?: Effect[];
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FontRendererHandle {
  getSVGContent: () => string | null;
  getFont: () => Font | null;
  getVisibleViewBox: () => ViewBox | null;
}

const FontRenderer = forwardRef<FontRendererHandle, FontRendererProps>(
  function FontRenderer({ fontPath, text, wireframeMode = false, effects = [] }, ref) {
    const [font, setFont] = useState<Font | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Pan and Zoom state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    // Refs to track latest values (avoids stale closures in event handlers)
    const zoomRef = useRef(zoom);
    const panRef = useRef(pan);
    zoomRef.current = zoom;
    panRef.current = pan;

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getSVGContent: () => {
        if (!svgRef.current) return null;
        return serializeSVG(svgRef.current, '#000000');
      },
      getFont: () => font,
      getVisibleViewBox: () => {
        if (!svgRef.current || !containerRef.current) return null;
        const svg = svgRef.current;
        const container = containerRef.current;

        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        const inv = ctm.inverse();

        const containerRect = container.getBoundingClientRect();

        const topLeft = svg.createSVGPoint();
        topLeft.x = containerRect.left;
        topLeft.y = containerRect.top;
        const svgTopLeft = topLeft.matrixTransform(inv);

        const bottomRight = svg.createSVGPoint();
        bottomRight.x = containerRect.right;
        bottomRight.y = containerRect.bottom;
        const svgBottomRight = bottomRight.matrixTransform(inv);

        return {
          x: svgTopLeft.x,
          y: svgTopLeft.y,
          width: svgBottomRight.x - svgTopLeft.x,
          height: svgBottomRight.y - svgTopLeft.y,
        };
      },
    }));

    useEffect(() => {
      if (!fontPath) {
        setFont(null);
        return;
      }

      setLoading(true);
      setError(null);

      opentype.load(`/api/fonts/${fontPath}`, (err, loadedFont) => {
        setLoading(false);
        if (err) {
          setError(`Failed to load font: ${err.message}`);
          setFont(null);
        } else if (loadedFont) {
          setFont(loadedFont);
        }
      });
    }, [fontPath]);

    useEffect(() => {
      if (!font || !text || !svgRef.current) return;

      try {
        renderSVGFrame(svgRef.current, font, text, wireframeMode, effects);
      } catch (err) {
        setError(`Rendering error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }, [font, text, wireframeMode, effects]);

    // Handle mouse wheel for zoom (with mouse position anchor)
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        
        // Get mouse position relative to container
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Read latest values from refs (avoids stale closure)
        const prevZoom = zoomRef.current;
        const prevPan = panRef.current;
        const newZoom = Math.max(0.1, Math.min(10, prevZoom * delta));
        
        // Calculate the point in transform-space under the mouse
        const worldX = (mouseX - prevPan.x) / prevZoom;
        const worldY = (mouseY - prevPan.y) / prevZoom;
        
        // Adjust pan so the same point stays under the mouse
        const newPan = {
          x: mouseX - worldX * newZoom,
          y: mouseY - worldY * newZoom,
        };
        
        zoomRef.current = newZoom;
        panRef.current = newPan;
        setZoom(newZoom);
        setPan(newPan);
      };

      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    // Handle mouse drag for pan
    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left mouse button
      setIsPanning(true);
      setStartPan({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isPanning) return;
      const newPan = {
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      };
      panRef.current = newPan;
      setPan(newPan);
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    // Touch event handlers for mobile pan and pinch-to-zoom
    const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
    const lastPinchDistRef = useRef<number | null>(null);

    const getTouchDistance = (touches: React.TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches: React.TouchList) => {
      if (touches.length < 2) {
        return { x: touches[0].clientX, y: touches[0].clientY };
      }
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // Single finger: start pan
        lastTouchRef.current = {
          x: e.touches[0].clientX - panRef.current.x,
          y: e.touches[0].clientY - panRef.current.y,
        };
        lastPinchDistRef.current = null;
        setIsPanning(true);
      } else if (e.touches.length === 2) {
        // Two fingers: start pinch-to-zoom
        lastPinchDistRef.current = getTouchDistance(e.touches);
        lastTouchRef.current = null;
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 1 && lastTouchRef.current) {
        // Single finger: pan
        const newPan = {
          x: e.touches[0].clientX - lastTouchRef.current.x,
          y: e.touches[0].clientY - lastTouchRef.current.y,
        };
        panRef.current = newPan;
        setPan(newPan);
      } else if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
        // Two fingers: pinch-to-zoom
        const currentDist = getTouchDistance(e.touches);
        const delta = currentDist / lastPinchDistRef.current;
        lastPinchDistRef.current = currentDist;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const center = getTouchCenter(e.touches);
        const centerX = center.x - rect.left;
        const centerY = center.y - rect.top;

        const prevZoom = zoomRef.current;
        const prevPan = panRef.current;
        const newZoom = Math.max(0.1, Math.min(10, prevZoom * delta));

        const worldX = (centerX - prevPan.x) / prevZoom;
        const worldY = (centerY - prevPan.y) / prevZoom;

        const newPan = {
          x: centerX - worldX * newZoom,
          y: centerY - worldY * newZoom,
        };

        zoomRef.current = newZoom;
        panRef.current = newPan;
        setZoom(newZoom);
        setPan(newPan);
      }
    };

    const handleTouchEnd = () => {
      lastTouchRef.current = null;
      lastPinchDistRef.current = null;
      setIsPanning(false);
    };

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const container = containerRef.current;
        if (!container) return;

        if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          const newPan = { x: 0, y: 0 };
          zoomRef.current = 1;
          panRef.current = newPan;
          setZoom(1);
          setPan(newPan);
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          
          // Zoom towards center of viewport
          const rect = container.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          const prevZoom = zoomRef.current;
          const prevPan = panRef.current;
          const newZoom = Math.min(10, prevZoom * 1.2);
          const worldX = (centerX - prevPan.x) / prevZoom;
          const worldY = (centerY - prevPan.y) / prevZoom;
          
          const newPan = {
            x: centerX - worldX * newZoom,
            y: centerY - worldY * newZoom,
          };
          
          zoomRef.current = newZoom;
          panRef.current = newPan;
          setZoom(newZoom);
          setPan(newPan);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          
          // Zoom out from center of viewport
          const rect = container.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          const prevZoom = zoomRef.current;
          const prevPan = panRef.current;
          const newZoom = Math.max(0.1, prevZoom * 0.8);
          const worldX = (centerX - prevPan.x) / prevZoom;
          const worldY = (centerY - prevPan.y) / prevZoom;
          
          const newPan = {
            x: centerX - worldX * newZoom,
            y: centerY - worldY * newZoom,
          };
          
          zoomRef.current = newZoom;
          panRef.current = newPan;
          setZoom(newZoom);
          setPan(newPan);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
            <p>Loading font...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full text-red-400">
          <div className="text-center">
            <p>{error}</p>
          </div>
        </div>
      );
    }

    if (!fontPath) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Select a font to begin</p>
        </div>
      );
    }

    if (!text) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Enter text to render</p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Zoom indicator */}
        <div className="absolute top-4 left-4 z-10 text-xs text-zinc-600 pointer-events-none">
          {Math.round(zoom * 100)}%
        </div>
        
        {/* Reset hint */}
        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <div className="absolute bottom-4 left-4 z-10 text-xs text-zinc-600 pointer-events-none">
            Press Cmd+0 to reset
          </div>
        )}
        
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <svg
            ref={svgRef}
            className="text-white"
            style={{ 
              filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
              maxWidth: '90vw',
              maxHeight: '90vh',
            }}
          />
        </div>
      </div>
    );
  }
);

export default FontRenderer;

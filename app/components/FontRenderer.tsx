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

export interface FontRendererHandle {
  getSVGContent: () => string | null;
  getFont: () => Font | null;
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
        className="w-full h-full relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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

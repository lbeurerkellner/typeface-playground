'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import opentype from 'opentype.js';
import type { Effect } from '../types/effects';
import { applyEffects } from '../utils/effectProcessors';

interface FontRendererProps {
  fontPath: string | null;
  text: string;
  wireframeMode?: boolean;
  effects?: Effect[];
}

export interface FontRendererHandle {
  getSVGContent: () => string | null;
}

const FontRenderer = forwardRef<FontRendererHandle, FontRendererProps>(
  function FontRenderer({ fontPath, text, wireframeMode = false, effects = [] }, ref) {
    const [font, setFont] = useState<opentype.Font | null>(null);
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

    // Expose method to get SVG content
    useImperativeHandle(ref, () => ({
      getSVGContent: () => {
        if (!svgRef.current) return null;
        
        const svg = svgRef.current.cloneNode(true) as SVGSVGElement;
        
        // Add XML namespace and other necessary attributes
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        
        // Replace currentColor with actual color for standalone SVG
        const paths = svg.querySelectorAll('path[fill="currentColor"]');
        paths.forEach(path => {
          path.setAttribute('fill', '#000000');
        });
        
        // Replace currentColor in stroke for wireframe mode
        const strokePaths = svg.querySelectorAll('path[stroke="currentColor"]');
        strokePaths.forEach(path => {
          path.setAttribute('stroke', '#000000');
        });
        
        // Remove inline styles that reference currentColor
        svg.style.color = '';
        
        // Serialize the SVG
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        
        // Add XML declaration
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
      }
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
        // Clear previous content
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }

        // Configure rendering parameters
        const fontSize = 200;
        const lineHeight = fontSize * 1.2; // 120% line height
        const startX = 50;
        const startY = 250;

        // Split text by newlines
        const lines = text.split('\n');
        
        // Create a group to hold all lines
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // Track overall bounding box
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        // Render each line with per-character paths
        lines.forEach((line, lineIndex) => {
          if (!line) return; // Skip empty lines
          
          const lineY = startY + (lineIndex * lineHeight);
          
          // Create a group for this line
          const lineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          lineGroup.setAttribute('data-line', lineIndex.toString());
          
          // Track current x position for character placement
          let currentX = startX;
          
          // Render each character individually
          for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            
            // Get the glyph for this character
            const glyph = font.charToGlyph(char);
            
            // Create a group for this character
            const charGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            charGroup.setAttribute('data-char', char);
            charGroup.setAttribute('data-char-index', charIndex.toString());
            
            // Get the path for this glyph
            const glyphPath = glyph.getPath(currentX, lineY, fontSize);
            const pathData = glyphPath.toPathData(2);
            
            // Only create a path element if the glyph has actual geometry
            if (pathData) {
              const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              pathElement.setAttribute('d', pathData);
              
              if (wireframeMode) {
                // Wireframe mode: stroke only, no fill
                pathElement.setAttribute('fill', 'none');
                pathElement.setAttribute('stroke', 'currentColor');
                pathElement.setAttribute('stroke-width', '2');
              } else {
                // Normal mode: filled
                pathElement.setAttribute('fill', 'currentColor');
              }
              
              charGroup.appendChild(pathElement);
              
              // Update bounding box
              const bbox = glyphPath.getBoundingBox();
              minX = Math.min(minX, bbox.x1);
              minY = Math.min(minY, bbox.y1);
              maxX = Math.max(maxX, bbox.x2);
              maxY = Math.max(maxY, bbox.y2);
            }
            
            lineGroup.appendChild(charGroup);
            
            // Advance x position by the glyph's advance width
            const scale = fontSize / font.unitsPerEm;
            currentX += glyph.advanceWidth * scale;
          }
          
          group.appendChild(lineGroup);
        });

        svgRef.current.appendChild(group);

        // Apply effects if any are enabled
        if (effects.length > 0) {
          applyEffects(svgRef.current, effects);
        }

        // Recalculate bounding box after effects (effects may change dimensions)
        // Get all path elements to calculate new bounds
        const allPaths = svgRef.current.querySelectorAll('path[d]');
        allPaths.forEach((pathElement) => {
          const path = pathElement as SVGPathElement;
          try {
            const bbox = path.getBBox();
            minX = Math.min(minX, bbox.x);
            minY = Math.min(minY, bbox.y);
            maxX = Math.max(maxX, bbox.x + bbox.width);
            maxY = Math.max(maxY, bbox.y + bbox.height);
          } catch (e) {
            // getBBox can fail on some paths, ignore
          }
        });

        // Handle case where all lines are empty
        if (!isFinite(minX)) {
          minX = 0;
          minY = 0;
          maxX = 800;
          maxY = 400;
        }

        // Calculate content dimensions
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        // Expand viewBox to 5x the content size to accommodate effects like multiply
        const expansionFactor = 5;
        const width = Math.max(contentWidth * expansionFactor, 800);
        const height = Math.max(contentHeight * expansionFactor, 400);
        
        // Center the viewBox on the content
        const contentCenterX = (minX + maxX) / 2;
        const contentCenterY = (minY + maxY) / 2;
        const viewBoxX = contentCenterX - width / 2;
        const viewBoxY = contentCenterY - height / 2;
        
        svgRef.current.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${width} ${height}`);
        svgRef.current.setAttribute('width', '100%');
        svgRef.current.setAttribute('height', '100%');
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

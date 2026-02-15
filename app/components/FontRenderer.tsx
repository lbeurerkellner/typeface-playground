'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import opentype from 'opentype.js';

interface FontRendererProps {
  fontPath: string | null;
  text: string;
  wireframeMode?: boolean;
}

export interface FontRendererHandle {
  getSVGContent: () => string | null;
}

const FontRenderer = forwardRef<FontRendererHandle, FontRendererProps>(
  function FontRenderer({ fontPath, text, wireframeMode = false }, ref) {
    const [font, setFont] = useState<opentype.Font | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

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

        // Render each line
        lines.forEach((line, index) => {
          if (!line) return; // Skip empty lines
          
          const y = startY + (index * lineHeight);
          const path = font.getPath(line, startX, y, fontSize);
          const bbox = path.getBoundingBox();

          // Update overall bounding box
          minX = Math.min(minX, bbox.x1);
          minY = Math.min(minY, bbox.y1);
          maxX = Math.max(maxX, bbox.x2);
          maxY = Math.max(maxY, bbox.y2);

          // Create path element for this line
          const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pathElement.setAttribute('d', path.toPathData(2));
          
          if (wireframeMode) {
            // Wireframe mode: stroke only, no fill
            pathElement.setAttribute('fill', 'none');
            pathElement.setAttribute('stroke', 'currentColor');
            pathElement.setAttribute('stroke-width', '2');
          } else {
            // Normal mode: filled
            pathElement.setAttribute('fill', 'currentColor');
          }
          
          group.appendChild(pathElement);
        });

        svgRef.current.appendChild(group);

        // Handle case where all lines are empty
        if (!isFinite(minX)) {
          minX = 0;
          minY = 0;
          maxX = 800;
          maxY = 400;
        }

        // Calculate dimensions with padding
        const padding = 50;
        const width = Math.max(maxX - minX + padding * 2, 800);
        const height = Math.max(maxY - minY + padding * 2, 400);

        // Adjust viewBox to center the text
        const viewBoxX = minX - padding;
        const viewBoxY = minY - padding;
        
        svgRef.current.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${width} ${height}`);
        svgRef.current.setAttribute('width', '100%');
        svgRef.current.setAttribute('height', '100%');
      } catch (err) {
        setError(`Rendering error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }, [font, text, wireframeMode]);

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
      <div className="w-full h-full flex items-center justify-center p-8">
        <svg
          ref={svgRef}
          className="max-w-full max-h-full text-white"
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }}
        />
      </div>
    );
  }
);

export default FontRenderer;

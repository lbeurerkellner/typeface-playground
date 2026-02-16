// Standalone SVG rendering utility
// Extracted from FontRenderer to allow reuse in GIF export

import type { Font } from 'opentype.js';
import type { Effect } from '../types/effects';
import { applyEffects } from './effectProcessors';

/**
 * Render text glyphs and effects into an SVG element.
 * The SVG element must be in the document for getBBox() to work (used by multiply effect).
 */
export function renderSVGFrame(
  svgElement: SVGSVGElement,
  font: Font,
  text: string,
  wireframeMode: boolean,
  effects: Effect[],
): void {
  // Clear previous content
  while (svgElement.firstChild) {
    svgElement.removeChild(svgElement.firstChild);
  }

  // Configure rendering parameters
  const fontSize = 200;
  const lineHeight = fontSize * 1.2;
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
    if (!line) return;

    const lineY = startY + (lineIndex * lineHeight);

    const lineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    lineGroup.setAttribute('data-line', lineIndex.toString());

    let currentX = startX;

    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      const glyph = font.charToGlyph(char);

      const charGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      charGroup.setAttribute('data-char', char);
      charGroup.setAttribute('data-char-index', charIndex.toString());

      const glyphPath = glyph.getPath(currentX, lineY, fontSize);
      const pathData = glyphPath.toPathData(2);

      if (pathData) {
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', pathData);

        if (wireframeMode) {
          pathElement.setAttribute('fill', 'none');
          pathElement.setAttribute('stroke', 'currentColor');
          pathElement.setAttribute('stroke-width', '2');
        } else {
          pathElement.setAttribute('fill', 'currentColor');
        }

        charGroup.appendChild(pathElement);

        const bbox = glyphPath.getBoundingBox();
        minX = Math.min(minX, bbox.x1);
        minY = Math.min(minY, bbox.y1);
        maxX = Math.max(maxX, bbox.x2);
        maxY = Math.max(maxY, bbox.y2);
      }

      lineGroup.appendChild(charGroup);

      const scale = fontSize / font.unitsPerEm;
      currentX += glyph.advanceWidth * scale;
    }

    group.appendChild(lineGroup);
  });

  svgElement.appendChild(group);

  // Apply effects if any are enabled
  if (effects.length > 0) {
    applyEffects(svgElement, effects);
  }

  // Recalculate bounding box after effects
  const allPaths = svgElement.querySelectorAll('path[d]');
  allPaths.forEach((pathElement) => {
    const path = pathElement as SVGPathElement;
    try {
      const bbox = path.getBBox();
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    } catch {
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

  svgElement.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${width} ${height}`);
  svgElement.setAttribute('width', '100%');
  svgElement.setAttribute('height', '100%');
}

/**
 * Serialize an SVG element to a standalone SVG string.
 * Resolves currentColor to a specific color value.
 */
export function serializeSVG(
  svgElement: SVGSVGElement,
  resolveColor: string = '#ffffff',
): string {
  const svg = svgElement.cloneNode(true) as SVGSVGElement;

  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Replace currentColor with the resolved color
  const fillPaths = svg.querySelectorAll('path[fill="currentColor"]');
  fillPaths.forEach(path => {
    path.setAttribute('fill', resolveColor);
  });

  const strokePaths = svg.querySelectorAll('path[stroke="currentColor"]');
  strokePaths.forEach(path => {
    path.setAttribute('stroke', resolveColor);
  });

  svg.style.color = '';

  const serializer = new XMLSerializer();
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(svg);
}

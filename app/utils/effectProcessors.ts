// Effect processor functions that apply effects to SVG DOM elements

import type { Effect, MultiplyEffect, DistortionEffect, OutlineEffect, SubdivideEffect, ColorEffect } from '../types/effects';
import {
  parsePath,
  serializePath,
  subdividePath,
  getPointOnLine,
  getTangentOnLine,
  getPointOnCubicBezier,
  getTangentOnCubicBezier,
  getPointOnQuadraticBezier,
  getTangentOnQuadraticBezier,
  getNormal,
  type PathCommand,
} from './pathUtils';

// Apply multiply effect: duplicate each character group with transforms
export function applyMultiplyEffect(svg: SVGSVGElement, effect: MultiplyEffect): void {
  const { count, offsetX, offsetY, rotation, opacityDecay } = effect.parameters;
  
  // Find all character groups (not line groups)
  const charGroups = svg.querySelectorAll('g[data-char]');
  
  charGroups.forEach((originalGroup) => {
    const group = originalGroup as SVGGElement;
    
    // Create duplicates (count - 1, since original is already there)
    for (let i = 1; i < count; i++) {
      const clone = group.cloneNode(true) as SVGGElement;
      
      // Calculate transforms for this duplicate
      const tx = offsetX * i;
      const ty = offsetY * i;
      const rot = rotation * i;
      const opacity = Math.pow(1 - opacityDecay, i);
      
      // Build transform string
      let transform = '';
      if (tx !== 0 || ty !== 0) {
        transform += `translate(${tx}, ${ty}) `;
      }
      if (rot !== 0) {
        // Rotate around the character's position
        // Get the character's bounding box center for rotation origin
        const bbox = group.getBBox();
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        transform += `rotate(${rot}, ${cx}, ${cy}) `;
      }
      
      if (transform) {
        clone.setAttribute('transform', transform.trim());
      }
      
      // Set opacity
      if (opacity < 1) {
        clone.setAttribute('opacity', opacity.toString());
      }
      
      // Mark as duplicate for potential cleanup
      clone.setAttribute('data-effect-duplicate', 'true');
      
      // Insert before original (so original renders on top)
      group.parentNode?.insertBefore(clone, group);
    }
  });
}

// Wave function generators
function sinWave(x: number): number {
  return Math.sin(x);
}

function sawWave(x: number): number {
  // Sawtooth: linear ramp from -1 to 1, then repeat
  const normalized = (x / (2 * Math.PI)) % 1;
  return (normalized * 2) - 1;
}

function triangleWave(x: number): number {
  // Triangle: ramp up from -1 to 1, then down
  const normalized = (x / (2 * Math.PI)) % 1;
  return normalized < 0.5 
    ? (normalized * 4) - 1 
    : 1 - ((normalized - 0.5) * 4);
}

// Apply distortion effect: displace path points along their normals
export function applyDistortionEffect(svg: SVGSVGElement, effect: DistortionEffect): void {
  const { waveType, amplitude, frequency, phase } = effect.parameters;
  
  // Select wave function
  const waveFn = waveType === 'sin' ? sinWave : waveType === 'saw' ? sawWave : triangleWave;
  const phaseRad = (phase * Math.PI) / 180;
  
  // Find all path elements
  const paths = svg.querySelectorAll('path[d]');
  
  paths.forEach((pathElement) => {
    const path = pathElement as SVGPathElement;
    const d = path.getAttribute('d');
    if (!d) return;
    
    // Parse path
    const commands = parsePath(d);
    
    // Subdivide for smoother distortion
    const subdivided = subdividePath(commands, 8);
    
    // Apply distortion to each point
    let currentX = 0;
    let currentY = 0;
    let arcLength = 0;
    
    const distorted: PathCommand[] = [];
    
    for (let i = 0; i < subdivided.length; i++) {
      const cmd = subdivided[i];
      const type = cmd.type.toUpperCase();
      
      if (type === 'M') {
        // Move command - no distortion, just track position
        currentX = cmd.values[0];
        currentY = cmd.values[1];
        distorted.push({ ...cmd });
        arcLength = 0;
      } else if (type === 'L') {
        // Line command - apply distortion
        const targetX = cmd.values[0];
        const targetY = cmd.values[1];
        
        // Calculate segment length
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const segmentLength = Math.sqrt(dx * dx + dy * dy);
        arcLength += segmentLength;
        
        // Get tangent and normal
        const [tangentX, tangentY] = getTangentOnLine(currentX, currentY, targetX, targetY);
        const [normalX, normalY] = getNormal(tangentX, tangentY);
        
        // Calculate displacement
        const waveInput = frequency * arcLength + phaseRad;
        const displacement = amplitude * waveFn(waveInput);
        
        // Apply displacement along normal
        const newX = targetX + normalX * displacement;
        const newY = targetY + normalY * displacement;
        
        distorted.push({ type: 'L', values: [newX, newY] });
        
        currentX = targetX;
        currentY = targetY;
      } else if (type === 'Z') {
        // Close path
        distorted.push({ type: 'Z', values: [] });
      } else {
        // Other commands - pass through
        distorted.push({ ...cmd });
      }
    }
    
    // Serialize back to d attribute
    const newD = serializePath(distorted);
    path.setAttribute('d', newD);
  });
}

// Apply outline effect: add stroke behind fill
export function applyOutlineEffect(svg: SVGSVGElement, effect: OutlineEffect): void {
  const { thickness, style } = effect.parameters;
  
  // Find all path elements
  const paths = svg.querySelectorAll('path[d]');
  
  paths.forEach((pathElement) => {
    const path = pathElement as SVGPathElement;
    
    // Set stroke properties
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', thickness.toString());
    path.setAttribute('stroke-linejoin', style === 'round' ? 'round' : 'miter');
    path.setAttribute('stroke-linecap', style === 'round' ? 'round' : 'square');
    
    // Use paint-order to render stroke behind fill
    path.setAttribute('paint-order', 'stroke fill');
    
    // Mark as having outline effect applied
    path.setAttribute('data-effect-outline', 'true');
  });
}

// Apply subdivide effect: add more points to curves for higher resolution
export function applySubdivideEffect(svg: SVGSVGElement, effect: SubdivideEffect): void {
  const { subdivisions } = effect.parameters;
  
  // Find all path elements
  const paths = svg.querySelectorAll('path[d]');
  
  paths.forEach((pathElement) => {
    const path = pathElement as SVGPathElement;
    const d = path.getAttribute('d');
    if (!d) return;
    
    // Parse path
    const commands = parsePath(d);
    
    // Subdivide the path
    const subdivided = subdividePath(commands, subdivisions);
    
    // Serialize back to d attribute
    const newD = serializePath(subdivided);
    path.setAttribute('d', newD);
  });
}

// Apply color effect: change color using HSL
export function applyColorEffect(svg: SVGSVGElement, effect: ColorEffect): void {
  const { hue, saturation, lightness } = effect.parameters;
  
  // Create HSL color string
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  
  // Find all path elements
  const paths = svg.querySelectorAll('path[d]');
  
  paths.forEach((pathElement) => {
    const path = pathElement as SVGPathElement;
    
    // Update fill color (if it has fill)
    const fill = path.getAttribute('fill');
    if (fill && fill !== 'none') {
      path.setAttribute('fill', color);
    }
    
    // Update stroke color (if it has stroke)
    const stroke = path.getAttribute('stroke');
    if (stroke && stroke !== 'none') {
      path.setAttribute('stroke', color);
    }
  });
}

// Main function to apply all enabled effects in order
export function applyEffects(svg: SVGSVGElement, effects: Effect[]): void {
  // Filter to enabled effects only
  const enabledEffects = effects.filter(e => e.enabled);
  
  // Apply each effect in order
  for (const effect of enabledEffects) {
    switch (effect.type) {
      case 'multiply':
        applyMultiplyEffect(svg, effect);
        break;
      case 'distortion':
        applyDistortionEffect(svg, effect);
        break;
      case 'outline':
        applyOutlineEffect(svg, effect);
        break;
      case 'subdivide':
        applySubdivideEffect(svg, effect);
        break;
      case 'color':
        applyColorEffect(svg, effect);
        break;
    }
  }
}

// Clean up effect artifacts (for re-rendering)
export function cleanupEffects(svg: SVGSVGElement): void {
  // Remove duplicate elements created by multiply effect
  const duplicates = svg.querySelectorAll('[data-effect-duplicate="true"]');
  duplicates.forEach(el => el.remove());
  
  // Remove outline effect attributes
  const outlinedPaths = svg.querySelectorAll('[data-effect-outline="true"]');
  outlinedPaths.forEach(path => {
    path.removeAttribute('stroke');
    path.removeAttribute('stroke-width');
    path.removeAttribute('stroke-linejoin');
    path.removeAttribute('stroke-linecap');
    path.removeAttribute('paint-order');
    path.removeAttribute('data-effect-outline');
  });
  
  // Note: Distortion modifies paths directly, so we need to re-render from scratch
  // The calling code should handle this by clearing and re-rendering the SVG
}

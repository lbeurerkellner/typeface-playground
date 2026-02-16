// GIF export utility - captures animation frames and encodes as GIF

import type { Font } from 'opentype.js';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { Effect } from '../types/effects';
import type { EffectAnimations } from '../types/animation';
import { getAnimatedValue } from '../types/animation';
import { renderSVGFrame, serializeSVG } from './svgRenderer';

export interface GifExportOptions {
  width: number;
  height: number;
  fps: number;
  duration: number; // seconds
  foregroundColor: string; // hex color for text
  backgroundColor: string; // hex color for background
}

/**
 * Compute the default animation duration based on the slowest animation cycle.
 * Returns 2 seconds if no animations are enabled.
 */
export function getDefaultDuration(animations: EffectAnimations): number {
  let maxCycleTime = 0;

  for (const effectAnims of Object.values(animations)) {
    for (const config of Object.values(effectAnims)) {
      if (config.enabled && config.speed > 0) {
        const cycleTime = 1 / config.speed;
        maxCycleTime = Math.max(maxCycleTime, cycleTime);
      }
    }
  }

  return maxCycleTime > 0 ? maxCycleTime : 2;
}

/**
 * Apply animated parameter values to effects at a given time.
 * Returns a deep clone of effects with animated values applied.
 */
function applyAnimatedValues(
  effects: Effect[],
  animations: EffectAnimations,
  time: number,
): Effect[] {
  return effects.map(effect => {
    const effectAnims = animations[effect.id];
    if (!effectAnims) {
      return { ...effect, parameters: { ...effect.parameters } } as Effect;
    }

    const newParams: Record<string, unknown> = { ...effect.parameters };
    for (const [paramName, config] of Object.entries(effectAnims)) {
      if (config.enabled && paramName in newParams) {
        newParams[paramName] = getAnimatedValue(config, time);
      }
    }

    return { ...effect, parameters: newParams } as Effect;
  });
}

/**
 * Convert an SVG string to canvas pixel data.
 */
function svgToCanvas(
  svgString: string,
  width: number,
  height: number,
  backgroundColor: string,
): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas 2d context'));
      return;
    }

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Draw background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Draw SVG image
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const imageData = ctx.getImageData(0, 0, width, height);
      resolve(imageData.data);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };

    img.src = url;
  });
}

/**
 * Export animation as a GIF.
 *
 * Creates a hidden offscreen SVG element for rendering frames,
 * then uses gifenc to encode all frames into a GIF blob.
 */
export async function exportGif(
  font: Font,
  text: string,
  wireframeMode: boolean,
  effects: Effect[],
  animations: EffectAnimations,
  options: GifExportOptions,
  onProgress: (progress: number) => void,
): Promise<Blob> {
  const { width, height, fps, duration, foregroundColor, backgroundColor } = options;
  const totalFrames = Math.max(1, Math.round(fps * duration));
  const frameDelay = Math.round(1000 / fps); // ms per frame

  // Create hidden offscreen SVG for rendering
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;';
  const offscreenSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  offscreenSvg.style.color = foregroundColor;
  container.appendChild(offscreenSvg);
  document.body.appendChild(container);

  const gif = GIFEncoder();

  try {
    for (let i = 0; i < totalFrames; i++) {
      const time = i / fps;

      // Compute effects with animated values at this time
      const frameEffects = applyAnimatedValues(effects, animations, time);

      // Render SVG frame
      renderSVGFrame(offscreenSvg, font, text, wireframeMode, frameEffects);

      // Set explicit pixel dimensions for rasterization
      offscreenSvg.setAttribute('width', String(width));
      offscreenSvg.setAttribute('height', String(height));

      // Serialize SVG with resolved foreground color
      const svgString = serializeSVG(offscreenSvg, foregroundColor);

      // Rasterize SVG to canvas pixel data
      const pixelData = await svgToCanvas(svgString, width, height, backgroundColor);

      // Quantize colors and build palette
      const palette = quantize(pixelData, 256);
      const index = applyPalette(pixelData, palette);

      // Add frame to GIF
      gif.writeFrame(index, width, height, {
        palette,
        delay: frameDelay,
      });

      onProgress((i + 1) / totalFrames);

      // Yield to the browser to keep UI responsive
      if (i % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    gif.finish();
    const bytes = gif.bytes();
    return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
  } finally {
    document.body.removeChild(container);
  }
}

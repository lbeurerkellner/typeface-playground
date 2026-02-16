'use client';

import { useState } from 'react';

export interface GifExportSettings {
  width: number;
  height: number;
  fps: number;
  duration: number;
  foregroundColor: string;
  backgroundColor: string;
}

interface GifExportDialogProps {
  defaultDuration: number;
  defaultWidth?: number;
  defaultHeight?: number;
  isExporting: boolean;
  progress: number;
  onExport: (settings: GifExportSettings) => void;
  onCancel: () => void;
}

export default function GifExportDialog({
  defaultDuration,
  defaultWidth = 800,
  defaultHeight = 600,
  isExporting,
  progress,
  onExport,
  onCancel,
}: GifExportDialogProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = useState(defaultHeight);
  const [fps, setFps] = useState(20);
  const [duration, setDuration] = useState(Math.round(defaultDuration * 10) / 10);
  const [foregroundColor, setForegroundColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#000000');

  const totalFrames = Math.max(1, Math.round(fps * duration));
  const estimatedFrames = totalFrames;

  const handleExport = () => {
    onExport({ width, height, fps, duration, foregroundColor, backgroundColor });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 w-[360px] shadow-2xl">
        <h2 className="text-sm font-medium text-white mb-4">Export GIF</h2>

        {isExporting ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Rendering frame {Math.round(progress * totalFrames)} of {totalFrames}...
            </p>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 text-center">
              {Math.round(progress * 100)}%
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Dimensions */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Width</label>
                <input
                  type="number"
                  value={width}
                  onChange={e => setWidth(Math.max(100, Math.min(1920, Number(e.target.value))))}
                  className="w-full px-2 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Height</label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(Math.max(100, Math.min(1080, Number(e.target.value))))}
                  className="w-full px-2 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none"
                />
              </div>
            </div>

            {/* FPS and Duration */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">FPS</label>
                <input
                  type="number"
                  value={fps}
                  onChange={e => setFps(Math.max(1, Math.min(30, Number(e.target.value))))}
                  className="w-full px-2 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Duration (s)</label>
                <input
                  type="number"
                  value={duration}
                  step={0.1}
                  onChange={e => setDuration(Math.max(0.1, Math.min(10, Number(e.target.value))))}
                  className="w-full px-2 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Foreground</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={foregroundColor}
                    onChange={e => setForegroundColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={foregroundColor}
                    onChange={e => setForegroundColor(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={e => setBackgroundColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={e => setBackgroundColor(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Info */}
            <p className="text-xs text-zinc-600">
              {estimatedFrames} frames at {width}&times;{height}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs border border-zinc-800 hover:border-zinc-600 rounded transition-colors"
          >
            {isExporting ? 'Cancel' : 'Close'}
          </button>
          {!isExporting && (
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs bg-white text-black hover:bg-zinc-200 rounded transition-colors"
            >
              Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { BsPlay, BsPause } from 'react-icons/bs';
import type { AnimationConfig, EasingFunction } from '../types/animation';

interface AnimationControlProps {
  paramName: string;
  config: AnimationConfig;
  paramRange: { min: number; max: number; step: number };
  onUpdate: (config: AnimationConfig) => void;
}

export default function AnimationControl({
  paramName,
  config,
  paramRange,
  onUpdate,
}: AnimationControlProps) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showPopover) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  const handleToggleEnabled = () => {
    onUpdate({ ...config, enabled: !config.enabled });
    if (!config.enabled) {
      setShowPopover(true);
    }
  };

  const handleChange = (field: keyof AnimationConfig, value: number | string | boolean) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggleEnabled}
        onContextMenu={(e) => {
          e.preventDefault();
          if (config.enabled) {
            setShowPopover(!showPopover);
          }
        }}
        className={`p-1 rounded transition-colors ${
          config.enabled
            ? 'text-green-400 hover:text-green-300'
            : 'text-zinc-600 hover:text-zinc-400'
        }`}
        title={config.enabled ? 'Animation enabled (right-click for settings)' : 'Enable animation'}
      >
        {config.enabled ? <BsPlay size={14} /> : <BsPause size={14} />}
      </button>

      {/* Popover */}
      {showPopover && config.enabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowPopover(false)}
          />

          {/* Popover content */}
          <div
            ref={popoverRef}
            className="absolute left-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded shadow-lg z-40 p-3 space-y-3"
          >
            <div className="text-xs font-medium text-zinc-300 border-b border-zinc-800 pb-2">
              Animate {paramName}
            </div>

            {/* Min value */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="text-zinc-400">Min</label>
                <span className="text-zinc-300 font-mono">
                  {config.min.toFixed(paramRange.step < 1 ? 2 : 0)}
                </span>
              </div>
              <input
                type="range"
                min={paramRange.min}
                max={paramRange.max}
                step={paramRange.step}
                value={config.min}
                onChange={(e) => handleChange('min', Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Max value */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="text-zinc-400">Max</label>
                <span className="text-zinc-300 font-mono">
                  {config.max.toFixed(paramRange.step < 1 ? 2 : 0)}
                </span>
              </div>
              <input
                type="range"
                min={paramRange.min}
                max={paramRange.max}
                step={paramRange.step}
                value={config.max}
                onChange={(e) => handleChange('max', Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Speed */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="text-zinc-400">Speed</label>
                <span className="text-zinc-300 font-mono">{config.speed.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={5}
                step={0.1}
                value={config.speed}
                onChange={(e) => handleChange('speed', Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Easing */}
            <div className="space-y-1">
              <label className="block text-xs text-zinc-400">Easing</label>
              <select
                value={config.easing}
                onChange={(e) => handleChange('easing', e.target.value as EasingFunction)}
                className="w-full px-2 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none"
              >
                <option value="linear">Linear</option>
                <option value="ease">Ease</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
                <option value="ease-in-out">Ease In-Out</option>
                <option value="bounce">Bounce</option>
                <option value="elastic">Elastic</option>
              </select>
            </div>

            {/* Ping-Pong mode */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400">Oscillate</label>
              <input
                type="checkbox"
                checked={config.pingPong}
                onChange={(e) => handleChange('pingPong', e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded focus:ring-zinc-600 cursor-pointer"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

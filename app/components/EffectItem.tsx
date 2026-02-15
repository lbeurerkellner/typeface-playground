'use client';

import { useState } from 'react';
import { BsChevronDown, BsChevronRight, BsEye, BsEyeSlash, BsChevronUp, BsTrash } from 'react-icons/bs';
import type { Effect } from '../types/effects';
import { PARAMETER_RANGES, EFFECT_DISPLAY_NAMES } from '../types/effects';
import type { AnimationConfig, ParameterAnimation } from '../types/animation';
import { DEFAULT_ANIMATION_CONFIG } from '../types/animation';
import AnimationControl from './AnimationControl';

interface EffectItemProps {
  effect: Effect;
  index: number;
  total: number;
  animations: ParameterAnimation;
  onUpdate: (id: string, parameters: Effect['parameters']) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onUpdateAnimation: (effectId: string, paramName: string, config: AnimationConfig) => void;
}

export default function EffectItem({
  effect,
  index,
  total,
  animations,
  onUpdate,
  onToggle,
  onDelete,
  onMove,
  onUpdateAnimation,
}: EffectItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  const handleParameterChange = (paramName: string, value: number | string) => {
    const updatedParams = { ...effect.parameters, [paramName]: value };
    onUpdate(effect.id, updatedParams as Effect['parameters']);
  };

  const handleAnimationUpdate = (paramName: string, config: AnimationConfig) => {
    onUpdateAnimation(effect.id, paramName, config);
  };

  return (
    <div
      className={`border border-zinc-800 rounded bg-black transition-opacity ${
        !effect.enabled ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <BsChevronDown size={12} /> : <BsChevronRight size={12} />}
        </button>

        {/* Effect name */}
        <span className="flex-1 text-sm font-medium">
          {EFFECT_DISPLAY_NAMES[effect.type]}
        </span>

        {/* Toggle button */}
        <button
          onClick={() => onToggle(effect.id)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title={effect.enabled ? 'Disable' : 'Enable'}
        >
          {effect.enabled ? <BsEye size={14} /> : <BsEyeSlash size={14} />}
        </button>

        {/* Move up button */}
        <button
          onClick={() => onMove(effect.id, 'up')}
          disabled={!canMoveUp}
          className={`transition-colors ${
            canMoveUp
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-800 cursor-not-allowed'
          }`}
          title="Move up"
        >
          <BsChevronUp size={12} />
        </button>

        {/* Move down button */}
        <button
          onClick={() => onMove(effect.id, 'down')}
          disabled={!canMoveDown}
          className={`transition-colors ${
            canMoveDown
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-800 cursor-not-allowed'
          }`}
          title="Move down"
        >
          <BsChevronDown size={12} />
        </button>

        {/* Delete button */}
        <button
          onClick={() => onDelete(effect.id)}
          className="text-zinc-500 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <BsTrash size={14} />
        </button>
      </div>

      {/* Controls (collapsible) */}
      {isExpanded && (
        <div className="px-3 py-3 space-y-3">
          {effect.type === 'multiply' && (
            <>
              <SliderControl
                label="Count"
                paramName="count"
                value={effect.parameters.count}
                onChange={(v) => handleParameterChange('count', v)}
                animationConfig={animations.count || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('count', config)}
                {...PARAMETER_RANGES.multiply.count}
              />
              <SliderControl
                label="Offset X"
                paramName="offsetX"
                value={effect.parameters.offsetX}
                onChange={(v) => handleParameterChange('offsetX', v)}
                animationConfig={animations.offsetX || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('offsetX', config)}
                {...PARAMETER_RANGES.multiply.offsetX}
              />
              <SliderControl
                label="Offset Y"
                paramName="offsetY"
                value={effect.parameters.offsetY}
                onChange={(v) => handleParameterChange('offsetY', v)}
                animationConfig={animations.offsetY || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('offsetY', config)}
                {...PARAMETER_RANGES.multiply.offsetY}
              />
              <SliderControl
                label="Rotation"
                paramName="rotation"
                value={effect.parameters.rotation}
                onChange={(v) => handleParameterChange('rotation', v)}
                animationConfig={animations.rotation || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('rotation', config)}
                {...PARAMETER_RANGES.multiply.rotation}
              />
              <SliderControl
                label="Opacity Decay"
                paramName="opacityDecay"
                value={effect.parameters.opacityDecay}
                onChange={(v) => handleParameterChange('opacityDecay', v)}
                animationConfig={animations.opacityDecay || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('opacityDecay', config)}
                {...PARAMETER_RANGES.multiply.opacityDecay}
              />
            </>
          )}

          {effect.type === 'distortion' && (
            <>
              <SelectControl
                label="Wave Type"
                value={effect.parameters.waveType}
                onChange={(v) => handleParameterChange('waveType', v)}
                options={[
                  { value: 'sin', label: 'Sine' },
                  { value: 'saw', label: 'Sawtooth' },
                  { value: 'triangle', label: 'Triangle' },
                ]}
              />
              <SliderControl
                label="Amplitude"
                paramName="amplitude"
                value={effect.parameters.amplitude}
                onChange={(v) => handleParameterChange('amplitude', v)}
                animationConfig={animations.amplitude || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('amplitude', config)}
                {...PARAMETER_RANGES.distortion.amplitude}
              />
              <SliderControl
                label="Frequency"
                paramName="frequency"
                value={effect.parameters.frequency}
                onChange={(v) => handleParameterChange('frequency', v)}
                animationConfig={animations.frequency || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('frequency', config)}
                {...PARAMETER_RANGES.distortion.frequency}
              />
              <SliderControl
                label="Phase"
                paramName="phase"
                value={effect.parameters.phase}
                onChange={(v) => handleParameterChange('phase', v)}
                animationConfig={animations.phase || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('phase', config)}
                {...PARAMETER_RANGES.distortion.phase}
              />
            </>
          )}

          {effect.type === 'outline' && (
            <>
              <SliderControl
                label="Thickness"
                paramName="thickness"
                value={effect.parameters.thickness}
                onChange={(v) => handleParameterChange('thickness', v)}
                animationConfig={animations.thickness || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('thickness', config)}
                {...PARAMETER_RANGES.outline.thickness}
              />
              <SelectControl
                label="Style"
                value={effect.parameters.style}
                onChange={(v) => handleParameterChange('style', v)}
                options={[
                  { value: 'round', label: 'Round' },
                  { value: 'square', label: 'Square' },
                ]}
              />
            </>
          )}

          {effect.type === 'subdivide' && (
            <>
              <SliderControl
                label="Subdivisions"
                paramName="subdivisions"
                value={effect.parameters.subdivisions}
                onChange={(v) => handleParameterChange('subdivisions', v)}
                animationConfig={animations.subdivisions || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('subdivisions', config)}
                {...PARAMETER_RANGES.subdivide.subdivisions}
              />
            </>
          )}

          {effect.type === 'color' && (
            <>
              <HueSliderControl
                label="Hue"
                paramName="hue"
                value={effect.parameters.hue}
                onChange={(v) => handleParameterChange('hue', v)}
                animationConfig={animations.hue || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('hue', config)}
                {...PARAMETER_RANGES.color.hue}
              />
              <SliderControl
                label="Saturation"
                paramName="saturation"
                value={effect.parameters.saturation}
                onChange={(v) => handleParameterChange('saturation', v)}
                animationConfig={animations.saturation || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('saturation', config)}
                {...PARAMETER_RANGES.color.saturation}
              />
              <SliderControl
                label="Lightness"
                paramName="lightness"
                value={effect.parameters.lightness}
                onChange={(v) => handleParameterChange('lightness', v)}
                animationConfig={animations.lightness || DEFAULT_ANIMATION_CONFIG}
                onAnimationUpdate={(config) => handleAnimationUpdate('lightness', config)}
                {...PARAMETER_RANGES.color.lightness}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Slider control component with animation support
interface SliderControlProps {
  label: string;
  paramName: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  animationConfig?: AnimationConfig;
  onAnimationUpdate?: (config: AnimationConfig) => void;
}

function SliderControl({ 
  label, 
  paramName,
  value, 
  min, 
  max, 
  step, 
  onChange,
  animationConfig,
  onAnimationUpdate,
}: SliderControlProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <label className="text-zinc-400">{label}</label>
          {animationConfig && onAnimationUpdate && (
            <AnimationControl
              paramName={label}
              config={animationConfig}
              paramRange={{ min, max, step }}
              onUpdate={onAnimationUpdate}
            />
          )}
        </div>
        <span className="text-zinc-300 font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={animationConfig?.enabled}
        className={`w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider ${
          animationConfig?.enabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />
    </div>
  );
}

// Hue slider control with rainbow gradient
interface HueSliderControlProps {
  label: string;
  paramName: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  animationConfig?: AnimationConfig;
  onAnimationUpdate?: (config: AnimationConfig) => void;
}

function HueSliderControl({ 
  label, 
  paramName,
  value, 
  min, 
  max, 
  step, 
  onChange,
  animationConfig,
  onAnimationUpdate,
}: HueSliderControlProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <label className="text-zinc-400">{label}</label>
          {animationConfig && onAnimationUpdate && (
            <AnimationControl
              paramName={label}
              config={animationConfig}
              paramRange={{ min, max, step }}
              onUpdate={onAnimationUpdate}
            />
          )}
        </div>
        <span className="text-zinc-300 font-mono">{value}°</span>
      </div>
      <div className="relative">
        {/* Rainbow gradient background */}
        <div 
          className="absolute inset-0 h-1 rounded-lg"
          style={{
            background: 'linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))',
            pointerEvents: 'none',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={animationConfig?.enabled}
          className={`relative w-full h-1 appearance-none cursor-pointer hue-slider ${
            animationConfig?.enabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
}

// Select control component
interface SelectControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function SelectControl({ label, value, onChange, options }: SelectControlProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { Effect, EffectType } from '../types/effects';
import type { EffectAnimations, AnimationConfig } from '../types/animation';
import type { Preset } from '../types/presets';
import EffectItem from './EffectItem';
import PresetManager from './PresetManager';

interface EffectsSidebarProps {
  effects: Effect[];
  animations: EffectAnimations;
  presets: Preset[];
  onAddEffect: (type: EffectType) => void;
  onUpdateEffect: (id: string, parameters: Effect['parameters']) => void;
  onToggleEffect: (id: string) => void;
  onDeleteEffect: (id: string) => void;
  onMoveEffect: (id: string, direction: 'up' | 'down') => void;
  onUpdateAnimation: (effectId: string, paramName: string, config: AnimationConfig) => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
  onPreviewPreset: (preset: Preset | null) => void;
}

export default function EffectsSidebar({
  effects,
  animations,
  presets,
  onAddEffect,
  onUpdateEffect,
  onToggleEffect,
  onDeleteEffect,
  onMoveEffect,
  onUpdateAnimation,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onPreviewPreset,
}: EffectsSidebarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddEffect = (type: EffectType) => {
    onAddEffect(type);
    setShowAddMenu(false);
  };

  return (
    <div className="w-[280px] h-full bg-black border-l border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-300">Effects</h2>
      </div>

      {/* Preset Manager */}
      <PresetManager
        currentEffects={effects}
        currentAnimations={animations}
        presets={presets}
        onSavePreset={onSavePreset}
        onLoadPreset={onLoadPreset}
        onDeletePreset={onDeletePreset}
        onPreviewPreset={onPreviewPreset}
      />

      {/* Add Effect Button */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full px-3 py-2 text-xs border border-zinc-800 hover:border-zinc-600 rounded transition-colors text-zinc-400 hover:text-zinc-300"
          >
            + Add Effect
          </button>

          {/* Dropdown menu */}
          {showAddMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowAddMenu(false)}
              />

              {/* Menu */}
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded shadow-lg z-20 overflow-hidden">
                <button
                  onClick={() => handleAddEffect('color')}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-zinc-800 transition-colors text-zinc-300"
                >
                  Color
                  <span className="block text-zinc-500 mt-0.5">Change HSL color</span>
                </button>
                <button
                  onClick={() => handleAddEffect('subdivide')}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-zinc-800 transition-colors text-zinc-300 border-t border-zinc-800"
                >
                  Subdivide
                  <span className="block text-zinc-500 mt-0.5">Add curve points</span>
                </button>
                <button
                  onClick={() => handleAddEffect('multiply')}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-zinc-800 transition-colors text-zinc-300 border-t border-zinc-800"
                >
                  Multiply
                  <span className="block text-zinc-500 mt-0.5">Duplicate letters</span>
                </button>
                <button
                  onClick={() => handleAddEffect('distortion')}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-zinc-800 transition-colors text-zinc-300 border-t border-zinc-800"
                >
                  Distortion
                  <span className="block text-zinc-500 mt-0.5">Wave deformation</span>
                </button>
                <button
                  onClick={() => handleAddEffect('outline')}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-zinc-800 transition-colors text-zinc-300 border-t border-zinc-800"
                >
                  Outline
                  <span className="block text-zinc-500 mt-0.5">Expand outward</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Effects Stack */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {effects.length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-8">
            No effects added yet.
            <br />
            Click "Add Effect" to begin.
          </div>
        ) : (
          effects.map((effect, index) => (
            <EffectItem
              key={effect.id}
              effect={effect}
              index={index}
              total={effects.length}
              animations={animations[effect.id] || {}}
              onUpdate={onUpdateEffect}
              onToggle={onToggleEffect}
              onDelete={onDeleteEffect}
              onMove={onMoveEffect}
              onUpdateAnimation={onUpdateAnimation}
            />
          ))
        )}
      </div>
    </div>
  );
}

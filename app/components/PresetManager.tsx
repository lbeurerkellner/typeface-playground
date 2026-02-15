'use client';

import { useState, useRef, useEffect } from 'react';
import { BsSave, BsFolder, BsX } from 'react-icons/bs';
import type { Preset } from '../types/presets';
import type { Effect } from '../types/effects';
import type { EffectAnimations } from '../types/animation';

interface PresetManagerProps {
  currentEffects: Effect[];
  currentAnimations: EffectAnimations;
  presets: Preset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
  onPreviewPreset: (preset: Preset | null) => void;
}

export default function PresetManager({
  currentEffects,
  currentAnimations,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onPreviewPreset,
}: PresetManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [presetName, setPresetName] = useState('');
  const saveInputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (showSaveDialog && saveInputRef.current) {
      saveInputRef.current.focus();
    }
  }, [showSaveDialog]);

  const handleSave = () => {
    if (!presetName.trim()) return;
    onSavePreset(presetName.trim());
    setPresetName('');
    setShowSaveDialog(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setShowSaveDialog(false);
      setPresetName('');
    }
  };

  const handlePresetClick = (presetId: string) => {
    onLoadPreset(presetId);
    setShowPresetMenu(false);
    onPreviewPreset(null); // Clear preview
  };

  const handlePresetHover = (preset: Preset) => {
    onPreviewPreset(preset);
  };

  const handlePresetLeave = () => {
    onPreviewPreset(null);
  };

  const handleDeletePreset = (e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    if (confirm('Delete this preset?')) {
      onDeletePreset(presetId);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-zinc-800 space-y-2">
      <div className="text-xs font-medium text-zinc-400 mb-2">Presets</div>
      
      <div className="flex gap-2">
        {/* Save Preset Button */}
        <div className="relative flex-1">
          {!showSaveDialog ? (
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={currentEffects.length === 0}
              className="w-full px-3 py-1.5 text-xs border border-zinc-800 hover:border-zinc-600 rounded transition-colors text-zinc-400 hover:text-zinc-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save current configuration as preset"
            >
              <BsSave size={12} />
              Save
            </button>
          ) : (
            <div className="flex gap-1">
              <input
                ref={saveInputRef}
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Preset name..."
                className="flex-1 px-2 py-1.5 text-xs bg-black border border-zinc-600 rounded focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 outline-none"
              />
              <button
                onClick={handleSave}
                disabled={!presetName.trim()}
                className="px-2 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setPresetName('');
                }}
                className="px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                <BsX size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Load Preset Button */}
        <div className="relative">
          <button
            onClick={() => setShowPresetMenu(!showPresetMenu)}
            disabled={presets.length === 0}
            className="px-3 py-1.5 text-xs border border-zinc-800 hover:border-zinc-600 rounded transition-colors text-zinc-400 hover:text-zinc-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Load preset"
          >
            <BsFolder size={12} />
            Load
          </button>

          {/* Preset Dropdown */}
          {showPresetMenu && presets.length > 0 && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => {
                  setShowPresetMenu(false);
                  onPreviewPreset(null);
                }}
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-1 w-64 bg-zinc-900 border border-zinc-800 rounded shadow-lg z-30 max-h-80 overflow-y-auto">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handlePresetClick(preset.id)}
                    onMouseEnter={() => handlePresetHover(preset)}
                    onMouseLeave={handlePresetLeave}
                    className="group px-3 py-2 hover:bg-zinc-800 transition-colors cursor-pointer border-b border-zinc-800 last:border-b-0 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-300 font-medium truncate">
                        {preset.name}
                      </div>
                      <div className="text-xs text-zinc-600 mt-0.5">
                        {preset.effects.length} effect{preset.effects.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeletePreset(e, preset.id)}
                      className="ml-2 p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete preset"
                    >
                      <BsX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

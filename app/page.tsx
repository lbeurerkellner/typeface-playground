'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import FontRenderer from './components/FontRenderer';
import type { FontRendererHandle } from './components/FontRenderer';
import EffectsSidebar from './components/EffectsSidebar';
import GifExportDialog from './components/GifExportDialog';
import type { GifExportSettings } from './components/GifExportDialog';
import type { Effect, EffectType } from './types/effects';
import { createEffect } from './types/effects';
import type { EffectAnimations, AnimationConfig } from './types/animation';
import { useAnimationEngine } from './hooks/useAnimationEngine';
import type { Preset } from './types/presets';
import { exportGif, getDefaultDuration } from './utils/gifExporter';

interface FontFile {
  name: string;
  path: string;
  family: string;
}

export default function Home() {
  const [fonts, setFonts] = useState<FontFile[]>([]);
  const [selectedFont, setSelectedFont] = useState<string | null>(null);
  const [text, setText] = useState('Type');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [animations, setAnimations] = useState<EffectAnimations>({});
  const [presets, setPresets] = useState<Preset[]>([]);
  const [previewPreset, setPreviewPreset] = useState<Preset | null>(null);
  const [showGifDialog, setShowGifDialog] = useState(false);
  const [gifExporting, setGifExporting] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);
  const fontRendererRef = useRef<FontRendererHandle>(null);

  // Use preview preset if hovering, otherwise use actual effects
  const displayEffects = previewPreset?.effects ?? effects;
  const displayAnimations = previewPreset?.animations ?? animations;

  // Handle animated parameter updates
  const handleAnimatedParameterUpdate = useCallback((effectId: string, paramName: string, value: number) => {
    setEffects(prevEffects =>
      prevEffects.map(effect => {
        if (effect.id !== effectId) return effect;

        return {
          ...effect,
          parameters: {
            ...effect.parameters,
            [paramName]: value,
          },
        } as Effect;
      })
    );
  }, []);

  // Initialize animation engine (use actual effects/animations, not preview)
  useAnimationEngine(effects, animations, handleAnimatedParameterUpdate);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedFont = localStorage.getItem('selectedFont');
    const savedText = localStorage.getItem('text');
    const savedWireframe = localStorage.getItem('wireframeMode');
    const savedEffects = localStorage.getItem('effects');
    const savedAnimations = localStorage.getItem('animations');
    const savedPresets = localStorage.getItem('presets');
    
    if (savedText) {
      setText(savedText);
    }
    
    if (savedWireframe === 'true') {
      setWireframeMode(true);
    }
    
    if (savedEffects) {
      try {
        const parsed = JSON.parse(savedEffects);
        setEffects(parsed);
      } catch (err) {
        console.error('Failed to parse saved effects:', err);
      }
    }

    if (savedAnimations) {
      try {
        const parsed = JSON.parse(savedAnimations);
        setAnimations(parsed);
      } catch (err) {
        console.error('Failed to parse saved animations:', err);
      }
    }

    if (savedPresets) {
      try {
        const parsed = JSON.parse(savedPresets);
        setPresets(parsed);
      } catch (err) {
        console.error('Failed to parse saved presets:', err);
      }
    }
    
    fetch('/api/fonts')
      .then(res => res.json())
      .then(data => {
        setFonts(data.fonts);
        // Use saved font if available and valid, otherwise use first font
        if (savedFont && data.fonts.some((f: FontFile) => f.path === savedFont)) {
          setSelectedFont(savedFont);
        } else if (data.fonts.length > 0) {
          setSelectedFont(data.fonts[0].path);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load fonts:', err);
        setLoading(false);
      });
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (selectedFont) {
      localStorage.setItem('selectedFont', selectedFont);
    }
  }, [selectedFont]);

  useEffect(() => {
    localStorage.setItem('text', text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem('wireframeMode', wireframeMode.toString());
  }, [wireframeMode]);

  useEffect(() => {
    localStorage.setItem('effects', JSON.stringify(effects));
  }, [effects]);

  useEffect(() => {
    localStorage.setItem('animations', JSON.stringify(animations));
  }, [animations]);

  useEffect(() => {
    localStorage.setItem('presets', JSON.stringify(presets));
  }, [presets]);

  // Group fonts by family
  const fontsByFamily = fonts.reduce((acc, font) => {
    if (!acc[font.family]) {
      acc[font.family] = [];
    }
    acc[font.family].push(font);
    return acc;
  }, {} as Record<string, FontFile[]>);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleWireframe = () => {
    setWireframeMode(!wireframeMode);
  };

  const downloadSVG = () => {
    if (!fontRendererRef.current) return;
    
    const svgContent = fontRendererRef.current.getSVGContent();
    if (!svgContent) {
      alert('No SVG content to download');
      return;
    }

    // Create a blob from the SVG content
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `typeface-playground-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL
    URL.revokeObjectURL(url);
  };

  // Effect handler functions
  const addEffect = (type: EffectType) => {
    const newEffect = createEffect(type);
    setEffects([...effects, newEffect]);
  };

  const updateEffect = (id: string, parameters: Effect['parameters']) => {
    setEffects(effects.map(effect =>
      effect.id === id
        ? { ...effect, parameters } as Effect
        : effect
    ));
  };

  const toggleEffect = (id: string) => {
    setEffects(effects.map(effect =>
      effect.id === id
        ? { ...effect, enabled: !effect.enabled }
        : effect
    ));
  };

  const deleteEffect = (id: string) => {
    setEffects(effects.filter(effect => effect.id !== id));
  };

  const moveEffect = (id: string, direction: 'up' | 'down') => {
    const index = effects.findIndex(e => e.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= effects.length) return;

    const newEffects = [...effects];
    [newEffects[index], newEffects[newIndex]] = [newEffects[newIndex], newEffects[index]];
    setEffects(newEffects);
  };

  const updateAnimation = (effectId: string, paramName: string, config: AnimationConfig) => {
    setAnimations(prev => ({
      ...prev,
      [effectId]: {
        ...prev[effectId],
        [paramName]: config,
      },
    }));
  };

  // Preset handlers
  const savePreset = (name: string) => {
    const newPreset: Preset = {
      id: crypto.randomUUID(),
      name,
      effects: JSON.parse(JSON.stringify(effects)), // Deep clone
      animations: JSON.parse(JSON.stringify(animations)), // Deep clone
      createdAt: Date.now(),
    };
    setPresets([...presets, newPreset]);
  };

  const loadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    
    // Deep clone to avoid reference issues
    setEffects(JSON.parse(JSON.stringify(preset.effects)));
    setAnimations(JSON.parse(JSON.stringify(preset.animations)));
  };

  const deletePreset = (presetId: string) => {
    setPresets(presets.filter(p => p.id !== presetId));
  };

  const handlePreviewPreset = (preset: Preset | null) => {
    setPreviewPreset(preset);
  };

  // GIF export handler
  const handleGifExport = async (settings: GifExportSettings) => {
    const font = fontRendererRef.current?.getFont();
    if (!font) {
      alert('Font not loaded yet');
      return;
    }

    setGifExporting(true);
    setGifProgress(0);

    try {
      const blob = await exportGif(
        font,
        text,
        wireframeMode,
        effects,
        animations,
        settings,
        setGifProgress,
      );

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `typeface-playground-${Date.now()}.gif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShowGifDialog(false);
    } catch (err) {
      console.error('GIF export failed:', err);
      alert(`GIF export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGifExporting(false);
      setGifProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading fonts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Compact Controls Panel */}
      <div className={`border-b border-zinc-800 bg-black ${isFullscreen ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Title */}
            <h1 className="text-base font-light mr-2 text-zinc-400">Typeface Playground</h1>

            {/* Font Selector */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label htmlFor="font-select" className="text-xs text-zinc-500 whitespace-nowrap">
                Font
              </label>
              <select
                id="font-select"
                value={selectedFont || ''}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none"
              >
                {Object.entries(fontsByFamily).map(([family, familyFonts]) => (
                  <optgroup key={family} label={family}>
                    {familyFonts.map((font) => (
                      <option key={font.path} value={font.path}>
                        {font.name.replace(/\.(ttf|otf)$/i, '')}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Text Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <label htmlFor="text-input" className="text-xs text-zinc-500 whitespace-nowrap">
                Text
              </label>
              <textarea
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text..."
                rows={1}
                className="flex-1 px-2.5 py-1 text-xs bg-black border border-zinc-800 rounded focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none resize-none"
                style={{ minHeight: '26px' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleWireframe}
                className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                  wireframeMode
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'border border-zinc-800 hover:border-zinc-600'
                }`}
                title="Toggle wireframe mode"
              >
                {wireframeMode ? '●' : '○'}
              </button>
              <button
                onClick={downloadSVG}
                className="px-2.5 py-1 text-xs border border-zinc-800 hover:border-zinc-600 rounded transition-colors whitespace-nowrap"
                title="Download as SVG"
              >
                Save
              </button>
              <button
                onClick={() => setShowGifDialog(true)}
                className="px-2.5 py-1 text-xs border border-zinc-800 hover:border-zinc-600 rounded transition-colors whitespace-nowrap"
                title="Export animation as GIF"
              >
                GIF
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-2.5 py-1 text-xs border border-zinc-800 hover:border-zinc-600 rounded transition-colors whitespace-nowrap"
              >
                Full
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Controls (shown when in fullscreen mode) */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 text-xs border border-zinc-800 hover:border-zinc-600 rounded transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {/* Main Content Area with Sidebar */}
      <div className={`flex ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-48px)]'}`}>
        {/* Render Area */}
        <div className="flex-1">
          <FontRenderer 
            ref={fontRendererRef} 
            fontPath={selectedFont} 
            text={text}
            wireframeMode={wireframeMode}
            effects={displayEffects}
          />
        </div>

        {/* Effects Sidebar (hidden in fullscreen) */}
        {!isFullscreen && (
          <EffectsSidebar
            effects={effects}
            animations={animations}
            presets={presets}
            onAddEffect={addEffect}
            onUpdateEffect={updateEffect}
            onToggleEffect={toggleEffect}
            onDeleteEffect={deleteEffect}
            onMoveEffect={moveEffect}
            onUpdateAnimation={updateAnimation}
            onSavePreset={savePreset}
            onLoadPreset={loadPreset}
            onDeletePreset={deletePreset}
            onPreviewPreset={handlePreviewPreset}
          />
        )}
      </div>

      {/* GIF Export Dialog */}
      {showGifDialog && (
        <GifExportDialog
          defaultDuration={getDefaultDuration(animations)}
          isExporting={gifExporting}
          progress={gifProgress}
          onExport={handleGifExport}
          onCancel={() => {
            if (!gifExporting) {
              setShowGifDialog(false);
            }
          }}
        />
      )}
    </div>
  );
}

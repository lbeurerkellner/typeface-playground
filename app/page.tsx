'use client';

import { useEffect, useState, useRef } from 'react';
import FontRenderer from './components/FontRenderer';

interface FontFile {
  name: string;
  path: string;
  family: string;
}

export interface FontRendererHandle {
  getSVGContent: () => string | null;
}

export default function Home() {
  const [fonts, setFonts] = useState<FontFile[]>([]);
  const [selectedFont, setSelectedFont] = useState<string | null>(null);
  const [text, setText] = useState('Type');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const fontRendererRef = useRef<FontRendererHandle>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedFont = localStorage.getItem('selectedFont');
    const savedText = localStorage.getItem('text');
    const savedWireframe = localStorage.getItem('wireframeMode');
    
    if (savedText) {
      setText(savedText);
    }
    
    if (savedWireframe === 'true') {
      setWireframeMode(true);
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
    link.download = `type-tool-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading fonts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Compact Controls Panel */}
      <div className={`border-b border-gray-700 bg-gray-800 ${isFullscreen ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Title */}
            <h1 className="text-xl font-bold mr-2">Type Tool</h1>

            {/* Font Selector */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label htmlFor="font-select" className="text-sm text-gray-300 whitespace-nowrap">
                Font:
              </label>
              <select
                id="font-select"
                value={selectedFont || ''}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
              <label htmlFor="text-input" className="text-sm text-gray-300 whitespace-nowrap">
                Text:
              </label>
              <textarea
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text..."
                rows={1}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                style={{ minHeight: '32px' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleWireframe}
                className={`px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap ${
                  wireframeMode
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title="Toggle wireframe mode"
              >
                {wireframeMode ? '● Wireframe' : '○ Wireframe'}
              </button>
              <button
                onClick={downloadSVG}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors whitespace-nowrap"
                title="Download as SVG"
              >
                Save SVG
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors whitespace-nowrap"
              >
                Fullscreen
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
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors shadow-lg"
          >
            Exit Fullscreen
          </button>
        </div>
      )}

      {/* Render Area */}
      <div className={`${isFullscreen ? 'h-screen' : 'h-[calc(100vh-64px)]'}`}>
        <FontRenderer 
          ref={fontRendererRef} 
          fontPath={selectedFont} 
          text={text}
          wireframeMode={wireframeMode}
        />
      </div>
    </div>
  );
}

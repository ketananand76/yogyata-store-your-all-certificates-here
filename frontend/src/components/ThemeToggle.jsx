import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Laptop, Palette, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESETS = [
  { name: 'Purple', color: '#7c3aed', glow: 'rgba(124, 58, 237, 0.08)' },
  { name: 'Emerald', color: '#059669', glow: 'rgba(16, 185, 129, 0.08)' },
  { name: 'Cyberpunk', color: '#db2777', glow: 'rgba(236, 72, 153, 0.08)' },
  { name: 'Saffron', color: '#d97706', glow: 'rgba(245, 158, 11, 0.08)' },
  { name: 'Slate Blue', color: '#2563eb', glow: 'rgba(59, 130, 246, 0.08)' },
];

export default function ThemeToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('yogyata-theme') || 'dark');
  const [customColor, setCustomColor] = useState(localStorage.getItem('yogyata-custom-color') || '#7c3aed');
  
  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update theme settings on documentElement
  const applyTheme = (themeName, colorHex) => {
    setActiveTheme(themeName);
    localStorage.setItem('yogyata-theme', themeName);

    if (themeName === 'device') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isSystemDark ? 'dark' : 'light');
    } else if (themeName === 'custom') {
      document.documentElement.setAttribute('data-theme', 'custom');
      document.documentElement.style.setProperty('--custom-accent', colorHex);
      // Generate lighter and darker accent colors dynamically
      document.documentElement.style.setProperty('--custom-accent-light', adjustColor(colorHex, 30));
      document.documentElement.style.setProperty('--custom-accent-dark', adjustColor(colorHex, -30));
      document.documentElement.style.setProperty('--custom-accent-glow', `${colorHex}15`);
      localStorage.setItem('yogyata-custom-color', colorHex);
    } else {
      document.documentElement.setAttribute('data-theme', themeName);
      // Clean up custom inline styles if switching to default themes
      document.documentElement.style.removeProperty('--custom-accent');
      document.documentElement.style.removeProperty('--custom-accent-light');
      document.documentElement.style.removeProperty('--custom-accent-dark');
      document.documentElement.style.removeProperty('--custom-accent-glow');
    }
  };

  // Helper: adjust color lightness (simple HEX adjust)
  const adjustColor = (col, amt) => {
    let usePound = false;
    if (col[0] === "#") {
      col = col.slice(1);
      usePound = true;
    }
    let num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  };

  // Listen for system theme updates
  useEffect(() => {
    if (activeTheme === 'device') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [activeTheme]);

  // Initial apply
  useEffect(() => {
    applyTheme(activeTheme, customColor);
  }, []);

  const handlePresetSelect = (color) => {
    setCustomColor(color);
    applyTheme('custom', color);
    toast.success('Custom accent applied!', { id: 'preset-toast' });
  };

  const handleCustomColorInput = (e) => {
    const val = e.target.value;
    setCustomColor(val);
    applyTheme('custom', val);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[99] flex flex-col items-end gap-3" ref={panelRef}>
      {/* Settings Dialog Panel */}
      {isOpen && (
        <div className="w-80 rounded-2xl p-5 bg-[#09080f]/90 backdrop-blur-xl border border-purple-950/80 shadow-2xl animate-float-up space-y-4 text-left">
          <div className="flex items-center gap-1.5 border-b border-purple-950/40 pb-2.5">
            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
            <h4 className="font-accent text-xs font-bold text-white uppercase tracking-wider">Appearance Control</h4>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'device', label: 'Device', icon: Laptop },
              { id: 'custom', label: 'Custom', icon: Palette },
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = activeTheme === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => applyTheme(mode.id, customColor)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-[10px] font-bold transition-all gap-1.5 cursor-pointer ${
                    isActive
                      ? 'border-purple-500 bg-purple-950/20 text-purple-300 shadow-md shadow-purple-500/5'
                      : 'border-purple-950/40 bg-[#12111d]/50 text-gray-400 hover:text-white hover:border-purple-800/40'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Preset Colors Grid (Only shows if theme is Custom) */}
          {activeTheme === 'custom' && (
            <div className="space-y-3 pt-2 animate-float-up">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Accent presets</label>
              <div className="flex flex-wrap gap-2.5">
                {PRESETS.map((preset) => {
                  const isSelected = customColor.toLowerCase() === preset.color.toLowerCase();
                  return (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset.color)}
                      style={{ backgroundColor: preset.color }}
                      className="w-7 h-7 rounded-full flex items-center justify-center border border-white/10 hover:scale-110 active:scale-95 transition-transform cursor-pointer relative shadow-lg"
                      title={preset.name}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Color Picker */}
              <div className="flex items-center gap-3 pt-2.5 border-t border-purple-950/30">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-purple-950 flex items-center justify-center">
                  <input
                    type="color"
                    value={customColor}
                    onChange={handleCustomColorInput}
                    className="absolute inset-0 w-[150%] h-[150%] translate-x-[-15%] translate-y-[-15%] cursor-pointer"
                  />
                  <div
                    className="w-5 h-5 rounded-full pointer-events-none border border-white/20"
                    style={{ backgroundColor: customColor }}
                  ></div>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-white">Interactive Picker</p>
                  <p className="text-[8px] text-gray-500">Pick any custom neon accent color</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 border border-purple-400/20 hover:scale-105 active:scale-95 transition-all cursor-pointer relative group"
        title="Customize Layout Theme"
      >
        <Palette className="h-5 w-5 animate-pulse" />
        <span className="absolute right-14 bg-purple-950 text-purple-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-purple-800/40 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shrink-0 whitespace-nowrap">
          Theme Customizer
        </span>
      </button>
    </div>
  );
}

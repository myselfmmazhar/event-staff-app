'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  '#667eea', // Purple (default primary)
  '#764ba2', // Dark purple (default secondary)
  '#10b981', // Green
  '#059669', // Dark green
  '#3b82f6', // Blue
  '#1d4ed8', // Dark blue
  '#f59e0b', // Orange
  '#d97706', // Dark orange
  '#ef4444', // Red
  '#dc2626', // Dark red
  '#8b5cf6', // Violet
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#000000', // Black
  '#374151', // Gray
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Validate hex color
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handlePresetClick = (color: string) => {
    setInputValue(color);
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 border rounded-md hover:bg-muted/50 transition-colors text-left"
          >
            <div
              className="w-6 h-6 rounded border border-border"
              style={{ backgroundColor: value }}
            />
            <span className="font-mono text-sm">{value}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Hex Color</Label>
              <div className="flex gap-2">
                <div
                  className="w-10 h-10 rounded border border-border shrink-0"
                  style={{ backgroundColor: inputValue }}
                />
                <Input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="#667eea"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Presets</Label>
              <div className="grid grid-cols-8 gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handlePresetClick(color)}
                    className={`w-6 h-6 rounded border transition-transform hover:scale-110 ${
                      color === value ? 'ring-2 ring-primary ring-offset-1' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Custom</Label>
              <input
                type="color"
                value={value}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  onChange(e.target.value);
                }}
                className="w-full h-8 cursor-pointer rounded"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

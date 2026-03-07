import React, { useState, useCallback } from 'react';

const PALETTE = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00',
  '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FF8800', '#8800FF', '#888888', '#FF4444',
  '#44FF44', '#4444FF', '#FFAA00', '#AA5500',
];

interface PixelArtGridProps {
  size: number;
  title?: string;
}

export default function PixelArtGrid({ size, title }: PixelArtGridProps) {
  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: size }, () => Array(size).fill('#FFFFFF'))
  );
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);

  const cellSize = size <= 8 ? 40 : 24;

  const paint = useCallback((row: number, col: number) => {
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = next[row][col] === selectedColor ? '#FFFFFF' : selectedColor;
      return next;
    });
  }, [selectedColor]);

  const clearGrid = () => {
    setGrid(Array.from({ length: size }, () => Array(size).fill('#FFFFFF')));
  };

  return (
    <div style={{ marginBottom: '2rem' }} className="pixel-art-widget no-print">
      {title && <h4>{title}</h4>}

      {/* Color Palette */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', marginRight: '4px' }}>Color:</span>
        {PALETTE.map(color => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            style={{
              width: 24,
              height: 24,
              backgroundColor: color,
              border: selectedColor === color ? '3px solid #333' : '1px solid #ccc',
              borderRadius: 3,
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label={`Select color ${color}`}
          />
        ))}
        <button
          onClick={clearGrid}
          style={{ marginLeft: '12px', padding: '4px 12px', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Clear
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
          border: '2px solid #333',
          cursor: 'crosshair',
          userSelect: 'none',
        }}
        onMouseLeave={() => setIsDrawing(false)}
      >
        {grid.map((row, r) =>
          row.map((color, c) => (
            <div
              key={`${r}-${c}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDrawing(true);
                paint(r, c);
              }}
              onMouseUp={() => setIsDrawing(false)}
              onMouseEnter={() => {
                if (isDrawing) paint(r, c);
              }}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: color,
                border: '1px solid #ddd',
                boxSizing: 'border-box',
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

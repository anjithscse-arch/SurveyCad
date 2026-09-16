import React from 'react';
import { ViewportTransform } from '../../types/geometry';
import { screenToWorld, worldToScreen } from '../../geometry/transform';

interface GridRendererProps {
  viewport: ViewportTransform;
  gridSpacingMeters?: number;
}

export const GridRenderer: React.FC<GridRendererProps> = ({ viewport, gridSpacingMeters = 5 }) => {
  const { zoom, width, height } = viewport;

  // Adapt grid spacing based on zoom so lines are neither too dense nor too sparse
  let effectiveSpacing = gridSpacingMeters;
  const pixelSpacing = effectiveSpacing * zoom;

  if (pixelSpacing < 30) {
    if (pixelSpacing * 2 >= 30) effectiveSpacing *= 2;
    else if (pixelSpacing * 5 >= 30) effectiveSpacing *= 5;
    else if (pixelSpacing * 10 >= 30) effectiveSpacing *= 10;
    else if (pixelSpacing * 20 >= 30) effectiveSpacing *= 20;
    else effectiveSpacing *= 50;
  } else if (pixelSpacing > 200) {
    if (pixelSpacing / 2 <= 200) effectiveSpacing /= 2;
    else if (pixelSpacing / 5 <= 200) effectiveSpacing /= 5;
    else effectiveSpacing /= 10;
  }

  // Get world coordinates of viewport corners
  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToWorld({ x: width, y: height }, viewport);

  const minX = Math.min(topLeft.x, bottomRight.x);
  const maxX = Math.max(topLeft.x, bottomRight.x);
  const minY = Math.min(topLeft.y, bottomRight.y);
  const maxY = Math.max(topLeft.y, bottomRight.y);

  // Align start lines to multiples of spacing
  const startX = Math.floor(minX / effectiveSpacing) * effectiveSpacing;
  const endX = Math.ceil(maxX / effectiveSpacing) * effectiveSpacing;
  const startY = Math.floor(minY / effectiveSpacing) * effectiveSpacing;
  const endY = Math.ceil(maxY / effectiveSpacing) * effectiveSpacing;

  const verticalLines: { screenX: number; worldX: number; isMajor: boolean }[] = [];
  for (let x = startX; x <= endX; x += effectiveSpacing) {
    const s = worldToScreen({ x, y: 0 }, viewport);
    const isMajor = Math.abs(x % (effectiveSpacing * 5)) < 1e-5 || Math.abs(x) < 1e-5;
    verticalLines.push({ screenX: s.x, worldX: x, isMajor });
  }

  const horizontalLines: { screenY: number; worldY: number; isMajor: boolean }[] = [];
  for (let y = startY; y <= endY; y += effectiveSpacing) {
    const s = worldToScreen({ x: 0, y }, viewport);
    const isMajor = Math.abs(y % (effectiveSpacing * 5)) < 1e-5 || Math.abs(y) < 1e-5;
    horizontalLines.push({ screenY: s.y, worldY: y, isMajor });
  }

  // Axis positions
  const originScreen = worldToScreen({ x: 0, y: 0 }, viewport);

  return (
    <g className="cad-grid-layer" pointerEvents="none">
      {/* Grid Lines */}
      {verticalLines.map((line, i) => (
        <line
          key={`v-${i}`}
          x1={line.screenX}
          y1={0}
          x2={line.screenX}
          y2={height}
          stroke={line.isMajor ? 'var(--canvas-grid-major)' : 'var(--canvas-grid-minor)'}
          strokeWidth={line.isMajor ? 1 : 0.5}
        />
      ))}

      {horizontalLines.map((line, i) => (
        <line
          key={`h-${i}`}
          x1={0}
          y1={line.screenY}
          x2={width}
          y2={line.screenY}
          stroke={line.isMajor ? 'var(--canvas-grid-major)' : 'var(--canvas-grid-minor)'}
          strokeWidth={line.isMajor ? 1 : 0.5}
        />
      ))}

      {/* Primary Coordinate Axes (X = 0, Y = 0) */}
      {originScreen.x >= 0 && originScreen.x <= width && (
        <line
          x1={originScreen.x}
          y1={0}
          x2={originScreen.x}
          y2={height}
          stroke="var(--canvas-axis)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      )}
      {originScreen.y >= 0 && originScreen.y <= height && (
        <line
          x1={0}
          y1={originScreen.y}
          x2={width}
          y2={originScreen.y}
          stroke="var(--canvas-axis)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      )}
    </g>
  );
};

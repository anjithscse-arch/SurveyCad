import React from 'react';
import { ViewportTransform } from '../../types/geometry';
import { SnapResult } from '../../geometry/snap';
import { worldToScreen } from '../../geometry/transform';

interface SnapIndicatorProps {
  snap: SnapResult | null;
  viewport: ViewportTransform;
}

export const SnapIndicator: React.FC<SnapIndicatorProps> = ({ snap, viewport }) => {
  if (!snap) return null;

  const s = worldToScreen(snap.point, viewport);

  return (
    <g className="cad-snap-indicator" pointerEvents="none" transform={`translate(${s.x}, ${s.y})`}>
      {/* Outer pulsing ring */}
      <circle r="9" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />

      {/* Snap Icon by Type */}
      {snap.type === 'endpoint' && (
        <rect x="-4" y="-4" width="8" height="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      )}
      {snap.type === 'midpoint' && (
        <polygon points="0,-5 5,4 -5,4" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      )}
      {snap.type === 'intersection' && (
        <g stroke="#f59e0b" strokeWidth="1.5">
          <line x1="-5" y1="-5" x2="5" y2="5" />
          <line x1="-5" y1="5" x2="5" y2="-5" />
        </g>
      )}
      {snap.type === 'grid' && (
        <circle r="3" fill="#f59e0b" />
      )}
      {snap.type === 'nearest' && (
        <circle r="4" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      )}

      {/* Snap Label tooltip */}
      <g transform="translate(12, -10)">
        <rect x="0" y="-10" width={snap.description.length * 7 + 10} height="16" rx="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="0.8" />
        <text x="5" y="2" fill="#f59e0b" fontSize="9px" fontFamily="var(--font-mono)" fontWeight="600">
          {snap.description}
        </text>
      </g>
    </g>
  );
};

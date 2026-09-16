import React from 'react';
import { ViewportTransform } from '../../types/geometry';

interface ScaleBarProps {
  viewport: ViewportTransform;
}

export const ScaleBar: React.FC<ScaleBarProps> = ({ viewport }) => {
  const { zoom } = viewport;

  // Choose a nice round world distance (1m, 2m, 5m, 10m, 20m, 50m, 100m, etc.)
  // such that screen width is between 60px and 160px
  const targetPx = 100;
  const rawMeters = targetPx / zoom;

  const pow10 = Math.pow(10, Math.floor(Math.log10(rawMeters)));
  const normalized = rawMeters / pow10;

  let roundMeters = pow10;
  if (normalized >= 5) roundMeters = 5 * pow10;
  else if (normalized >= 2) roundMeters = 2 * pow10;
  else roundMeters = pow10;

  const barWidthPx = roundMeters * zoom;

  // Approximate screen CAD scale (assuming standard 96 DPI screen: 1m = 3779.5 pixels)
  // Scale = (zoom pixels / meter) / (3779.5 pixels / meter) = 1 : (3779.5 / zoom)
  const scaleDenom = Math.round(3779.5 / zoom);

  return (
    <div
      className="scale-bar-widget"
      style={{
        background: 'var(--bg-panel)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '6px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxShadow: 'var(--shadow-md)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        <span>0</span>
        <span>{roundMeters >= 1000 ? `${(roundMeters / 1000).toFixed(1)} km` : `${roundMeters} m`}</span>
      </div>
      <div
        style={{
          width: barWidthPx,
          height: 5,
          background: 'linear-gradient(to right, #38bdf8 0%, #38bdf8 50%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.4) 100%)',
          border: '1px solid var(--border-strong)',
          borderRadius: '1px',
        }}
      />
      <div style={{ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        Scale ~1 : {scaleDenom.toLocaleString()}
      </div>
    </div>
  );
};

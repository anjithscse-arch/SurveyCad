import React, { useState } from 'react';
import { ReconstructedSurveyResult } from '../../sketch/types';
import { computeAreaResults } from '../../survey/validation';
import { formatNumber, formatArea, formatDistance } from '../../survey/units';
import { getBoundingBox } from '../../geometry/polygon';
import { worldToScreen, fitToBounds } from '../../geometry/transform';
import { CheckCircle2, SplitSquareVertical, Layers, ArrowRight, AlertTriangle } from 'lucide-react';

interface SketchComparisonProps {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  reconstructed: ReconstructedSurveyResult;
  onCommit: () => void;
  onBackToVerification: () => void;
}

export const SketchComparison: React.FC<SketchComparisonProps> = ({
  imageDataUrl,
  imageWidth,
  imageHeight,
  reconstructed,
  onCommit,
  onBackToVerification,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split');
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);

  const areaResults = computeAreaResults(reconstructed.points, reconstructed.isClosed);

  // Viewport for rendering the reconstructed geometry on the mini-canvas
  const miniCanvasWidth = 500;
  const miniCanvasHeight = 400;
  const bounds = getBoundingBox(reconstructed.points, 10);
  const vp = fitToBounds(bounds, miniCanvasWidth, miniCanvasHeight, 50);

  const pointMap = new Map(reconstructed.points.map((p) => [p.id, p]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Top Controls & Metrics Banner */}
      <div
        style={{
          background: 'var(--bg-panel-solid)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6,
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Calculated Area
            </div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
              {formatNumber(areaResults.sqMeters, 2)} m²
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                ({formatNumber(areaResults.cents, 2)} cents)
              </span>
            </div>
          </div>

          <div style={{ height: 28, width: 1, background: 'var(--border-subtle)' }} />

          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Perimeter & Closure
            </div>
            <div style={{ fontSize: 14, fontWeight: '600', color: 'var(--text-main)', fontFamily: 'monospace' }}>
              {formatNumber(areaResults.perimeterMeters, 2)} m
              <span style={{ fontSize: 11, color: reconstructed.closureError < 0.05 ? '#10b981' : '#f59e0b', marginLeft: 8 }}>
                (e = {reconstructed.closureError.toFixed(3)} m)
              </span>
            </div>
          </div>
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 2, borderRadius: 4 }}>
            <button
              className={`menu-btn ${viewMode === 'split' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setViewMode('split')}
            >
              <SplitSquareVertical size={13} /> Split View
            </button>
            <button
              className={`menu-btn ${viewMode === 'overlay' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setViewMode('overlay')}
            >
              <Layers size={13} /> Overlay View
            </button>
          </div>

          {viewMode === 'overlay' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Opacity:</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                style={{ width: 80 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Visual Comparison Canvas */}
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        {viewMode === 'split' ? (
          <>
            {/* Left: Original Rough Sketch */}
            <div
              style={{
                flex: 1,
                background: '#070a12',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(15,23,42,0.85)', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold', zIndex: 10 }}>
                Original Rough Field Sketch
              </div>
              <img
                src={imageDataUrl}
                alt="Original Sketch"
                style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }}
              />
            </div>

            {/* Right: Reconstructed Digital CAD Survey */}
            <div
              style={{
                flex: 1,
                background: '#070a12',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(15,23,42,0.85)', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold', zIndex: 10 }}>
                Exact Reconstructed CAD Geometry
              </div>
              <svg width="100%" height="100%" viewBox={`0 0 ${miniCanvasWidth} ${miniCanvasHeight}`}>
                {/* Polygon Fill */}
                <polygon
                  points={reconstructed.points.map((p) => {
                    const s = worldToScreen(p, vp);
                    return `${s.x},${s.y}`;
                  }).join(' ')}
                  fill="rgba(56, 189, 248, 0.18)"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />

                {/* Lines */}
                {reconstructed.lines.map((line) => {
                  const p1 = pointMap.get(line.startPointId);
                  const p2 = pointMap.get(line.endPointId);
                  if (!p1 || !p2) return null;
                  const s1 = worldToScreen(p1, vp);
                  const s2 = worldToScreen(p2, vp);
                  return (
                    <line
                      key={line.id}
                      x1={s1.x}
                      y1={s1.y}
                      x2={s2.x}
                      y2={s2.y}
                      stroke="#f8fafc"
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Stations */}
                {reconstructed.points.map((pt) => {
                  const s = worldToScreen(pt, vp);
                  return (
                    <g key={pt.id} transform={`translate(${s.x}, ${s.y})`}>
                      <circle r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="8" y="-6" fill="#38bdf8" fontSize="11px" fontWeight="bold" fontFamily="monospace">
                        {pt.label} ({pt.x.toFixed(1)}, {pt.y.toFixed(1)})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </>
        ) : (
          /* Overlay View */
          <div
            style={{
              flex: 1,
              background: '#070a12',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={imageDataUrl}
              alt="Base Sketch"
              style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', opacity: 1 - overlayOpacity * 0.4 }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                opacity: overlayOpacity,
              }}
            >
              <svg width="90%" height="90%" viewBox={`0 0 ${miniCanvasWidth} ${miniCanvasHeight}`}>
                <polygon
                  points={reconstructed.points.map((p) => {
                    const s = worldToScreen(p, vp);
                    return `${s.x},${s.y}`;
                  }).join(' ')}
                  fill="rgba(56, 189, 248, 0.25)"
                  stroke="#38bdf8"
                  strokeWidth="3"
                />
                {reconstructed.points.map((pt) => {
                  const s = worldToScreen(pt, vp);
                  return (
                    <g key={pt.id} transform={`translate(${s.x}, ${s.y})`}>
                      <circle r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                      <text x="10" y="-8" fill="#38bdf8" fontSize="13px" fontWeight="bold" fontFamily="monospace">
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <button className="btn-secondary" onClick={onBackToVerification}>
          ← Back to Verification
        </button>

        <button
          className="btn-primary"
          style={{
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={onCommit}
        >
          <CheckCircle2 size={16} /> Commit to SurveyCAD Project
        </button>
      </div>
    </div>
  );
};

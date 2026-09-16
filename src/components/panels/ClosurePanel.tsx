import React, { useState } from 'react';
import { useCAD } from '../../context/CADContext';
import { formatNumber } from '../../survey/units';
import { adjustTraverseBowditch, adjustTraverseTransit } from '../../survey/traverse';
import { AdjustTraverseCommand } from '../../commands/traverseCommands';
import { TraverseAdjustmentResult } from '../../types/survey';
import { SurveyPoint } from '../../types/geometry';
import { Check, Compass, Sliders, ArrowRight } from 'lucide-react';

export const ClosurePanel: React.FC = () => {
  const { project, closureResult, executeCommand } = useCAD();
  const [previewResult, setPreviewResult] = useState<TraverseAdjustmentResult | null>(null);

  // Determine active ordered points in closed traverse or project
  const closedPoly = project.polygons.find((p) => p.isClosed && p.pointIds.length >= 3);
  let activePoints: SurveyPoint[] = [];
  if (closedPoly) {
    const pointMap = new Map(project.points.map((pt) => [pt.id, pt]));
    activePoints = closedPoly.pointIds.map((id) => pointMap.get(id)).filter(Boolean) as SurveyPoint[];
  } else if (project.points.length >= 3) {
    activePoints = project.points;
  }

  const canAdjust = activePoints.length >= 3 && closureResult.closureError > 0.0001;

  const handleComputeAdjustment = (method: 'bowditch' | 'transit') => {
    if (!canAdjust) return;
    const result = method === 'bowditch'
      ? adjustTraverseBowditch(activePoints)
      : adjustTraverseTransit(activePoints);
    setPreviewResult(result);
  };

  const handleApplyAdjustment = () => {
    if (!previewResult) return;
    executeCommand(new AdjustTraverseCommand(previewResult.stations, previewResult.method));
    setPreviewResult(null);
  };

  return (
    <div className="cad-table-card" style={{ padding: '12px' }}>
      <div className="card-header" style={{ margin: '-12px -12px 10px -12px', padding: '8px 12px' }}>
        <span>Traverse Closure Analysis (SDD §62 & §65)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Σ ΔEasting (Departure):</span>
          <span style={{ color: Math.abs(closureResult.sumDeltaE) < 0.05 ? '#10b981' : '#f59e0b' }}>
            {closureResult.sumDeltaE >= 0 ? `+${closureResult.sumDeltaE.toFixed(3)}` : closureResult.sumDeltaE.toFixed(3)} m
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Σ ΔNorthing (Latitude):</span>
          <span style={{ color: Math.abs(closureResult.sumDeltaN) < 0.05 ? '#10b981' : '#f59e0b' }}>
            {closureResult.sumDeltaN >= 0 ? `+${closureResult.sumDeltaN.toFixed(3)}` : closureResult.sumDeltaN.toFixed(3)} m
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Linear Closure Error (e):</span>
          <span style={{ fontWeight: '700', color: closureResult.closureError < 0.05 ? '#10b981' : '#f59e0b' }}>
            {formatNumber(closureResult.closureError, 3)} m
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Relative Precision:</span>
          <span
            style={{
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '3px',
              background: closureResult.isAcceptable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: closureResult.isAcceptable ? '#10b981' : '#f59e0b',
            }}
          >
            {closureResult.precisionString}
          </span>
        </div>

        {/* Traverse Balancing Controls */}
        <div style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
            Traverse Adjustment
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={!canAdjust}
              onClick={() => handleComputeAdjustment('bowditch')}
              title="Compass Rule distributes error proportionally to leg lengths"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px' }}
            >
              <Compass size={12} /> Bowditch
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={!canAdjust}
              onClick={() => handleComputeAdjustment('transit')}
              title="Transit Rule distributes error proportionally to coordinate differences"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px' }}
            >
              <Sliders size={12} /> Transit
            </button>
          </div>
        </div>

        {/* Adjustment Preview Dialog / Expandable Box */}
        {previewResult && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            borderRadius: '6px',
            background: 'var(--bg-card)',
            border: '1px solid var(--accent-primary)',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
              Preview: {previewResult.method === 'bowditch' ? 'Bowditch Compass Rule' : 'Transit Rule'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Residual error: {previewResult.residualError < 0.0001 ? '0.000 m (Perfect Closure)' : `${previewResult.residualError.toFixed(4)} m`}
            </div>
            <div style={{ maxHeight: '110px', overflowY: 'auto', marginBottom: '8px' }}>
              <table style={{ width: '100%', fontSize: '10px', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th>Station</th>
                    <th>ΔE</th>
                    <th>ΔN</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.stations.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ fontWeight: 600 }}>{s.label}</td>
                      <td style={{ color: s.deltaX === 0 ? 'var(--text-muted)' : '#10b981' }}>
                        {s.deltaX >= 0 ? `+${s.deltaX.toFixed(3)}` : s.deltaX.toFixed(3)}
                      </td>
                      <td style={{ color: s.deltaY === 0 ? 'var(--text-muted)' : '#10b981' }}>
                        {s.deltaY >= 0 ? `+${s.deltaY.toFixed(3)}` : s.deltaY.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px' }}
                onClick={handleApplyAdjustment}
              >
                <Check size={12} /> Apply Balanced Coordinates
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '10px' }}
                onClick={() => setPreviewResult(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

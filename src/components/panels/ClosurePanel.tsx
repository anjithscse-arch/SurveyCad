import React from 'react';
import { useCAD } from '../../context/CADContext';
import { formatNumber } from '../../survey/units';

export const ClosurePanel: React.FC = () => {
  const { closureResult } = useCAD();

  return (
    <div className="cad-table-card" style={{ padding: '12px' }}>
      <div className="card-header" style={{ margin: '-12px -12px 10px -12px', padding: '8px 12px' }}>
        <span>Traverse Closure Analysis (SDD §62)</span>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
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
      </div>
    </div>
  );
};

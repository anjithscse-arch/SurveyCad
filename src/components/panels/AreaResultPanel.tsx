import React from 'react';
import { useCAD } from '../../context/CADContext';
import { formatNumber } from '../../survey/units';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const AreaResultPanel: React.FC = () => {
  const { areaResult, project } = useCAD();

  if (!areaResult.isValid) {
    return (
      <div className="cad-table-card" style={{ padding: '14px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}>
          <ShieldAlert size={28} style={{ margin: '0 auto', display: 'block', opacity: 0.6 }} />
        </div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
          Area Calculation Pending
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: 4 }}>
          {areaResult.validationError || 'Create at least 3 points and close the boundary to calculate enclosed area.'}
        </div>
      </div>
    );
  }

  return (
    <div className="cad-table-card" style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--accent-cyan)' }}>
          CALCULATED BOUNDARY MEASUREMENTS
        </span>
        {areaResult.hasSelfIntersections ? (
          <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', fontWeight: '600' }}>
            <AlertTriangle size={13} /> Self-Intersecting
          </span>
        ) : (
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', fontWeight: '600' }}>
            <CheckCircle2 size={13} /> Valid Geometry
          </span>
        )}
      </div>

      {/* Warning banner if self-intersecting */}
      {areaResult.hasSelfIntersections && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 4,
            padding: '8px',
            fontSize: '11px',
            color: '#fca5a5',
            marginBottom: 10,
          }}
        >
          <strong>Warning:</strong> Boundary edges cross each other. Enclosed area calculation may be invalid or misleading.
        </div>
      )}

      {/* Primary Compound Acre-Cent Callout */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(16, 185, 129, 0.12))',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: 6,
        padding: '10px 12px',
        marginBottom: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Cadastral Acre-Cent Notation
          </div>
          <div style={{ fontSize: '17px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
            {areaResult.acres >= 1
              ? `${Math.floor(areaResult.acres)} Ac ${(areaResult.cents % 100).toFixed(2)} Cts`
              : `${areaResult.cents.toFixed(2)} Cents`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Gunthas (1/40 ac)</div>
          <div style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#10b981' }}>
            {(areaResult.gunthas ?? (areaResult.acres * 40)).toFixed(2)} <span style={{ fontSize: '10px' }}>gth</span>
          </div>
        </div>
      </div>

      {/* Multi-unit Area Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: 12 }}>
        {/* Square Metres */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Square Metres</div>
          <div style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            {formatNumber(areaResult.sqMeters, project.settings.decimalPrecision)} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>m²</span>
          </div>
        </div>

        {/* Indian Cents */}
        <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '8px 10px', borderRadius: 4, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: '600' }}>Indian Cents (1/100 ac)</div>
          <div style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
            {formatNumber(areaResult.cents, 2)} <span style={{ fontSize: '11px' }}>cents</span>
          </div>
        </div>

        {/* Acres */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Acres</div>
          <div style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            {formatNumber(areaResult.acres, 4)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ac</span>
          </div>
        </div>

        {/* Square Feet */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Square Feet</div>
          <div style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            {formatNumber(areaResult.sqFeet, 2)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ft²</span>
          </div>
        </div>

        {/* Hectares */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Hectares</div>
          <div style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            {formatNumber(areaResult.hectares, 4)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ha</span>
          </div>
        </div>

        {/* Square Yards */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Square Yards</div>
          <div style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            {formatNumber(areaResult.sqYards, 2)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>yd²</span>
          </div>
        </div>
      </div>

      {/* Perimeter Breakdown */}
      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Perimeter:</span>
        <span style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
          {formatNumber(areaResult.perimeterMeters, 2)} m <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>({formatNumber(areaResult.perimeterFeet, 1)} ft)</span>
        </span>
      </div>
    </div>
  );
};

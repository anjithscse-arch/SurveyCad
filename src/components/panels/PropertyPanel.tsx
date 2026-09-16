import React from 'react';
import { useCAD } from '../../context/CADContext';
import { calculateBearing, formatDMS, formatQuadrantBearing } from '../../geometry/bearing';
import { distance } from '../../geometry/distance';
import { formatDistance, formatArea, formatNumber } from '../../survey/units';
import { polygonArea, polygonPerimeter } from '../../geometry/polygon';
import { SurveyPoint } from '../../types/geometry';

export const PropertyPanel: React.FC = () => {
  const {
    project,
    selectedPointIds,
    selectedLineIds,
    selectedPolygonId,
    updateMetadata,
  } = useCAD();

  const pointMap = new Map(project.points.map((p) => [p.id, p]));

  // 1. Selected Point Inspector
  if (selectedPointIds.length === 1) {
    const pt = pointMap.get(selectedPointIds[0]);
    if (pt) {
      return (
        <div className="cad-table-card" style={{ padding: '12px' }}>
          <div className="card-header" style={{ margin: '-12px -12px 10px -12px' }}>
            <span>Station Inspector</span>
            <span style={{ color: 'var(--accent-cyan)' }}>{pt.label}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Station ID:</span>
              <span>{pt.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Easting (X):</span>
              <span>{pt.x.toFixed(4)} m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Northing (Y):</span>
              <span>{pt.y.toFixed(4)} m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Elevation (Z):</span>
              <span>{pt.elevation !== undefined && pt.elevation !== null ? `${pt.elevation.toFixed(3)} m` : '—'}</span>
            </div>
          </div>
        </div>
      );
    }
  }

  // 2. Selected Line Inspector
  if (selectedLineIds.length === 1) {
    const line = project.lines.find((l) => l.id === selectedLineIds[0]);
    if (line) {
      const p1 = pointMap.get(line.startPointId);
      const p2 = pointMap.get(line.endPointId);
      if (p1 && p2) {
        const dist = distance(p1, p2);
        const bearing = calculateBearing(p1, p2);
        const dE = p2.x - p1.x;
        const dN = p2.y - p1.y;

        return (
          <div className="cad-table-card" style={{ padding: '12px' }}>
            <div className="card-header" style={{ margin: '-12px -12px 10px -12px' }}>
              <span>Survey Line Inspector</span>
              <span style={{ color: 'var(--accent-cyan)' }}>{p1.label} → {p2.label}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Length:</span>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                  {formatDistance(dist, project.settings.linearUnit, 3)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Whole Circle Bearing:</span>
                <span style={{ color: 'var(--accent-cyan)' }}>{formatDMS(bearing)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Quadrant Bearing:</span>
                <span style={{ color: 'var(--accent-cyan)' }}>{formatQuadrantBearing(bearing)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>ΔEasting:</span>
                <span>{dE >= 0 ? `+${dE.toFixed(3)}` : dE.toFixed(3)} m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>ΔNorthing:</span>
                <span>{dN >= 0 ? `+${dN.toFixed(3)}` : dN.toFixed(3)} m</span>
              </div>
            </div>
          </div>
        );
      }
    }
  }

  // 3. Project Metadata Quick Summary
  return (
    <div className="cad-table-card" style={{ padding: '12px' }}>
      <div className="card-header" style={{ margin: '-12px -12px 10px -12px' }}>
        <span>Project Summary</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Project:</span>
          <span style={{ fontWeight: '600' }}>{project.metadata.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Property:</span>
          <span>{project.metadata.propertyName || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Surveyor:</span>
          <span>{project.metadata.surveyor || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Total Points:</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{project.points.length}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Total Lines:</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{project.lines.length}</span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useCAD } from '../../context/CADContext';
import { distance } from '../../geometry/distance';
import { calculateBearing, formatDMS } from '../../geometry/bearing';
import { formatDistance } from '../../survey/units';
import { SurveyPoint } from '../../types/geometry';

export const LineTable: React.FC = () => {
  const { project, selectedLineIds, setSelectedLineIds, deleteArc } = useCAD();
  const pointMap = new Map<string, SurveyPoint>(project.points.map((p) => [p.id, p]));

  return (
    <div className="cad-table-card">
      <div className="card-header">
        <span>Survey Line Table ({project.lines.length} Lines)</span>
      </div>

      <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
        <table className="cad-data-table">
          <thead>
            <tr>
              <th>Line</th>
              <th>Leg</th>
              <th>Distance</th>
              <th>Bearing</th>
            </tr>
          </thead>
          <tbody>
            {project.lines.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '12px' }}>
                  No survey lines created yet.
                </td>
              </tr>
            ) : (
              project.lines.map((line, idx) => {
                const p1 = pointMap.get(line.startPointId);
                const p2 = pointMap.get(line.endPointId);
                if (!p1 || !p2) return null;

                const dist = distance(p1, p2);
                const bearing = calculateBearing(p1, p2);
                const isSelected = selectedLineIds.includes(line.id);

                return (
                  <tr
                    key={line.id}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => setSelectedLineIds([line.id])}
                  >
                    <td style={{ color: 'var(--accent-cyan)' }}>L{idx + 1}</td>
                    <td style={{ fontWeight: '600' }}>{p1.label} → {p2.label}</td>
                    <td>{formatDistance(dist, project.settings.linearUnit, project.settings.decimalPrecision)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDMS(bearing, false)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Curved Boundary Segments */}
      {project.arcs && project.arcs.length > 0 && (
        <>
          <div className="card-header" style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <span>Curved Boundary Segments ({project.arcs.length} Arcs)</span>
          </div>
          <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
            <table className="cad-data-table">
              <thead>
                <tr>
                  <th>Arc</th>
                  <th>Chord</th>
                  <th>Radius (R)</th>
                  <th>Arc (L)</th>
                  <th>Delta (Δ)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {project.arcs.map((arc, idx) => {
                  const p1 = pointMap.get(arc.startPointId);
                  const p2 = pointMap.get(arc.endPointId);
                  const legLabel = p1 && p2 ? `${p1.label} → ${p2.label}` : arc.id;
                  const deltaDeg = ((arc.deltaRad * 180) / Math.PI).toFixed(1);

                  return (
                    <tr key={arc.id}>
                      <td style={{ color: '#38bdf8', fontWeight: 600 }}>C{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{legLabel}</td>
                      <td>{formatDistance(arc.radius, project.settings.linearUnit, project.settings.decimalPrecision)}</td>
                      <td style={{ color: '#38bdf8' }}>{formatDistance(arc.arcLength, project.settings.linearUnit, project.settings.decimalPrecision)}</td>
                      <td>{deltaDeg}°</td>
                      <td>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteArc(arc.id); }}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 4px' }}
                          title="Delete Arc"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

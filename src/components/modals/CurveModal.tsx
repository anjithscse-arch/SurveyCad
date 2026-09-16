import React, { useState, useMemo } from 'react';
import { useCAD } from '../../context/CADContext';
import { SurveyArc } from '../../types/geometry';
import { solve3PointArc, solveRadiusChordArc, circularSegmentArea } from '../../geometry/arc';
import { formatDistance, formatArea } from '../../survey/units';
import { X, CornerDownRight, Trash2, Info } from 'lucide-react';

interface CurveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CurveModal: React.FC<CurveModalProps> = ({ isOpen, onClose }) => {
  const { project, addArc, deleteArc } = useCAD();

  const [mode, setMode] = useState<'3point' | 'radius_chord'>('3point');

  // 3-Point Mode state
  const [p1Id, setP1Id] = useState<string>('');
  const [p2Id, setP2Id] = useState<string>('');
  const [p3Id, setP3Id] = useState<string>('');

  // Radius + Chord Mode state
  const [rcP1Id, setRcP1Id] = useState<string>('');
  const [rcP2Id, setRcP2Id] = useState<string>('');
  const [radiusInput, setRadiusInput] = useState<string>('');
  const [isConvex, setIsConvex] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);

  const pointMap = useMemo(() => new Map(project.points.map((p) => [p.id, p])), [project.points]);

  // Solve 3-Point preview
  const threePointSolution = useMemo(() => {
    if (!p1Id || !p2Id || !p3Id) return null;
    if (p1Id === p2Id || p2Id === p3Id || p1Id === p3Id) return null;
    const pt1 = pointMap.get(p1Id);
    const pt2 = pointMap.get(p2Id);
    const pt3 = pointMap.get(p3Id);
    if (!pt1 || !pt2 || !pt3) return null;

    return solve3PointArc(pt1, pt2, pt3);
  }, [p1Id, p2Id, p3Id, pointMap]);

  // Solve Radius+Chord preview
  const radiusChordSolution = useMemo(() => {
    if (!rcP1Id || !rcP2Id || !radiusInput) return null;
    if (rcP1Id === rcP2Id) return null;
    const pt1 = pointMap.get(rcP1Id);
    const pt2 = pointMap.get(rcP2Id);
    if (!pt1 || !pt2) return null;

    const r = parseFloat(radiusInput);
    if (isNaN(r) || r <= 0) return null;

    return solveRadiusChordArc(pt1, pt2, r, isConvex);
  }, [rcP1Id, rcP2Id, radiusInput, isConvex, pointMap]);

  if (!isOpen) return null;

  const handleCreate3PointArc = () => {
    setError(null);
    if (!threePointSolution) {
      setError('Please select three distinct, non-collinear survey stations.');
      return;
    }

    const arc: SurveyArc = {
      id: `arc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      startPointId: p1Id,
      endPointId: p3Id,
      midPointId: p2Id,
      center: threePointSolution.center,
      radius: threePointSolution.radius,
      deltaRad: threePointSolution.deltaRad,
      arcLength: threePointSolution.arcLength,
      chordLength: threePointSolution.chordLength,
      isClockwise: threePointSolution.isClockwise,
      isConvexOrOutward: true,
      isConvex: true,
      sweepFlag: threePointSolution.sweepFlag,
    };

    addArc(arc);
    onClose();
  };

  const handleCreateRadiusChordArc = () => {
    setError(null);
    if (!radiusChordSolution) {
      setError('Invalid radius or chord. Radius must be at least half the chord distance.');
      return;
    }

    const arc: SurveyArc = {
      id: `arc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      startPointId: rcP1Id,
      endPointId: rcP2Id,
      center: radiusChordSolution.center,
      radius: radiusChordSolution.radius,
      deltaRad: radiusChordSolution.deltaRad,
      arcLength: radiusChordSolution.arcLength,
      chordLength: radiusChordSolution.chordLength,
      isClockwise: radiusChordSolution.isClockwise,
      isConvexOrOutward: isConvex,
      isConvex,
      sweepFlag: radiusChordSolution.sweepFlag,
    };

    addArc(arc);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="modal-title">Circular Curves & Arcs Tool</span>
            <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', borderRadius: 4, fontWeight: 600 }}>
              EXACT GEOMETRY
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
          <button
            type="button"
            onClick={() => { setMode('3point'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: mode === '3point' ? 'rgba(56,189,248,0.12)' : 'transparent',
              border: 'none',
              borderBottom: mode === '3point' ? '2px solid #38bdf8' : '2px solid transparent',
              color: mode === '3point' ? '#38bdf8' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            1. 3-Point Curve (P1-P2-P3)
          </button>
          <button
            type="button"
            onClick={() => { setMode('radius_chord'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: mode === 'radius_chord' ? 'rgba(56,189,248,0.12)' : 'transparent',
              border: 'none',
              borderBottom: mode === 'radius_chord' ? '2px solid #38bdf8' : '2px solid transparent',
              color: mode === 'radius_chord' ? '#38bdf8' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            2. Radius + Chord Curve
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, color: '#fca5a5', fontSize: 11 }}>
              {error}
            </div>
          )}

          {project.points.length < 2 && (
            <div style={{ padding: 12, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 6, color: '#facc15', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Info size={16} />
              <span>You need at least {mode === '3point' ? 3 : 2} survey stations in your drawing to construct a curve.</span>
            </div>
          )}

          {mode === '3point' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Define a curved boundary edge passing through 3 known survey stations (Start, On-curve point, and End).
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Start Station (P1)</label>
                  <select className="form-input" value={p1Id} onChange={(e) => setP1Id(e.target.value)}>
                    <option value="">Select station...</option>
                    {project.points.map((p) => (
                      <option key={p.id} value={p.id}>{p.label} ({p.x.toFixed(1)}, {p.y.toFixed(1)})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">On-Curve Station (P2)</label>
                  <select className="form-input" value={p2Id} onChange={(e) => setP2Id(e.target.value)}>
                    <option value="">Select station...</option>
                    {project.points.map((p) => (
                      <option key={p.id} value={p.id}>{p.label} ({p.x.toFixed(1)}, {p.y.toFixed(1)})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">End Station (P3)</label>
                  <select className="form-input" value={p3Id} onChange={(e) => setP3Id(e.target.value)}>
                    <option value="">Select station...</option>
                    {project.points.map((p) => (
                      <option key={p.id} value={p.id}>{p.label} ({p.x.toFixed(1)}, {p.y.toFixed(1)})</option>
                    ))}
                  </select>
                </div>
              </div>

              {threePointSolution && (
                <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 6, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Calculated Curve Parameters
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Radius (R): </span>
                      <strong style={{ color: '#fff' }}>{formatDistance(threePointSolution.radius, project.settings.linearUnit, project.settings.decimalPrecision)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Arc Length (L): </span>
                      <strong style={{ color: '#38bdf8' }}>{formatDistance(threePointSolution.arcLength, project.settings.linearUnit, project.settings.decimalPrecision)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Chord Length (C): </span>
                      <strong style={{ color: '#fff' }}>{formatDistance(threePointSolution.chordLength, project.settings.linearUnit, project.settings.decimalPrecision)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Central Angle (Δ): </span>
                      <strong style={{ color: '#fff' }}>{((threePointSolution.deltaRad * 180) / Math.PI).toFixed(2)}°</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6, marginTop: 2 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Segment Area Contribution: </span>
                      <strong style={{ color: '#34d399' }}>
                        +{formatArea(circularSegmentArea(threePointSolution.radius, threePointSolution.deltaRad), project.settings.areaUnit, project.settings.decimalPrecision)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'radius_chord' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Construct a roadway / civil curve between two boundary stations with a specified Radius and convexity.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Start Station (P1)</label>
                  <select className="form-input" value={rcP1Id} onChange={(e) => setRcP1Id(e.target.value)}>
                    <option value="">Select station...</option>
                    {project.points.map((p) => (
                      <option key={p.id} value={p.id}>{p.label} ({p.x.toFixed(1)}, {p.y.toFixed(1)})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">End Station (P2)</label>
                  <select className="form-input" value={rcP2Id} onChange={(e) => setRcP2Id(e.target.value)}>
                    <option value="">Select station...</option>
                    {project.points.map((p) => (
                      <option key={p.id} value={p.id}>{p.label} ({p.x.toFixed(1)}, {p.y.toFixed(1)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Curve Radius (R in {project.settings.linearUnit})</label>
                  <input
                    className="form-input"
                    type="number"
                    step="any"
                    min="0.1"
                    placeholder="e.g. 25.0"
                    value={radiusInput}
                    onChange={(e) => setRadiusInput(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Convexity (Bulge)</label>
                  <select
                    className="form-input"
                    value={isConvex ? 'convex' : 'concave'}
                    onChange={(e) => setIsConvex(e.target.value === 'convex')}
                  >
                    <option value="convex">Convex (Bulges Outward / Adds Area)</option>
                    <option value="concave">Concave (Bulges Inward / Deducts Area)</option>
                  </select>
                </div>
              </div>

              {radiusChordSolution && (
                <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 6, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Calculated Curve Parameters
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Radius (R): </span>
                      <strong style={{ color: '#fff' }}>{formatDistance(radiusChordSolution.radius, project.settings.linearUnit, project.settings.decimalPrecision)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Arc Length (L): </span>
                      <strong style={{ color: '#38bdf8' }}>{formatDistance(radiusChordSolution.arcLength, project.settings.linearUnit, project.settings.decimalPrecision)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Chord Length (C): </span>
                      <strong style={{ color: '#fff' }}>{formatDistance(radiusChordSolution.chordLength, project.settings.linearUnit, project.settings.decimalPrecision)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Central Angle (Δ): </span>
                      <strong style={{ color: '#fff' }}>{((radiusChordSolution.deltaRad * 180) / Math.PI).toFixed(2)}°</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6, marginTop: 2 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Segment Area Adjustment: </span>
                      <strong style={{ color: isConvex ? '#34d399' : '#f87171' }}>
                        {isConvex ? '+' : '-'}
                        {formatArea(circularSegmentArea(radiusChordSolution.radius, radiusChordSolution.deltaRad), project.settings.areaUnit, project.settings.decimalPrecision)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Existing Project Arcs List */}
          {project.arcs && project.arcs.length > 0 && (
            <div style={{ marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                Existing Curved Edges ({project.arcs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                {project.arcs.map((arc) => {
                  const pStart = pointMap.get(arc.startPointId)?.label || arc.startPointId;
                  const pEnd = pointMap.get(arc.endPointId)?.label || arc.endPointId;
                  return (
                    <div
                      key={arc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CornerDownRight size={13} color="#38bdf8" />
                        <span style={{ fontWeight: 600, color: '#fff' }}>
                          {pStart} → {pEnd}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          (R = {arc.radius.toFixed(1)}m, L = {arc.arcLength.toFixed(1)}m)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteArc(arc.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 2 }}
                        title="Delete Arc"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          {mode === '3point' ? (
            <button
              className="btn btn-primary"
              disabled={!threePointSolution}
              onClick={handleCreate3PointArc}
              type="button"
            >
              Add 3-Point Arc
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={!radiusChordSolution}
              onClick={handleCreateRadiusChordArc}
              type="button"
            >
              Add Radius Arc
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

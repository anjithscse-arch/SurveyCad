import React, { useState, useMemo } from 'react';
import { useCAD } from '../../context/CADContext';
import {
  solveChainSurvey,
  diagonalsNeeded,
  solveChainSurveyArc,
  ChainSurveyError,
} from '../../geometry/chainSurvey';
import {
  buildChainSurveyPoints,
  AddChainSurveyBoundaryCommand,
} from '../../commands/chainSurveyCommands';
import { polygonArea, polygonPerimeter, polygonCentroid } from '../../geometry/polygon';
import { circularSegmentArea } from '../../geometry/arc';
import { convertDistance, formatDistance, formatArea, LINEAR_LABELS } from '../../survey/units';
import { SurveyArc } from '../../types/geometry';
import { X, Link2, Info, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SideInput {
  length: string;
  curveType: 'straight' | 'outward' | 'inward';
  midOrdinate: string;
}

interface ChainSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChainSurveyModal: React.FC<ChainSurveyModalProps> = ({ isOpen, onClose }) => {
  const { project, executeCommand } = useCAD();
  const unit = project.settings.linearUnit;
  const unitLabel = LINEAR_LABELS[unit];

  const [numSides, setNumSides] = useState<number>(4);
  const [polygonName, setPolygonName] = useState<string>(
    project.metadata.propertyName || 'Chain Survey Boundary'
  );
  const [sides, setSides] = useState<SideInput[]>([
    { length: '', curveType: 'straight', midOrdinate: '' },
    { length: '', curveType: 'straight', midOrdinate: '' },
    { length: '', curveType: 'straight', midOrdinate: '' },
    { length: '', curveType: 'straight', midOrdinate: '' },
  ]);
  const [diagonals, setDiagonals] = useState<string[]>(['']);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle changing number of sides (3 to 12)
  const handleSidesCountChange = (n: number) => {
    const clamped = Math.max(3, Math.min(12, n));
    setNumSides(clamped);

    setSides((prev) => {
      const next = [...prev];
      while (next.length < clamped) {
        next.push({ length: '', curveType: 'straight', midOrdinate: '' });
      }
      return next.slice(0, clamped);
    });

    const neededDiags = diagonalsNeeded(clamped);
    setDiagonals((prev) => {
      const next = [...prev];
      while (next.length < neededDiags) {
        next.push('');
      }
      return next.slice(0, neededDiags);
    });
    setSubmitError(null);
  };

  const handleSideChange = (index: number, partial: Partial<SideInput>) => {
    setSides((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...partial };
      return copy;
    });
    setSubmitError(null);
  };

  const handleDiagonalChange = (index: number, val: string) => {
    setDiagonals((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
    setSubmitError(null);
  };

  // Live computation preview
  const livePreview = useMemo(() => {
    const parsedSides: number[] = [];
    for (let i = 0; i < numSides; i++) {
      const val = parseFloat(sides[i]?.length || '');
      if (isNaN(val) || val <= 0) return null;
      parsedSides.push(convertDistance(val, unit, 'm'));
    }

    const needed = diagonalsNeeded(numSides);
    const parsedDiagonals: number[] = [];
    for (let i = 0; i < needed; i++) {
      const val = parseFloat(diagonals[i] || '');
      if (isNaN(val) || val <= 0) return null;
      parsedDiagonals.push(convertDistance(val, unit, 'm'));
    }

    try {
      const solution = solveChainSurvey(parsedSides, parsedDiagonals);
      const baseAreaM2 = polygonArea(solution.points);
      const basePerimeterM = polygonPerimeter(solution.points);
      const centroid = polygonCentroid(solution.points);

      let adjustedAreaM2 = baseAreaM2;
      let adjustedPerimeterM = basePerimeterM;
      let hasCurved = false;

      for (let i = 0; i < numSides; i++) {
        const sideCfg = sides[i];
        if (sideCfg.curveType !== 'straight') {
          const mVal = parseFloat(sideCfg.midOrdinate);
          if (!isNaN(mVal) && mVal > 0) {
            const mMeters = convertDistance(mVal, unit, 'm');
            const p1 = solution.points[i];
            const p2 = solution.points[(i + 1) % numSides];
            const solvedArc = solveChainSurveyArc(p1, p2, mMeters, sideCfg.curveType, centroid);
            const segArea = circularSegmentArea(
              solvedArc.arcResult.radius,
              solvedArc.arcResult.deltaRad
            );

            if (sideCfg.curveType === 'outward') {
              adjustedAreaM2 += segArea;
            } else {
              adjustedAreaM2 -= segArea;
            }
            adjustedPerimeterM +=
              solvedArc.arcResult.arcLength - solvedArc.arcResult.chordLength;
            hasCurved = true;
          }
        }
      }

      return {
        success: true as const,
        points: solution.points,
        centroid,
        baseAreaM2,
        adjustedAreaM2: Math.max(0, adjustedAreaM2),
        basePerimeterM,
        adjustedPerimeterM,
        hasCurved,
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Geometric calculation error';
      return {
        success: false as const,
        error: msg,
      };
    }
  }, [numSides, sides, diagonals, unit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate inputs
    const parsedSides: number[] = [];
    for (let i = 0; i < numSides; i++) {
      const val = parseFloat(sides[i]?.length || '');
      if (isNaN(val) || val <= 0) {
        setSubmitError(`Please enter a valid positive length for Side ${i + 1}.`);
        return;
      }
      parsedSides.push(convertDistance(val, unit, 'm'));
    }

    const needed = diagonalsNeeded(numSides);
    const parsedDiagonals: number[] = [];
    for (let i = 0; i < needed; i++) {
      const val = parseFloat(diagonals[i] || '');
      if (isNaN(val) || val <= 0) {
        setSubmitError(`Please enter a valid positive length for Diagonal P1 → P${i + 3}.`);
        return;
      }
      parsedDiagonals.push(convertDistance(val, unit, 'm'));
    }

    // Validate curved sides
    for (let i = 0; i < numSides; i++) {
      const sideCfg = sides[i];
      if (sideCfg.curveType !== 'straight') {
        const mVal = parseFloat(sideCfg.midOrdinate);
        if (isNaN(mVal) || mVal <= 0) {
          setSubmitError(
            `Please enter a positive curve offset (mid-ordinate) for curved Side ${i + 1}.`
          );
          return;
        }
      }
    }

    try {
      const solution = solveChainSurvey(parsedSides, parsedDiagonals);
      const surveyPoints = buildChainSurveyPoints(solution.points, project.points.length + 1);
      const centroid = polygonCentroid(solution.points);
      const arcs: SurveyArc[] = [];

      for (let i = 0; i < numSides; i++) {
        const sideCfg = sides[i];
        if (sideCfg.curveType !== 'straight') {
          const mMeters = convertDistance(parseFloat(sideCfg.midOrdinate), unit, 'm');
          const p1 = solution.points[i];
          const p2 = solution.points[(i + 1) % numSides];

          const solvedArc = solveChainSurveyArc(p1, p2, mMeters, sideCfg.curveType, centroid);
          arcs.push({
            id: `arc_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            startPointId: surveyPoints[i].id,
            endPointId: surveyPoints[(i + 1) % numSides].id,
            center: solvedArc.arcResult.center,
            radius: solvedArc.arcResult.radius,
            deltaRad: solvedArc.arcResult.deltaRad,
            arcLength: solvedArc.arcResult.arcLength,
            chordLength: solvedArc.arcResult.chordLength,
            isClockwise: solvedArc.arcResult.isClockwise,
            isConvexOrOutward: solvedArc.isConvexOrOutward,
            isConvex: solvedArc.isConvexOrOutward,
            sweepFlag: solvedArc.arcResult.sweepFlag,
          });
        }
      }

      executeCommand(
        new AddChainSurveyBoundaryCommand(
          surveyPoints,
          polygonName.trim() || 'Chain Survey Boundary',
          arcs
        )
      );

      onClose();
    } catch (err: unknown) {
      if (err instanceof ChainSurveyError) {
        setSubmitError(err.message);
      } else {
        setSubmitError((err as Error).message || 'Failed to solve boundary.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={18} color="#38bdf8" />
            <span className="modal-title">Chain Survey — Tape-Only Boundary</span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                background: 'rgba(56,189,248,0.2)',
                color: '#38bdf8',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              NO COMPASS REQUIRED
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="menu-btn"
              style={{ padding: 4 }}
              title="How tape-only chain surveying works"
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle size={16} color="var(--accent-cyan)" />
            </button>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Instructional Info Box (Toggleable) */}
        {showHelp && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(56, 189, 248, 0.08)',
              borderBottom: '1px solid var(--border)',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--text-main)',
            }}
          >
            <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Info size={14} /> How Fan Triangulation & Chain Surveying Works
            </div>
            <p style={{ margin: '0 0 6px 0' }}>
              When surveying informal plots with tape measurements only (no compass or total station),
              boundary side lengths alone cannot uniquely define a polygon with 4 or more sides.
            </p>
            <p style={{ margin: '0 0 6px 0' }}>
              <strong>Diagonals:</strong> By taking diagonal tie-line measurements from Corner 1 to all
              non-adjacent corners (e.g., P1→P3 for a 4-sided plot), the polygon is divided into rigid
              triangles. Each triangle is fully solved via the Law of Cosines (SSS).
            </p>
            <p style={{ margin: 0 }}>
              <strong>Curved Edges:</strong> For curved boundaries (roads, watercourses), measure the
              corner-to-corner chord and the perpendicular mid-ordinate (offset at chord midpoint). The
              circular arc is automatically reconstructed and factored into the area calculation.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 160px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {submitError && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 4,
                  color: '#fca5a5',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Top Setup Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Number of Boundary Sides</label>
                <select
                  className="form-select"
                  value={numSides}
                  onChange={(e) => handleSidesCountChange(parseInt(e.target.value, 10))}
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} Sides ({diagonalsNeeded(n)} diagonal{diagonalsNeeded(n) === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Parcel / Boundary Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={polygonName}
                  onChange={(e) => setPolygonName(e.target.value)}
                  placeholder="e.g. Field Lot 1"
                />
              </div>
            </div>

            {/* Boundary Sides Input Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-bright)' }}>
                  1. Boundary Side Measurements (Consecutive, tape readings in {unitLabel})
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Point 1 is at Origin (0,0); Side 1 forms baseline
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  background: 'rgba(0,0,0,0.2)',
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {sides.map((side, idx) => {
                  const startLabel = `P${idx + 1}`;
                  const endLabel = `P${((idx + 1) % numSides) + 1}`;
                  const isClosing = idx === numSides - 1;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: side.curveType === 'straight' ? '110px 140px 1fr' : '110px 140px 140px 1fr',
                        gap: 8,
                        alignItems: 'center',
                        padding: '4px 6px',
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: isClosing ? 'var(--accent-amber)' : 'var(--accent-cyan)' }}>
                        {startLabel} → {endLabel} {isClosing && '(Close)'}
                      </div>

                      <div>
                        <input
                          className="form-input"
                          type="number"
                          step="any"
                          placeholder={`Length (${unitLabel})`}
                          value={side.length}
                          onChange={(e) => handleSideChange(idx, { length: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <select
                          className="form-select"
                          value={side.curveType}
                          onChange={(e) =>
                            handleSideChange(idx, {
                              curveType: e.target.value as 'straight' | 'outward' | 'inward',
                            })
                          }
                          style={{ fontSize: 11 }}
                        >
                          <option value="straight">Straight Edge</option>
                          <option value="outward">Curved Outward (+Area)</option>
                          <option value="inward">Curved Inward (-Area)</option>
                        </select>
                      </div>

                      {side.curveType !== 'straight' && (
                        <div>
                          <input
                            className="form-input"
                            type="number"
                            step="any"
                            placeholder={`Offset (${unitLabel})`}
                            value={side.midOrdinate}
                            onChange={(e) => handleSideChange(idx, { midOrdinate: e.target.value })}
                            title="Mid-ordinate (perpendicular distance at center of chord to curve)"
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagonals Input Section (if n >= 4) */}
            {diagonalsNeeded(numSides) > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-bright)' }}>
                    2. Tie-Line Diagonals from Station P1 (Tape readings in {unitLabel})
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {diagonalsNeeded(numSides)} diagonal{diagonalsNeeded(numSides) === 1 ? '' : 's'} required to triangulate
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 8,
                    background: 'rgba(0,0,0,0.2)',
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {diagonals.map((diag, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 6px',
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8', minWidth: 70 }}>
                        P1 → P{idx + 3}:
                      </span>
                      <input
                        className="form-input"
                        type="number"
                        step="any"
                        placeholder={`Distance (${unitLabel})`}
                        value={diag}
                        onChange={(e) => handleDiagonalChange(idx, e.target.value)}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Solution Preview Banner */}
            {livePreview && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: livePreview.success
                    ? '1px solid rgba(16,185,129,0.4)'
                    : '1px solid rgba(239,68,68,0.4)',
                  background: livePreview.success
                    ? 'rgba(16,185,129,0.08)'
                    : 'rgba(239,68,68,0.08)',
                }}
              >
                {livePreview.success ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontWeight: 600, fontSize: 12 }}>
                      <CheckCircle2 size={15} />
                      <span>Valid Boundary Geometry Solved</span>
                    </div>
                    <div style={{ display: 'flex', gap: 18, fontSize: 12, marginTop: 2, color: 'var(--text-main)' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Net Area: </span>
                        <strong>{formatArea(livePreview.adjustedAreaM2, project.settings.areaUnit)}</strong>
                        {livePreview.hasCurved && (
                          <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>
                            (Straight: {formatArea(livePreview.baseAreaM2, project.settings.areaUnit)})
                          </span>
                        )}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Perimeter: </span>
                        <strong>{formatDistance(livePreview.adjustedPerimeterM, unit)}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontSize: 12 }}>
                    <AlertTriangle size={15} />
                    <span>{livePreview.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={livePreview !== null && !livePreview.success}
            >
              Add Chain Survey Boundary
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

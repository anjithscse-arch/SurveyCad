import React, { useState, useMemo } from 'react';
import { useCAD } from '../../context/CADContext';
import {
  solveChainSurvey,
  tiesNeeded,
  diagonalsNeeded,
  solveChainSurveyArc,
  ChainSurveyError,
  ChainSurveyTie,
} from '../../geometry/chainSurvey';
import {
  buildChainSurveyPoints,
  AddChainSurveyBoundaryCommand,
} from '../../commands/chainSurveyCommands';
import { polygonArea, polygonPerimeter, polygonCentroid } from '../../geometry/polygon';
import { circularSegmentArea } from '../../geometry/arc';
import { convertDistance, formatDistance, formatArea, LINEAR_LABELS } from '../../survey/units';
import { Point2D, SurveyArc } from '../../types/geometry';
import { X, Link2, Info, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SideInput {
  length: string;
  curveType: 'straight' | 'outward' | 'inward';
  midOrdinate: string;
}

interface TieInput {
  from: number;
  to: number;
  distance: string;
}

const createDefaultTies = (n: number): TieInput[] => {
  const needed = tiesNeeded(n);
  const arr: TieInput[] = [];
  for (let i = 0; i < needed; i++) {
    arr.push({ from: 0, to: i + 2, distance: '' });
  }
  return arr;
};

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
  const [ties, setTies] = useState<TieInput[]>(() => createDefaultTies(4));
  const [flippedCorners, setFlippedCorners] = useState<Record<number, boolean>>({});
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

    const needed = tiesNeeded(clamped);
    setTies((prev) => {
      const next = [...prev];
      while (next.length < needed) {
        const i = next.length;
        next.push({ from: 0, to: i + 2, distance: '' });
      }
      return next.slice(0, needed);
    });
    setFlippedCorners({});
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

  const handleTieChange = (index: number, partial: Partial<TieInput>) => {
    setTies((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...partial };
      return copy;
    });
    setSubmitError(null);
  };

  const handleFlipCorner = (pointIndex: number) => {
    setFlippedCorners((prev) => ({
      ...prev,
      [pointIndex]: !prev[pointIndex],
    }));
  };

  // Live computation preview
  const livePreview = useMemo(() => {
    const parsedSides: number[] = [];
    for (let i = 0; i < numSides; i++) {
      const val = parseFloat(sides[i]?.length || '');
      if (isNaN(val) || val <= 0) return null;
      parsedSides.push(convertDistance(val, unit, 'm'));
    }

    const needed = tiesNeeded(numSides);
    const parsedTies: ChainSurveyTie[] = [];
    for (let i = 0; i < needed; i++) {
      const tie = ties[i];
      const val = parseFloat(tie?.distance || '');
      if (isNaN(val) || val <= 0) return null;
      parsedTies.push({
        from: tie.from,
        to: tie.to,
        distance: convertDistance(val, unit, 'm'),
      });
    }

    try {
      const solution = solveChainSurvey(parsedSides, parsedTies, flippedCorners);
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
        ambiguousCorners: solution.ambiguousCorners,
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
  }, [numSides, sides, ties, flippedCorners, unit]);

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

    const needed = tiesNeeded(numSides);
    const parsedTies: ChainSurveyTie[] = [];
    for (let i = 0; i < needed; i++) {
      const tie = ties[i];
      const val = parseFloat(tie?.distance || '');
      if (isNaN(val) || val <= 0) {
        setSubmitError(`Please enter a valid positive length for Tie P${tie.from + 1} → P${tie.to + 1}.`);
        return;
      }
      if (tie.from === tie.to) {
        setSubmitError(`Tie ${i + 1} cannot connect corner P${tie.from + 1} to itself.`);
        return;
      }
      parsedTies.push({
        from: tie.from,
        to: tie.to,
        distance: convertDistance(val, unit, 'm'),
      });
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
      const solution = solveChainSurvey(parsedSides, parsedTies, flippedCorners);
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

            {/* Ties Input Section (if n >= 4) */}
            {tiesNeeded(numSides) > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-bright)' }}>
                    2. Corner-to-Corner Ties (Tape readings in {unitLabel})
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {tiesNeeded(numSides)} tie{tiesNeeded(numSides) === 1 ? '' : 's'} required to triangulate
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
                  {ties.map((tie, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '130px 130px 1fr',
                        gap: 8,
                        alignItems: 'center',
                        padding: '4px 6px',
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 32 }}>From:</span>
                        <select
                          className="form-select"
                          value={tie.from}
                          onChange={(e) => handleTieChange(idx, { from: parseInt(e.target.value, 10) })}
                          style={{ fontSize: 11 }}
                        >
                          {Array.from({ length: numSides }).map((_, cIdx) => (
                            <option key={cIdx} value={cIdx}>
                              P{cIdx + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 20 }}>To:</span>
                        <select
                          className="form-select"
                          value={tie.to}
                          onChange={(e) => handleTieChange(idx, { to: parseInt(e.target.value, 10) })}
                          style={{ fontSize: 11 }}
                        >
                          {Array.from({ length: numSides }).map((_, cIdx) => (
                            <option key={cIdx} value={cIdx}>
                              P{cIdx + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          className="form-input"
                          type="number"
                          step="any"
                          placeholder={`Tie distance (${unitLabel})`}
                          value={tie.distance}
                          onChange={(e) => handleTieChange(idx, { distance: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Solution Preview & Interactive Shape Confirmation */}
            {livePreview && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 6,
                  border: livePreview.success
                    ? '1px solid rgba(16,185,129,0.4)'
                    : '1px solid rgba(239,68,68,0.4)',
                  background: livePreview.success
                    ? 'rgba(16,185,129,0.06)'
                    : 'rgba(239,68,68,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {livePreview.success ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontWeight: 600, fontSize: 12 }}>
                        <CheckCircle2 size={15} />
                        <span>Valid Boundary Geometry Solved</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-main)' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Net Area: </span>
                          <strong style={{ color: 'var(--accent-cyan)' }}>{formatArea(livePreview.adjustedAreaM2, project.settings.areaUnit)}</strong>
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

                    {/* SVG Preview Canvas with Flip Buttons */}
                    {(() => {
                      const svgW = 600;
                      const svgH = 220;
                      const pad = 28;
                      const xs = livePreview.points.map((p) => p.x);
                      const ys = livePreview.points.map((p) => p.y);
                      const minX = Math.min(...xs);
                      const maxX = Math.max(...xs);
                      const minY = Math.min(...ys);
                      const maxY = Math.max(...ys);
                      const spanX = Math.max(maxX - minX, 0.001);
                      const spanY = Math.max(maxY - minY, 0.001);
                      const availW = svgW - pad * 2;
                      const availH = svgH - pad * 2;
                      const scale = Math.min(availW / spanX, availH / spanY);

                      const toScreen = (p: Point2D) => ({
                        x: pad + (p.x - minX) * scale + (availW - spanX * scale) / 2,
                        y: svgH - (pad + (p.y - minY) * scale + (availH - spanY * scale) / 2),
                      });

                      const screenPoints = livePreview.points.map(toScreen);
                      const polyPointsStr = screenPoints.map((sp) => `${sp.x.toFixed(1)},${sp.y.toFixed(1)}`).join(' ');

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
                            <span>Visual Shape Confirmation (Verify plot matches field sketch before saving)</span>
                            {livePreview.ambiguousCorners.length > 0 && (
                              <span style={{ color: 'var(--accent-amber)' }}>
                                {livePreview.ambiguousCorners.length} ambiguous corner{livePreview.ambiguousCorners.length === 1 ? '' : 's'} (click ⟲ to flip)
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: svgH,
                              background: '#090d16',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              overflow: 'hidden',
                            }}
                          >
                            <svg
                              viewBox={`0 0 ${svgW} ${svgH}`}
                              style={{ width: '100%', height: '100%', display: 'block' }}
                            >
                              {/* Background grid pattern */}
                              <defs>
                                <pattern id="preview-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                  <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.06)" />
                                </pattern>
                              </defs>
                              <rect width={svgW} height={svgH} fill="url(#preview-grid)" />

                              {/* Tie Lines (dashed gold) */}
                              {ties.map((t, tIdx) => {
                                if (t.from < screenPoints.length && t.to < screenPoints.length && t.from !== t.to) {
                                  const p1 = screenPoints[t.from];
                                  const p2 = screenPoints[t.to];
                                  return (
                                    <line
                                      key={`tie-line-${tIdx}`}
                                      x1={p1.x}
                                      y1={p1.y}
                                      x2={p2.x}
                                      y2={p2.y}
                                      stroke="#f59e0b"
                                      strokeWidth="1.2"
                                      strokeDasharray="4 3"
                                      opacity="0.6"
                                    />
                                  );
                                }
                                return null;
                              })}

                              {/* Polygon boundary outline */}
                              <polygon
                                points={polyPointsStr}
                                fill="rgba(56, 189, 248, 0.12)"
                                stroke="#38bdf8"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />

                              {/* Vertex markers & labels */}
                              {screenPoints.map((sp, pIdx) => (
                                <g key={`pt-${pIdx}`}>
                                  <circle
                                    cx={sp.x}
                                    cy={sp.y}
                                    r={4}
                                    fill="#38bdf8"
                                    stroke="#090d16"
                                    strokeWidth="1.5"
                                  />
                                  <text
                                    x={sp.x + 6}
                                    y={sp.y - 6}
                                    fill="#e2e8f0"
                                    fontSize="10"
                                    fontWeight="600"
                                    fontFamily="var(--font-mono)"
                                  >
                                    P{pIdx + 1}
                                  </text>
                                </g>
                              ))}
                            </svg>

                            {/* Flip Buttons positioned directly near ambiguous corners */}
                            {livePreview.ambiguousCorners.map((amb) => {
                              const sp = screenPoints[amb.pointIndex];
                              if (!sp) return null;
                              const isFlipped = Boolean(flippedCorners[amb.pointIndex]);
                              const leftPercent = (sp.x / svgW) * 100;
                              const topPercent = (sp.y / svgH) * 100;

                              return (
                                <button
                                  key={`flip-btn-${amb.pointIndex}`}
                                  type="button"
                                  onClick={() => handleFlipCorner(amb.pointIndex)}
                                  title={`Swap corner P${amb.pointIndex + 1} to alternate solution`}
                                  style={{
                                    position: 'absolute',
                                    left: `${Math.min(Math.max(leftPercent, 4), 80)}%`,
                                    top: `${Math.min(Math.max(topPercent + 4, 4), 84)}%`,
                                    padding: '2px 7px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    background: isFlipped ? 'rgba(245, 158, 11, 0.9)' : 'rgba(15, 23, 42, 0.85)',
                                    color: isFlipped ? '#000' : '#38bdf8',
                                    border: isFlipped ? '1px solid #f59e0b' : '1px solid #38bdf8',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                    zIndex: 10,
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <span>⟲ Flip P{amb.pointIndex + 1}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick corner toggle pills */}
                          {livePreview.ambiguousCorners.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Corner solutions:</span>
                              {livePreview.ambiguousCorners.map((amb) => {
                                const isFlipped = Boolean(flippedCorners[amb.pointIndex]);
                                return (
                                  <button
                                    key={`corner-pill-${amb.pointIndex}`}
                                    type="button"
                                    onClick={() => handleFlipCorner(amb.pointIndex)}
                                    style={{
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      borderRadius: 4,
                                      background: isFlipped ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                                      color: isFlipped ? '#fbbf24' : 'var(--text-main)',
                                      border: isFlipped ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ⟲ Flip Corner P{amb.pointIndex + 1} {isFlipped ? '(Alternate)' : '(Default)'}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
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

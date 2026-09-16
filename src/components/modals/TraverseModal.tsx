import React, { useState } from 'react';
import { useCAD } from '../../context/CADContext';
import { AddPointCommand } from '../../commands/pointCommands';
import { pointFromBearingAndDistance, parseAngle, formatDMS } from '../../geometry/bearing';
import { convertDistance } from '../../survey/units';
import { SurveyPoint, SurveyLine } from '../../types/geometry';
import { X } from 'lucide-react';

interface TraverseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TraverseModal: React.FC<TraverseModalProps> = ({ isOpen, onClose }) => {
  const { project, executeCommand } = useCAD();

  const lastPoint = project.points[project.points.length - 1];
  const [startPointId, setStartPointId] = useState<string>(lastPoint?.id || project.points[0]?.id || '');
  const [newLabel, setNewLabel] = useState('');
  const [distanceInput, setDistanceInput] = useState('');
  const [bearingInput, setBearingInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const startPoint = project.points.find((p) => p.id === startPointId) || project.points[project.points.length - 1];

  const parsedBearing = parseAngle(bearingInput);
  const rawDist = parseFloat(distanceInput);

  let previewX: number | null = null;
  let previewY: number | null = null;
  if (startPoint && !isNaN(rawDist) && rawDist > 0 && parsedBearing !== null) {
    const distMeters = convertDistance(rawDist, project.settings.linearUnit, 'm');
    const dest = pointFromBearingAndDistance(startPoint, distMeters, parsedBearing);
    previewX = dest.x;
    previewY = dest.y;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startPoint) {
      setError('Please add an initial base point or select a start station first.');
      return;
    }

    if (isNaN(rawDist) || rawDist <= 0) {
      setError('Please enter a positive measured distance.');
      return;
    }

    if (parsedBearing === null) {
      setError('Invalid bearing format. Supported formats: 90, 45.25, 45°15\'30", or N 45°15\' E.');
      return;
    }

    const distMeters = convertDistance(rawDist, project.settings.linearUnit, 'm');
    const dest = pointFromBearingAndDistance(startPoint, distMeters, parsedBearing);

    const nextLetter = String.fromCharCode(65 + (project.points.length % 26));
    const label = newLabel.trim() || (project.points.length >= 26 ? `P${project.points.length + 1}` : nextLetter);

    const newPt: SurveyPoint = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label,
      x: Math.round(dest.x * 1000) / 1000,
      y: Math.round(dest.y * 1000) / 1000,
    };

    const newLine: SurveyLine = {
      id: `line_${Date.now()}`,
      startPointId: startPoint.id,
      endPointId: newPt.id,
    };

    executeCommand(new AddPointCommand(newPt, newLine));
    setStartPointId(newPt.id);
    setNewLabel('');
    setDistanceInput('');
    setBearingInput('');
    setError(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Traverse Entry (Distance & Bearing)</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, color: '#fca5a5', fontSize: 11 }}>
                {error}
              </div>
            )}

            {project.points.length === 0 ? (
              <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 4, fontSize: 12, color: 'var(--text-main)' }}>
                Please create a starting base station (Point A) using the <strong>Point Tool</strong> or <strong>Coordinate Entry</strong> first.
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">From Station (Start)</label>
                    <select
                      className="form-select"
                      value={startPointId}
                      onChange={(e) => setStartPointId(e.target.value)}
                    >
                      {project.points.map((p) => (
                        <option key={p.id} value={p.id}>
                          Station {p.label} ({p.x.toFixed(2)}, {p.y.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">To Station Label (New)</label>
                    <input
                      className="form-input"
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. Next Letter"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Measured Distance ({project.settings.linearUnit})</label>
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      value={distanceInput}
                      onChange={(e) => { setDistanceInput(e.target.value); setError(null); }}
                      placeholder="e.g. 25.40"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bearing / Azimuth</label>
                    <input
                      className="form-input"
                      type="text"
                      value={bearingInput}
                      onChange={(e) => { setBearingInput(e.target.value); setError(null); }}
                      placeholder={'e.g. 90, 45°15\'30", or N 45 E'}
                      required
                    />
                  </div>
                </div>

                {/* Live Computed Destination Coordinates */}
                {previewX !== null && previewY !== null && (
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>Computed Destination:</div>
                    <div style={{ color: 'var(--accent-cyan)' }}>
                      Easting: {previewX.toFixed(3)} m  |  Northing: {previewY.toFixed(3)} m
                    </div>
                    {parsedBearing !== null && (
                      <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                        Azimuth: {formatDMS(parsedBearing)} ({parsedBearing.toFixed(3)}°)
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={project.points.length === 0}>
              Calculate & Add Leg
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

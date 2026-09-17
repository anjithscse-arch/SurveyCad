import React, { useState } from 'react';
import { useCAD } from '../../context/CADContext';
import { AddPointCommand } from '../../commands/pointCommands';
import { SurveyPoint } from '../../types/geometry';
import { X } from 'lucide-react';

interface CoordinateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CoordinateEntryModal: React.FC<CoordinateEntryModalProps> = ({ isOpen, onClose }) => {
  const { project, executeCommand } = useCAD();

  const nextLetter = String.fromCharCode(65 + (project.points.length % 26));
  const defaultLabel = project.points.length >= 26 ? `P${project.points.length + 1}` : nextLetter;

  const [label, setLabel] = useState(defaultLabel);
  const [easting, setEasting] = useState('');
  const [northing, setNorthing] = useState('');
  const [elevation, setElevation] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const xVal = parseFloat(easting);
    const yVal = parseFloat(northing);

    if (isNaN(xVal) || isNaN(yVal)) {
      setError('Please enter valid numeric values for Easting (X) and Northing (Y).');
      return;
    }

    const elevVal = elevation.trim() ? parseFloat(elevation) : undefined;

    const newPoint: SurveyPoint = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: label.trim() || defaultLabel,
      x: xVal,
      y: yVal,
      elevation: isNaN(elevVal as number) ? undefined : elevVal,
    };

    executeCommand(new AddPointCommand(newPoint));
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Exact Coordinate Point Entry (SDD §19)</span>
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

            <div className="form-group">
              <label className="form-label">Station Label / ID</label>
              <input
                className="form-input"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. A, B, P1"
                autoFocus
              />
            </div>

            {project.settings.uiMode !== 'advanced' && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                Positions are measured from your starting corner (Origin 0, 0).
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">
                  {project.settings.uiMode !== 'advanced'
                    ? 'Distance right (X) — Easting'
                    : 'Easting (X Coordinate)'} ({project.settings.linearUnit})
                </label>
                <input
                  className="form-input"
                  type="number"
                  step="any"
                  value={easting}
                  onChange={(e) => { setEasting(e.target.value); setError(null); }}
                  placeholder="e.g. 10.00"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {project.settings.uiMode !== 'advanced'
                    ? 'Distance up (Y) — Northing'
                    : 'Northing (Y Coordinate)'} ({project.settings.linearUnit})
                </label>
                <input
                  className="form-input"
                  type="number"
                  step="any"
                  value={northing}
                  onChange={(e) => { setNorthing(e.target.value); setError(null); }}
                  placeholder="e.g. 20.00"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {project.settings.uiMode !== 'advanced'
                  ? 'Elevation / Height (Z, Optional)'
                  : 'Elevation / Z (Optional)'} ({project.settings.linearUnit})
              </label>
              <input
                className="form-input"
                type="number"
                step="any"
                value={elevation}
                onChange={(e) => setElevation(e.target.value)}
                placeholder="e.g. 150.250"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Station
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

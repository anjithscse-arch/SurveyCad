import React, { useState } from 'react';
import { SurveyObservation } from '../../sketch/types';
import { parseAngle, formatDMS } from '../../geometry/bearing';
import { X, Check } from 'lucide-react';

interface ObservationEditorProps {
  observation?: SurveyObservation | null;
  availableStations: string[];
  onSave: (obs: SurveyObservation) => void;
  onCancel: () => void;
}

export const ObservationEditor: React.FC<ObservationEditorProps> = ({
  observation,
  availableStations,
  onSave,
  onCancel,
}) => {
  const [fromLabel, setFromLabel] = useState(observation?.fromLabel || availableStations[0] || 'A');
  const [toLabel, setToLabel] = useState(observation?.toLabel || availableStations[1] || 'B');
  const [distanceVal, setDistanceVal] = useState(observation?.distance !== undefined ? String(observation.distance) : '');
  const [bearingVal, setBearingVal] = useState(observation?.bearing !== undefined ? formatDMS(observation.bearing, false) : '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const distNum = parseFloat(distanceVal);
    if (isNaN(distNum) || distNum <= 0) {
      setError('Please enter a positive measured distance in meters.');
      return;
    }

    let bearingNum: number | undefined = undefined;
    if (bearingVal.trim()) {
      const parsed = parseAngle(bearingVal);
      if (parsed === null) {
        setError('Invalid bearing format. Supported: 90, 45°15\', N 45 E.');
        return;
      }
      bearingNum = parsed;
    }

    const savedObs: SurveyObservation = {
      id: observation?.id || `obs_${Date.now()}`,
      fromLabel: fromLabel.toUpperCase().trim(),
      toLabel: toLabel.toUpperCase().trim(),
      distance: distNum,
      bearing: bearingNum,
      source: observation?.source || 'manual',
      confidence: 1.0,
      verified: true,
      status: 'accepted',
      userEdited: true,
    };

    onSave(savedObs);
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--accent-cyan)',
        borderRadius: 6,
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
          {observation ? 'Edit Survey Observation' : 'Add Survey Observation'}
        </span>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          onClick={onCancel}
        >
          <X size={14} />
        </button>
      </div>

      {error && (
        <div style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: 11, borderRadius: 4 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="form-group">
            <label className="form-label">From Station</label>
            <input
              className="form-input"
              value={fromLabel}
              onChange={(e) => setFromLabel(e.target.value)}
              placeholder="e.g. A"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">To Station</label>
            <input
              className="form-input"
              value={toLabel}
              onChange={(e) => setToLabel(e.target.value)}
              placeholder="e.g. B"
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="form-group">
            <label className="form-label">Distance (meters)</label>
            <input
              className="form-input"
              type="number"
              step="any"
              value={distanceVal}
              onChange={(e) => { setDistanceVal(e.target.value); setError(null); }}
              placeholder="e.g. 30.25"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bearing / Azimuth (opt)</label>
            <input
              className="form-input"
              value={bearingVal}
              onChange={(e) => { setBearingVal(e.target.value); setError(null); }}
              placeholder="e.g. 90 or N 45 E"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
          <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" style={{ padding: '4px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={13} /> Save Observation
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { PointCandidate, SurveyObservation, VerificationStatus } from '../../sketch/types';
import { ObservationEditor } from './ObservationEditor';
import { formatDMS } from '../../geometry/bearing';
import {
  Check,
  Edit2,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCheck,
  ShieldCheck,
} from 'lucide-react';

interface VerificationPanelProps {
  points: PointCandidate[];
  observations: SurveyObservation[];
  onUpdateObservation: (obs: SurveyObservation) => void;
  onDeleteObservation: (id: string) => void;
  onAddObservation: (obs: SurveyObservation) => void;
  onAcceptAll: () => void;
  onReconstruct: () => void;
  isReconstructing?: boolean;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  points,
  observations,
  onUpdateObservation,
  onDeleteObservation,
  onAddObservation,
  onAcceptAll,
  onReconstruct,
  isReconstructing,
}) => {
  const [editingObs, setEditingObs] = useState<SurveyObservation | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const availableStations = points.map((p) => p.label);

  const getConfidenceBadge = (conf: number) => {
    if (conf >= 0.9) {
      return (
        <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 'bold' }}>
          High ({Math.round(conf * 100)}%)
        </span>
      );
    }
    if (conf >= 0.7) {
      return (
        <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 'bold' }}>
          Med ({Math.round(conf * 100)}%)
        </span>
      );
    }
    return (
      <span style={{ color: '#f87171', background: 'rgba(248,113,113,0.15)', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 'bold' }}>
        Low ({Math.round(conf * 100)}%)
      </span>
    );
  };

  const handleStatusChange = (obs: SurveyObservation, status: VerificationStatus) => {
    onUpdateObservation({
      ...obs,
      status,
      verified: status === 'accepted' || status === 'edited',
    });
  };

  // Conflict detection: check if multiple observations exist for the same leg
  const legCounts = new Map<string, number>();
  observations.forEach((o) => {
    const key = `${o.fromLabel}->${o.toLabel}`;
    legCounts.set(key, (legCounts.get(key) || 0) + 1);
  });
  const hasConflicts = Array.from(legCounts.values()).some((c) => c > 1);

  const verifiedCount = observations.filter((o) => o.status === 'accepted' || o.status === 'edited').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      {/* Verification Summary Header */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text-main)' }}>
            Human Verification (SDD §16)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {verifiedCount} of {observations.length} observations verified
          </div>
        </div>
        <button
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', fontSize: 11 }}
          onClick={onAcceptAll}
          title="Accept all candidate observations"
        >
          <CheckCheck size={14} color="#10b981" /> Accept All
        </button>
      </div>

      {/* Conflict Warning */}
      {hasConflicts && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 6,
            padding: '10px',
            fontSize: 11,
            color: '#fca5a5',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Conflicting measurements detected:</strong> More than one observation exists for the same boundary leg. Please review and reject/delete duplicate measurements.
          </div>
        </div>
      )}

      {/* Editor Modal / Inline Form */}
      {(editingObs || isAdding) && (
        <ObservationEditor
          observation={editingObs}
          availableStations={availableStations}
          onSave={(saved) => {
            if (editingObs) onUpdateObservation(saved);
            else onAddObservation(saved);
            setEditingObs(null);
            setIsAdding(false);
          }}
          onCancel={() => {
            setEditingObs(null);
            setIsAdding(false);
          }}
        />
      )}

      {/* Observations Table */}
      <div className="cad-table-card">
        <div className="card-header">
          <span>Boundary Observations ({observations.length})</span>
          <button
            className="card-action-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => { setIsAdding(true); setEditingObs(null); }}
          >
            <Plus size={13} /> Add Observation
          </button>
        </div>

        <table className="cad-data-table">
          <thead>
            <tr>
              <th>Leg</th>
              <th>Distance</th>
              <th>Bearing</th>
              <th>Conf</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {observations.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '16px' }}>
                  No observations detected. Click "+ Add Observation" to define one manually.
                </td>
              </tr>
            ) : (
              observations.map((obs) => {
                const isAccepted = obs.status === 'accepted' || obs.status === 'edited';
                const isRejected = obs.status === 'rejected';

                return (
                  <tr
                    key={obs.id}
                    style={{
                      opacity: isRejected ? 0.45 : 1,
                      background: isAccepted ? 'rgba(16,185,129,0.05)' : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                      {obs.fromLabel} → {obs.toLabel}
                    </td>
                    <td>{obs.distance !== undefined ? `${obs.distance.toFixed(2)} m` : '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {obs.bearing !== undefined ? formatDMS(obs.bearing, false) : '—'}
                    </td>
                    <td>{getConfidenceBadge(obs.confidence)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {/* Accept button */}
                        <button
                          style={{
                            background: isAccepted ? '#10b981' : 'transparent',
                            color: isAccepted ? '#fff' : 'var(--text-dim)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 3,
                            padding: '2px 4px',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleStatusChange(obs, isAccepted ? 'unreviewed' : 'accepted')}
                          title={isAccepted ? 'Mark Unreviewed' : 'Accept Observation'}
                        >
                          <Check size={12} />
                        </button>
                        {/* Edit button */}
                        <button
                          style={{
                            background: 'transparent',
                            color: 'var(--accent-cyan)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 3,
                            padding: '2px 4px',
                            cursor: 'pointer',
                          }}
                          onClick={() => { setEditingObs(obs); setIsAdding(false); }}
                          title="Edit measurement"
                        >
                          <Edit2 size={12} />
                        </button>
                        {/* Delete button */}
                        <button
                          style={{
                            background: 'transparent',
                            color: 'var(--accent-rose)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 3,
                            padding: '2px 4px',
                            cursor: 'pointer',
                          }}
                          onClick={() => onDeleteObservation(obs.id)}
                          title="Delete observation"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Stations List */}
      <div className="cad-table-card">
        <div className="card-header">
          <span>Detected Stations ({points.length})</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px' }}>
          {points.map((p) => (
            <div
              key={p.id}
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                fontFamily: 'monospace',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{p.label}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>({p.imagePosition.x.toFixed(0)}, {p.imagePosition.y.toFixed(0)})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reconstruct Button */}
      <button
        className="btn-primary"
        style={{
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 0 12px rgba(56, 189, 248, 0.35)',
        }}
        onClick={onReconstruct}
        disabled={verifiedCount < 3 || isReconstructing}
      >
        <ShieldCheck size={18} />
        {isReconstructing ? 'Reconstructing...' : 'Reconstruct Digital CAD Survey'}
      </button>
    </div>
  );
};

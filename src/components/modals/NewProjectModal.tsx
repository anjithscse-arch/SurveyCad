import React, { useState } from 'react';
import { useCAD } from '../../context/CADContext';
import { X } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const { project, resetProject, updateMetadata } = useCAD();

  const [name, setName] = useState(project.metadata.name || 'Residential Property Survey');
  const [propertyName, setPropertyName] = useState(project.metadata.propertyName || '');
  const [surveyor, setSurveyor] = useState(project.metadata.surveyor || '');
  const [client, setClient] = useState(project.metadata.client || '');
  const [location, setLocation] = useState(project.metadata.location || '');
  const [isReset, setIsReset] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReset) {
      resetProject(name);
    }
    updateMetadata({
      name,
      propertyName,
      surveyor,
      client,
      location,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Project Details & Metadata (SDD §41)</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Green Valley Survey Parcel A"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Property / Land Parcel Name</label>
              <input
                className="form-input"
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. Survey No. 142/3"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Licensed Surveyor</label>
                <input
                  className="form-input"
                  type="text"
                  value={surveyor}
                  onChange={(e) => setSurveyor(e.target.value)}
                  placeholder="e.g. John Doe, PLS"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="e.g. Estate Owners Ltd"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Location / Site Address</label>
              <input
                className="form-input"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sector 4, Riverside"
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', marginTop: 4 }}>
              <input
                type="checkbox"
                checked={isReset}
                onChange={(e) => setIsReset(e.target.checked)}
              />
              <span style={{ color: isReset ? 'var(--accent-rose)' : 'inherit' }}>
                Clear current drawing and start fresh new project
              </span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Project Info
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

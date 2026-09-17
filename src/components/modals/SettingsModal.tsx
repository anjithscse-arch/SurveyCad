import React from 'react';
import { useCAD } from '../../context/CADContext';
import { LinearUnit, AreaUnit, AngleFormat } from '../../types/survey';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { project, updateSettings } = useCAD();
  const { settings } = project;

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">CAD & Survey Settings (SDD §101)</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Interface Mode: Simple vs Advanced (Surveyor) */}
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#38bdf8' }}>
                  Interface: {settings.uiMode === 'advanced' ? 'Advanced (Surveyor)' : 'Simple'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {settings.uiMode === 'advanced'
                    ? 'All surveyor tools, bearings, and engineering closure panels visible by default.'
                    : 'Streamlined for quick measurement. Advanced surveyor tools available on demand.'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  className={settings.uiMode !== 'advanced' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '5px 12px', fontSize: 11 }}
                  onClick={() => updateSettings({ uiMode: 'simple', showBearings: false })}
                >
                  Simple
                </button>
                <button
                  type="button"
                  className={settings.uiMode === 'advanced' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '5px 12px', fontSize: 11 }}
                  onClick={() => updateSettings({ uiMode: 'advanced', showBearings: true })}
                >
                  Advanced (Surveyor)
                </button>
              </div>
            </div>
          </div>

          {/* Measurement Units */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Primary Linear Unit</label>
              <select
                className="form-select"
                value={settings.linearUnit}
                onChange={(e) => updateSettings({ linearUnit: e.target.value as LinearUnit })}
              >
                <option value="m">Metres (m)</option>
                <option value="ft">Feet (ft)</option>
                <option value="cm">Centimetres (cm)</option>
                <option value="mm">Millimetres (mm)</option>
                <option value="in">Inches (in)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Area Display Unit</label>
              <select
                className="form-select"
                value={settings.areaUnit}
                onChange={(e) => updateSettings({ areaUnit: e.target.value as AreaUnit })}
              >
                <option value="sqm">Square Metres (m²)</option>
                <option value="cent">Indian Cents (40.47 m²)</option>
                <option value="acre">Acres (ac)</option>
                <option value="sqft">Square Feet (ft²)</option>
                <option value="hectare">Hectares (ha)</option>
                <option value="sqyd">Square Yards (yd²)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Angle / Bearing Display Format</label>
              <select
                className="form-select"
                value={settings.angleFormat}
                onChange={(e) => updateSettings({ angleFormat: e.target.value as AngleFormat })}
              >
                <option value="dms">Degrees/Minutes/Seconds (DMS)</option>
                <option value="deg">Decimal Degrees (45.25°)</option>
                <option value="quadrant">Quadrant Bearing (N 45° E)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Display Decimal Precision</label>
              <select
                className="form-select"
                value={settings.decimalPrecision}
                onChange={(e) => updateSettings({ decimalPrecision: parseInt(e.target.value) })}
              >
                <option value="0">0 decimals</option>
                <option value="1">1 decimal (0.1)</option>
                <option value="2">2 decimals (0.01)</option>
                <option value="3">3 decimals (0.001 - Survey Std)</option>
                <option value="4">4 decimals (0.0001)</option>
              </select>
            </div>
          </div>

          {/* Grid & Snapping */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Base Grid Spacing (Meters)</label>
              <input
                className="form-input"
                type="number"
                min="0.5"
                step="0.5"
                value={settings.gridSpacingMeters}
                onChange={(e) => updateSettings({ gridSpacingMeters: parseFloat(e.target.value) || 5 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Snap Tolerance (Screen Pixels)</label>
              <input
                className="form-input"
                type="number"
                min="4"
                max="30"
                value={settings.snapTolerancePixels}
                onChange={(e) => updateSettings({ snapTolerancePixels: parseInt(e.target.value) || 14 })}
              />
            </div>
          </div>

          {/* Visual Overlays Toggles */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="form-label">Canvas View Overlays</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: 11 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.showGrid}
                  onChange={(e) => updateSettings({ showGrid: e.target.checked })}
                />
                Show Coordinate Grid
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.showDimensions}
                  onChange={(e) => updateSettings({ showDimensions: e.target.checked })}
                />
                Show Boundary Dimensions
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.showBearings}
                  onChange={(e) => updateSettings({ showBearings: e.target.checked })}
                />
                Show Segment Bearings
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.showSnapHalos}
                  onChange={(e) => updateSettings({ showSnapHalos: e.target.checked })}
                />
                Show Snapping Indicators
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.showNorthArrow}
                  onChange={(e) => updateSettings({ showNorthArrow: e.target.checked })}
                />
                Show North Compass Arrow
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.showScaleBar}
                  onChange={(e) => updateSettings({ showScaleBar: e.target.checked })}
                />
                Show Real-World Scale Bar
              </label>
            </div>
          </div>

          {/* Theme */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <label className="form-label">Interface Theme</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: 4 }}>
              <button
                type="button"
                className={settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, fontSize: 11 }}
                onClick={() => {
                  updateSettings({ theme: 'dark' });
                  document.documentElement.removeAttribute('data-theme');
                }}
              >
                Dark CAD Blueprint
              </button>
              <button
                type="button"
                className={settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, fontSize: 11 }}
                onClick={() => {
                  updateSettings({ theme: 'light' });
                  document.documentElement.setAttribute('data-theme', 'light');
                }}
              >
                Light Engineering
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

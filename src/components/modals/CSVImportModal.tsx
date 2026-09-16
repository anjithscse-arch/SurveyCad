import React, { useState } from 'react';
import { useCAD } from '../../context/CADContext';
import { parseCSVPoints, ParsedCSVPoint } from '../../export/csv';
import { AddPointCommand } from '../../commands/pointCommands';
import { SetPolygonBoundaryCommand } from '../../commands/polygonCommands';
import { SurveyPoint, SurveyLine, SurveyPolygon } from '../../types/geometry';
import { X, Upload, Check } from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose }) => {
  const { project, executeCommand, setProject } = useCAD();

  const [csvText, setCsvText] = useState(
`Point,Easting,Northing
A,1000.000,2000.000
B,1025.500,2000.000
C,1025.500,2020.000
D,1000.000,2020.000`
  );

  const [createBoundary, setCreateBoundary] = useState(true);
  const [parsed, setParsed] = useState<{ points: ParsedCSVPoint[]; errors: string[] }>({
    points: [],
    errors: [],
  });

  if (!isOpen) return null;

  const handlePreview = () => {
    const res = parseCSVPoints(csvText);
    setParsed(res);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        const res = parseCSVPoints(content);
        setParsed(res);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const res = parsed.points.length > 0 ? parsed : parseCSVPoints(csvText);
    if (res.points.length === 0) return;

    const newPoints: SurveyPoint[] = res.points.map((p, idx) => ({
      id: `pt_${Date.now()}_${idx}`,
      label: p.label,
      x: p.x,
      y: p.y,
      elevation: p.elevation,
      description: p.description,
    }));

    let nextLines: SurveyLine[] = [...project.lines];
    let nextPolygons: SurveyPolygon[] = [...project.polygons];

    if (createBoundary && newPoints.length >= 2) {
      // Connect points sequentially
      for (let i = 0; i < newPoints.length; i++) {
        const nextIdx = (i + 1) % newPoints.length;
        if (!createBoundary && i === newPoints.length - 1) break;
        nextLines.push({
          id: `line_${Date.now()}_${i}`,
          startPointId: newPoints[i].id,
          endPointId: newPoints[nextIdx].id,
        });
      }

      if (newPoints.length >= 3) {
        nextPolygons.push({
          id: `poly_${Date.now()}`,
          name: 'Imported Boundary',
          pointIds: newPoints.map((p) => p.id),
          isClosed: true,
        });
      }
    }

    setProject((prev) => ({
      ...prev,
      points: [...prev.points, ...newPoints],
      lines: nextLines,
      polygons: nextPolygons,
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
    }));

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Import Survey Points from CSV (SDD §44)</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">CSV Content or File Upload:</span>
            <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', cursor: 'pointer' }}>
              <Upload size={14} /> Upload .CSV File
              <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <textarea
            className="form-input"
            rows={7}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'pre' }}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setParsed({ points: [], errors: [] });
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn-secondary" onClick={handlePreview} style={{ fontSize: 11 }}>
              Validate & Preview Rows
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={createBoundary}
                onChange={(e) => setCreateBoundary(e.target.checked)}
              />
              Auto-generate closed boundary
            </label>
          </div>

          {/* Preview Output */}
          {parsed.points.length > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: 4, maxHeight: '140px', overflowY: 'auto' }}>
              <table className="cad-data-table">
                <thead>
                  <tr>
                    <th>Point</th>
                    <th>Easting (X)</th>
                    <th>Northing (Y)</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.points.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{p.label}</td>
                      <td>{p.x.toFixed(3)}</td>
                      <td>{p.y.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {parsed.errors.length > 0 && (
            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, color: '#fca5a5', fontSize: 11 }}>
              {parsed.errors[0]}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleImport}>
            Import Points
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useCAD } from '../../context/CADContext';
import { Trash2, Plus } from 'lucide-react';
import { MovePointCommand, DeletePointCommand, AddPointCommand } from '../../commands/pointCommands';
import { SurveyPoint } from '../../types/geometry';

interface PointTableProps {
  onOpenCoordinateModal: () => void;
}

export const PointTable: React.FC<PointTableProps> = ({ onOpenCoordinateModal }) => {
  const {
    project,
    selectedPointIds,
    setSelectedPointIds,
    executeCommand,
  } = useCAD();

  const handleCoordinateChange = (
    pt: SurveyPoint,
    axis: 'x' | 'y' | 'elevation',
    valueStr: string
  ) => {
    const val = parseFloat(valueStr);
    if (isNaN(val)) return;

    if (axis === 'elevation') {
      pt.elevation = val;
      return;
    }

    const oldPos = { x: pt.x, y: pt.y };
    const newPos = axis === 'x' ? { x: val, y: pt.y } : { x: pt.x, y: val };

    executeCommand(new MovePointCommand(pt.id, oldPos, newPos, pt.label));
  };

  const handleDelete = (ptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      executeCommand(new DeletePointCommand(project, ptId));
      if (selectedPointIds.includes(ptId)) {
        setSelectedPointIds([]);
      }
    } catch (_) {}
  };

  return (
    <div className="cad-table-card">
      <div className="card-header">
        <span>Coordinate Table ({project.points.length} Stations)</span>
        <button className="card-action-btn" onClick={onOpenCoordinateModal} title="Add Point">
          <Plus size={14} /> Add
        </button>
      </div>

      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
        <table className="cad-data-table">
          <thead>
            <tr>
              <th style={{ width: '38px' }}>Pt</th>
              <th>Easting (X)</th>
              <th>Northing (Y)</th>
              <th style={{ width: '28px' }}></th>
            </tr>
          </thead>
          <tbody>
            {project.points.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '12px' }}>
                  No survey points entered yet.
                </td>
              </tr>
            ) : (
              project.points.map((pt) => {
                const isSelected = selectedPointIds.includes(pt.id);
                return (
                  <tr
                    key={pt.id}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => setSelectedPointIds([pt.id])}
                  >
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{pt.label}</td>
                    <td>
                      <input
                        className="table-input"
                        defaultValue={pt.x.toFixed(3)}
                        key={`x-${pt.id}-${pt.x}`}
                        onBlur={(e) => handleCoordinateChange(pt, 'x', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        defaultValue={pt.y.toFixed(3)}
                        key={`y-${pt.id}-${pt.y}`}
                        onBlur={(e) => handleCoordinateChange(pt, 'y', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}
                        onClick={(e) => handleDelete(pt.id, e)}
                        title="Delete Station"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

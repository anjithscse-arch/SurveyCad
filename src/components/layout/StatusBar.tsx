import React from 'react';
import { useCAD } from '../../context/CADContext';
import { formatArea, formatDistance } from '../../survey/units';

export const StatusBar: React.FC = () => {
  const {
    project,
    viewport,
    cursorWorld,
    areaResult,
    activeTool,
    activeSnap,
  } = useCAD();

  const toolLabels: Record<string, string> = {
    select: 'Select & Move',
    point: 'Place Point',
    polyline: 'Draw Survey Line',
    polygon: 'Boundary Polygon',
    measure: 'Measure Distance & Bearing',
    pan: 'Pan Viewport',
  };

  return (
    <footer className="cad-status-bar">
      {/* Left: Cursor coordinates & snap */}
      <div className="status-group">
        <div className="status-item">
          <span>E:</span>
          <span className="status-val">{cursorWorld.x.toFixed(3)} m</span>
        </div>
        <div className="status-item">
          <span>N:</span>
          <span className="status-val">{cursorWorld.y.toFixed(3)} m</span>
        </div>
        {activeSnap && (
          <div className="status-item" style={{ color: '#f59e0b' }}>
            <span>Snap:</span>
            <span>{activeSnap.description}</span>
          </div>
        )}
      </div>

      {/* Center: Live Enclosed Area & Perimeter */}
      <div className="status-group">
        {areaResult.isValid && (
          <>
            <div className="status-item">
              <span style={{ color: 'var(--text-dim)' }}>Area:</span>
              <span className="status-val" style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                {formatArea(areaResult.sqMeters, project.settings.areaUnit, project.settings.decimalPrecision)}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>({formatArea(areaResult.cents, 'cent', 2)})</span>
            </div>
            <div className="status-item">
              <span style={{ color: 'var(--text-dim)' }}>Perimeter:</span>
              <span className="status-val">
                {formatDistance(areaResult.perimeterMeters, project.settings.linearUnit, project.settings.decimalPrecision)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Points count, Zoom %, Active Tool */}
      <div className="status-group">
        <div className="status-item">
          <span>Stations:</span>
          <span className="status-val">{project.points.length}</span>
        </div>
        <div className="status-item">
          <span>Zoom:</span>
          <span className="status-val">{Math.round(viewport.zoom * 10)}%</span>
        </div>
        <div className="status-item" style={{ color: 'var(--accent-cyan)' }}>
          <span>Tool:</span>
          <span>{toolLabels[activeTool] || activeTool}</span>
        </div>
      </div>
    </footer>
  );
};

import React, { useState } from 'react';
import { useCAD, CADTool } from '../../context/CADContext';
import {
  MousePointer,
  Dot,
  PenTool,
  Hexagon,
  Ruler,
  Hand,
  Maximize2,
  Undo2,
  Redo2,
  MapPin,
  Compass,
  Sparkles,
  Link2,
  ChevronDown,
} from 'lucide-react';
import { getBoundingBox } from '../../geometry/polygon';
import { fitToBounds } from '../../geometry/transform';

interface CADToolbarProps {
  onOpenCoordinateModal: () => void;
  onOpenTraverseModal: () => void;
  onOpenChainSurveyModal: () => void;
  onOpenCurveModal: () => void;
  onOpenSketchModal: () => void;
}

export const CADToolbar: React.FC<CADToolbarProps> = ({
  onOpenCoordinateModal,
  onOpenTraverseModal,
  onOpenChainSurveyModal,
  onOpenCurveModal,
  onOpenSketchModal,
}) => {
  const {
    activeTool,
    setActiveTool,
    undo,
    redo,
    canUndo,
    canRedo,
    project,
    setViewport,
  } = useCAD();

  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  const handleFit = () => {
    if (project.points.length === 0) return;
    const bounds = getBoundingBox(project.points, 10);
    setViewport((prev) => fitToBounds(bounds, prev.width, prev.height, 70));
  };

  return (
    <aside className="cad-action-toolbar">
      {/* 1. Select Tool */}
      <button
        className={`cad-tool-btn ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => setActiveTool('select')}
        data-tooltip="Select / Edit (V)"
      >
        <MousePointer size={18} />
      </button>

      {/* 2. Point Tool */}
      <button
        className={`cad-tool-btn ${activeTool === 'point' ? 'active' : ''}`}
        onClick={() => setActiveTool('point')}
        data-tooltip="Place Point (P)"
      >
        <Dot size={24} />
      </button>

      {/* 3. Polyline Tool */}
      <button
        className={`cad-tool-btn ${activeTool === 'polyline' ? 'active' : ''}`}
        onClick={() => setActiveTool('polyline')}
        data-tooltip="Draw Survey Line (L)"
      >
        <PenTool size={18} />
      </button>

      {/* 4. Polygon Tool */}
      <button
        className={`cad-tool-btn ${activeTool === 'polygon' ? 'active' : ''}`}
        onClick={() => setActiveTool('polygon')}
        data-tooltip="Boundary Polygon (G)"
      >
        <Hexagon size={18} />
      </button>

      {/* 5. Measure Tool */}
      <button
        className={`cad-tool-btn ${activeTool === 'measure' ? 'active' : ''}`}
        onClick={() => setActiveTool('measure')}
        data-tooltip="Measure Tool (M)"
      >
        <Ruler size={18} />
      </button>

      <div className="tool-group-divider" />

      {/* 6. Exact Coordinate Input */}
      <button
        className="cad-tool-btn"
        onClick={onOpenCoordinateModal}
        data-tooltip="Exact Coordinate Entry (C)"
      >
        <MapPin size={18} />
      </button>

      {/* 7. Chain Survey (Tape Only, No Compass) - Always visible */}
      <button
        className="cad-tool-btn"
        onClick={onOpenChainSurveyModal}
        data-tooltip="Chain Survey (Tape Only, No Compass)"
      >
        <Link2 size={18} />
      </button>

      {/* Advanced Tools Gating: In Simple mode, collapse Traverse, Curves, and Sketch behind a toggle */}
      {project.settings.uiMode === 'simple' ? (
        <>
          <button
            className={`cad-tool-btn ${showAdvancedTools ? 'active' : ''}`}
            onClick={() => setShowAdvancedTools(!showAdvancedTools)}
            data-tooltip={showAdvancedTools ? 'Hide Advanced Tools' : 'Advanced Tools (Traverse, Curves, Sketch) ▾'}
            style={{ color: showAdvancedTools ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
          >
            <ChevronDown
              size={16}
              style={{
                transform: showAdvancedTools ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {showAdvancedTools && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0', borderLeft: '2px solid var(--accent-cyan)', marginLeft: 4 }}>
              {/* Traverse Input (Distance + Bearing) */}
              <button
                className="cad-tool-btn"
                onClick={onOpenTraverseModal}
                data-tooltip="Survey Traverse Input (Distance + Bearing)"
              >
                <Compass size={18} />
              </button>

              {/* Circular Curve / Arc */}
              <button
                className="cad-tool-btn"
                onClick={onOpenCurveModal}
                data-tooltip="Circular Curves & Arcs (3-Pt / Radius)"
                style={{ color: '#38bdf8' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 4 20 A 16 16 0 0 1 20 4" />
                  <circle cx="4" cy="20" r="2.5" fill="currentColor" />
                  <circle cx="20" cy="4" r="2.5" fill="currentColor" />
                  <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
                </svg>
              </button>

              {/* Sketch-to-Survey */}
              <button
                className="cad-tool-btn"
                style={{ color: 'var(--accent-amber)' }}
                onClick={onOpenSketchModal}
                data-tooltip="Sketch-to-Survey (Smart Import)"
              >
                <Sparkles size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Advanced (Surveyor) Mode: all tools visible directly */
        <>
          {/* Traverse Input (Distance + Bearing) */}
          <button
            className="cad-tool-btn"
            onClick={onOpenTraverseModal}
            data-tooltip="Survey Traverse Input (T)"
          >
            <Compass size={18} />
          </button>

          {/* Circular Curve / Arc */}
          <button
            className="cad-tool-btn"
            onClick={onOpenCurveModal}
            data-tooltip="Circular Curves & Arcs (3-Pt / Radius)"
            style={{ color: '#38bdf8' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 4 20 A 16 16 0 0 1 20 4" />
              <circle cx="4" cy="20" r="2.5" fill="currentColor" />
              <circle cx="20" cy="4" r="2.5" fill="currentColor" />
              <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
            </svg>
          </button>

          {/* Sketch-to-Survey */}
          <button
            className="cad-tool-btn"
            style={{ color: 'var(--accent-amber)' }}
            onClick={onOpenSketchModal}
            data-tooltip="Sketch-to-Survey (Smart Import)"
          >
            <Sparkles size={18} />
          </button>
        </>
      )}

      <div className="tool-group-divider" />

      {/* 8. Pan Tool */}
      <button
        className={`cad-tool-btn ${activeTool === 'pan' ? 'active' : ''}`}
        onClick={() => setActiveTool('pan')}
        data-tooltip="Pan Viewport (Space)"
      >
        <Hand size={18} />
      </button>

      {/* 9. Zoom Fit */}
      <button
        className="cad-tool-btn"
        onClick={handleFit}
        data-tooltip="Fit Drawing (F)"
        disabled={project.points.length === 0}
      >
        <Maximize2 size={18} />
      </button>

      <div className="tool-group-divider" />

      {/* 10. Undo */}
      <button
        className="cad-tool-btn"
        onClick={undo}
        disabled={!canUndo}
        data-tooltip="Undo (Ctrl+Z)"
      >
        <Undo2 size={18} />
      </button>

      {/* 11. Redo */}
      <button
        className="cad-tool-btn"
        onClick={redo}
        disabled={!canRedo}
        data-tooltip="Redo (Ctrl+Y)"
      >
        <Redo2 size={18} />
      </button>
    </aside>
  );
};

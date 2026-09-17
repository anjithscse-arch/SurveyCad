import React, { useState } from 'react';
import { useCAD } from '../../context/CADContext';
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
  FileSpreadsheet,
} from 'lucide-react';
import { getBoundingBox } from '../../geometry/polygon';
import { fitToBounds } from '../../geometry/transform';

interface CADToolbarProps {
  onOpenCoordinateModal: () => void;
  onOpenTraverseModal: () => void;
  onOpenChainSurveyModal: () => void;
  onOpenCurveModal: () => void;
  onOpenCSVImportModal?: () => void;
  onOpenSketchModal: () => void;
}

export const CADToolbar: React.FC<CADToolbarProps> = ({
  onOpenCoordinateModal,
  onOpenTraverseModal,
  onOpenChainSurveyModal,
  onOpenCurveModal,
  onOpenCSVImportModal,
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

  // Section 1: Tape / Chain
  const renderTapeChainSection = () => (
    <div className="toolbar-section">
      <div className="toolbar-section-label">Tape / Chain</div>
      <button
        className="cad-tool-btn"
        onClick={onOpenChainSurveyModal}
        data-tooltip="Chain Survey (Tape Only, No Compass)"
      >
        <Link2 size={18} />
      </button>
    </div>
  );

  // Section 2: Angle & Bearing
  const renderAngleBearingSection = () => (
    <div className="toolbar-section">
      <div className="toolbar-section-label">Angle & Bearing</div>
      <button
        className="cad-tool-btn"
        onClick={onOpenTraverseModal}
        data-tooltip="Survey Traverse Input (Distance + Bearing)"
      >
        <Compass size={18} />
      </button>
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
    </div>
  );

  // Section 3: Coordinates
  const renderCoordinatesSection = () => (
    <div className="toolbar-section">
      <div className="toolbar-section-label">Coordinates</div>
      <button
        className="cad-tool-btn"
        onClick={onOpenCoordinateModal}
        data-tooltip="Exact Coordinate Entry (C)"
      >
        <MapPin size={18} />
      </button>
      {onOpenCSVImportModal && (
        <button
          className="cad-tool-btn"
          onClick={onOpenCSVImportModal}
          data-tooltip="Import Points from CSV"
        >
          <FileSpreadsheet size={18} />
        </button>
      )}
    </div>
  );

  // Section 4: Draw
  const renderDrawSection = () => (
    <div className="toolbar-section">
      <div className="toolbar-section-label">Draw</div>
      <button
        className={`cad-tool-btn ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => setActiveTool('select')}
        data-tooltip="Select / Edit (V)"
      >
        <MousePointer size={18} />
      </button>
      <button
        className={`cad-tool-btn ${activeTool === 'point' ? 'active' : ''}`}
        onClick={() => setActiveTool('point')}
        data-tooltip="Place Point (P)"
      >
        <Dot size={24} />
      </button>
      <button
        className={`cad-tool-btn ${activeTool === 'polyline' ? 'active' : ''}`}
        onClick={() => setActiveTool('polyline')}
        data-tooltip="Draw Survey Line (L)"
      >
        <PenTool size={18} />
      </button>
      <button
        className={`cad-tool-btn ${activeTool === 'polygon' ? 'active' : ''}`}
        onClick={() => setActiveTool('polygon')}
        data-tooltip="Boundary Polygon (G)"
      >
        <Hexagon size={18} />
      </button>
      <button
        className={`cad-tool-btn ${activeTool === 'measure' ? 'active' : ''}`}
        onClick={() => setActiveTool('measure')}
        data-tooltip="Measure Tool (M)"
      >
        <Ruler size={18} />
      </button>
    </div>
  );

  // Section 5: Smart Import
  const renderSmartImportSection = () => (
    <div className="toolbar-section">
      <div className="toolbar-section-label">Smart Import</div>
      <button
        className="cad-tool-btn"
        style={{ color: 'var(--accent-amber)' }}
        onClick={onOpenSketchModal}
        data-tooltip="Sketch-to-Survey (Smart Import)"
      >
        <Sparkles size={18} />
      </button>
    </div>
  );

  // Section 6: View
  const renderViewSection = () => (
    <div className="toolbar-section">
      <div className="toolbar-section-label">View</div>
      <button
        className={`cad-tool-btn ${activeTool === 'pan' ? 'active' : ''}`}
        onClick={() => setActiveTool('pan')}
        data-tooltip="Pan Viewport (Space)"
      >
        <Hand size={18} />
      </button>
      <button
        className="cad-tool-btn"
        onClick={handleFit}
        data-tooltip="Fit Drawing (F)"
        disabled={project.points.length === 0}
      >
        <Maximize2 size={18} />
      </button>
      <button
        className="cad-tool-btn"
        onClick={undo}
        disabled={!canUndo}
        data-tooltip="Undo (Ctrl+Z)"
      >
        <Undo2 size={18} />
      </button>
      <button
        className="cad-tool-btn"
        onClick={redo}
        disabled={!canRedo}
        data-tooltip="Redo (Ctrl+Y)"
      >
        <Redo2 size={18} />
      </button>
    </div>
  );

  const isSimple = project.settings.uiMode === 'simple';

  return (
    <aside className="cad-action-toolbar">
      {/* 1. Tape / Chain */}
      {renderTapeChainSection()}

      <div className="tool-group-divider" />

      {/* In Advanced Mode, render Angle & Bearing and Coordinates directly */}
      {!isSimple && (
        <>
          {renderAngleBearingSection()}
          <div className="tool-group-divider" />
          {renderCoordinatesSection()}
          <div className="tool-group-divider" />
        </>
      )}

      {/* 4. Draw */}
      {renderDrawSection()}

      <div className="tool-group-divider" />

      {/* In Advanced Mode, render Smart Import directly */}
      {!isSimple && (
        <>
          {renderSmartImportSection()}
          <div className="tool-group-divider" />
        </>
      )}

      {/* In Simple Mode, render collapsible Advanced Tools flyout */}
      {isSimple && (
        <>
          <button
            className={`cad-tool-btn ${showAdvancedTools ? 'active' : ''}`}
            onClick={() => setShowAdvancedTools(!showAdvancedTools)}
            data-tooltip={showAdvancedTools ? 'Hide Advanced Tools' : 'Advanced Tools ▾'}
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '4px 0',
                borderLeft: '2px solid var(--accent-cyan)',
                marginLeft: 2,
                width: '100%',
              }}
            >
              {renderAngleBearingSection()}
              <div className="tool-group-divider" />
              {renderCoordinatesSection()}
              <div className="tool-group-divider" />
              {renderSmartImportSection()}
            </div>
          )}

          <div className="tool-group-divider" />
        </>
      )}

      {/* 6. View (Always visible in all UI modes) */}
      {renderViewSection()}
    </aside>
  );
};

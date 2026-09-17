import React, { useState, useRef } from 'react';
import { useCAD } from '../../context/CADContext';
import {
  FileText,
  Download,
  FolderOpen,
  Save,
  FileSpreadsheet,
  FilePlus,
  Compass,
  MapPin,
  Hexagon,
  Sun,
  Moon,
  Sparkles,
  Link2,
  ChevronDown,
} from 'lucide-react';
import { downloadProjectFile, parseProjectJson } from '../../storage/serializer';
import { saveProject } from '../../storage/indexeddb';
import { exportPointsToCSV, exportLinesToCSV, downloadCSV } from '../../export/csv';
import { generateSurveyReportPDF } from '../../export/pdf';
import { downloadSVG, exportSVGToPNGDataUrl } from '../../export/svg';
import { downloadDXF } from '../../export/dxf';
import { downloadGeoJSON } from '../../export/geojson';
import { SetPolygonBoundaryCommand } from '../../commands/polygonCommands';
import { SurveyPolygon, SurveyLine } from '../../types/geometry';

interface HeaderProps {
  onOpenNewProjectModal: () => void;
  onOpenCoordinateModal: () => void;
  onOpenTraverseModal: () => void;
  onOpenChainSurveyModal: () => void;
  onOpenCurveModal: () => void;
  onOpenCSVImportModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenSketchModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewProjectModal,
  onOpenCoordinateModal,
  onOpenTraverseModal,
  onOpenChainSurveyModal,
  onOpenCurveModal,
  onOpenCSVImportModal,
  onOpenSettingsModal,
  onOpenSketchModal,
}) => {
  const {
    project,
    loadNewProject,
    areaResult,
    updateSettings,
    executeCommand,
  } = useCAD();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAdvancedSurvey, setShowAdvancedSurvey] = useState(false);
  const [showCadGisExports, setShowCadGisExports] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus when clicking outside
  const toggleMenu = (name: string) => {
    setActiveMenu((prev) => (prev === name ? null : name));
  };

  const closeMenu = () => setActiveMenu(null);

  // Handle Save Project
  const handleSave = async () => {
    await saveProject(project);
    alert(`Project "${project.metadata.name}" saved to browser storage.`);
    closeMenu();
  };

  // Handle Download JSON
  const handleExportJSON = () => {
    downloadProjectFile(project);
    closeMenu();
  };

  // Handle Open JSON file
  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseProjectJson(content);
      if (res.project) {
        loadNewProject(res.project);
      } else {
        alert(res.error || 'Failed to parse project file');
      }
    };
    reader.readAsText(file);
    closeMenu();
  };

  // Handle PDF Export
  const handleExportPDF = async () => {
    closeMenu();
    const svg = document.getElementById('surveycad-svg-canvas') as SVGSVGElement | null;
    let drawingDataUrl: string | undefined;

    if (svg) {
      try {
        drawingDataUrl = await exportSVGToPNGDataUrl(svg);
      } catch (_) {}
    }

    generateSurveyReportPDF(project, areaResult, {
      includeDrawing: !!drawingDataUrl,
      drawingDataUrl,
    });
  };

  // Handle CSV Export
  const handleExportPointsCSV = () => {
    const csv = exportPointsToCSV(project.points);
    downloadCSV(csv, `${project.metadata.name.replace(/\s+/g, '_')}_points.csv`);
    closeMenu();
  };

  const handleExportLinesCSV = () => {
    const csv = exportLinesToCSV(project.lines, project.points);
    downloadCSV(csv, `${project.metadata.name.replace(/\s+/g, '_')}_lines.csv`);
    closeMenu();
  };

  // Handle SVG Vector Download
  const handleExportSVG = () => {
    const svg = document.getElementById('surveycad-svg-canvas') as SVGSVGElement | null;
    if (svg) {
      downloadSVG(svg, `${project.metadata.name.replace(/\s+/g, '_')}_drawing.svg`);
    }
    closeMenu();
  };

  // Handle AutoCAD DXF Export
  const handleExportDXF = () => {
    downloadDXF(project);
    closeMenu();
  };

  // Handle GIS GeoJSON Export
  const handleExportGeoJSON = () => {
    downloadGeoJSON(project);
    closeMenu();
  };

  // Close boundary polygon command
  const handleCloseBoundary = () => {
    closeMenu();
    if (project.points.length < 3) {
      alert('At least 3 survey points are required to form a closed boundary polygon.');
      return;
    }

    // Auto connect all points sequentially
    const nextLines: SurveyLine[] = [];
    const n = project.points.length;
    for (let i = 0; i < n; i++) {
      nextLines.push({
        id: `line_${Date.now()}_${i}`,
        startPointId: project.points[i].id,
        endPointId: project.points[(i + 1) % n].id,
      });
    }

    const newPolygon: SurveyPolygon = {
      id: `poly_${Date.now()}`,
      name: project.metadata.propertyName || 'Property Boundary',
      pointIds: project.points.map((p) => p.id),
      isClosed: true,
    };

    executeCommand(new SetPolygonBoundaryCommand(newPolygon, nextLines, project));
  };

  return (
    <header className="cad-header">
      <div className="brand-section">
        <div className="brand-logo">SC</div>
        <span className="brand-title">
          SurveyCAD
          <span className="brand-badge">v1.0 SDD</span>
        </span>

        {/* Menu Bar Dropdowns */}
        <nav className="menu-bar" style={{ marginLeft: 16 }}>
          {/* 1. File Menu */}
          <div style={{ position: 'relative' }}>
            <button className="menu-btn" onClick={() => toggleMenu('file')}>
              File
            </button>
            {activeMenu === 'file' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'var(--bg-panel-solid)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  padding: '4px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 200,
                  minWidth: 190,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                  onClick={() => { onOpenNewProjectModal(); closeMenu(); }}
                >
                  <FilePlus size={14} /> New / Edit Project...
                </button>
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FolderOpen size={14} /> Open .surveycad File...
                </button>
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                  onClick={handleSave}
                >
                  <Save size={14} /> Save to Browser Storage
                </button>
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                  onClick={handleExportJSON}
                >
                  <Download size={14} /> Export .surveycad File
                </button>
              </div>
            )}
          </div>

          {/* 2. Survey Menu */}
          <div style={{ position: 'relative' }}>
            <button className="menu-btn" onClick={() => toggleMenu('survey')}>
              Survey
            </button>
            {activeMenu === 'survey' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'var(--bg-panel-solid)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  padding: '4px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 200,
                  minWidth: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {/* 1. Tape / Chain */}
                <div className="menu-section-header">Tape / Chain</div>
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                  onClick={() => { onOpenChainSurveyModal(); closeMenu(); }}
                >
                  <Link2 size={14} /> Chain Survey (Tape Only, No Compass)...
                </button>

                {/* In Advanced Mode, render Angle & Bearing directly */}
                {project.settings.uiMode !== 'simple' && (
                  <>
                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                    <div className="menu-section-header">Angle & Bearing</div>
                    <button
                      className="menu-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                      onClick={() => { onOpenTraverseModal(); closeMenu(); }}
                    >
                      <Compass size={14} /> Add Traverse Leg...
                    </button>
                    <button
                      className="menu-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', color: '#38bdf8' }}
                      onClick={() => { onOpenCurveModal(); closeMenu(); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M 4 20 A 16 16 0 0 1 20 4" />
                        <circle cx="4" cy="20" r="2.5" fill="currentColor" />
                        <circle cx="20" cy="4" r="2.5" fill="currentColor" />
                      </svg>
                      Circular Curves & Arcs...
                    </button>
                  </>
                )}

                {/* 3. Coordinates */}
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                <div className="menu-section-header">Coordinates</div>
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                  onClick={() => { onOpenCoordinateModal(); closeMenu(); }}
                >
                  <MapPin size={14} /> Exact Coordinate Entry...
                </button>
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                  onClick={() => { onOpenCSVImportModal(); closeMenu(); }}
                >
                  <FileSpreadsheet size={14} /> Import Points from CSV...
                </button>

                {/* 4. Draw */}
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                <div className="menu-section-header">Draw</div>
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                  onClick={handleCloseBoundary}
                >
                  <Hexagon size={14} /> Close Boundary Polygon
                </button>

                {/* 5. Smart Import (in Advanced Mode) */}
                {project.settings.uiMode !== 'simple' && (
                  <>
                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                    <div className="menu-section-header">Smart Import</div>
                    <button
                      className="menu-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', color: 'var(--accent-amber)' }}
                      onClick={() => { onOpenSketchModal(); closeMenu(); }}
                    >
                      <Sparkles size={14} /> Sketch-to-Survey (Smart Import)...
                    </button>
                  </>
                )}

                {/* Advanced Survey Tools gating in Simple mode */}
                {project.settings.uiMode === 'simple' && (
                  <>
                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                    <button
                      className="menu-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        textAlign: 'left',
                        color: 'var(--accent-cyan)',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                      onClick={() => setShowAdvancedSurvey(!showAdvancedSurvey)}
                    >
                      <span>Advanced Tools</span>
                      <ChevronDown
                        size={12}
                        style={{
                          transform: showAdvancedSurvey ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </button>
                    {showAdvancedSurvey && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8, borderLeft: '2px solid var(--accent-cyan)', marginTop: 2 }}>
                        <div className="menu-section-header">Angle & Bearing</div>
                        <button
                          className="menu-btn"
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                          onClick={() => { onOpenTraverseModal(); closeMenu(); }}
                        >
                          <Compass size={14} /> Add Traverse Leg...
                        </button>
                        <button
                          className="menu-btn"
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', color: '#38bdf8' }}
                          onClick={() => { onOpenCurveModal(); closeMenu(); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M 4 20 A 16 16 0 0 1 20 4" />
                            <circle cx="4" cy="20" r="2.5" fill="currentColor" />
                            <circle cx="20" cy="4" r="2.5" fill="currentColor" />
                          </svg>
                          Circular Curves & Arcs...
                        </button>
                        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                        <div className="menu-section-header">Smart Import</div>
                        <button
                          className="menu-btn"
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', color: 'var(--accent-amber)' }}
                          onClick={() => { onOpenSketchModal(); closeMenu(); }}
                        >
                          <Sparkles size={14} /> Sketch-to-Survey (Smart Import)...
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* 3. Export Menu */}
          <div style={{ position: 'relative' }}>
            <button className="menu-btn" onClick={() => toggleMenu('export')}>
              Export
            </button>
            {activeMenu === 'export' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'var(--bg-panel-solid)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  padding: '4px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 200,
                  minWidth: 230,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {/* Always Top-Level: PDF & SVG */}
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', fontWeight: 'bold', color: 'var(--accent-cyan)' }}
                  onClick={handleExportPDF}
                >
                  <FileText size={14} /> Generate PDF Survey Report
                </button>
                <button
                  className="menu-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                  onClick={handleExportSVG}
                >
                  <Download size={14} /> Export Vector Drawing (SVG)
                </button>

                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

                {/* Collapsed by default: Export to CAD / GIS */}
                <button
                  className="menu-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-bright)',
                  }}
                  onClick={() => setShowCadGisExports(!showCadGisExports)}
                >
                  <span>Export to CAD / GIS</span>
                  <ChevronDown
                    size={12}
                    style={{
                      transform: showCadGisExports ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>

                {showCadGisExports && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8, borderLeft: '2px solid var(--accent-cyan)', marginTop: 2 }}>
                    <button
                      className="menu-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', color: '#10b981' }}
                      onClick={handleExportDXF}
                    >
                      <Download size={14} /> Export AutoCAD DXF (.dxf)
                    </button>
                    <button
                      className="menu-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', color: '#60a5fa' }}
                      onClick={handleExportGeoJSON}
                    >
                      <Download size={14} /> Export GIS GeoJSON (.geojson)
                    </button>
                    <button
                      className="menu-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                      onClick={handleExportPointsCSV}
                    >
                      <FileSpreadsheet size={14} /> Export Points CSV
                    </button>
                    <button
                      className="menu-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}
                      onClick={handleExportLinesCSV}
                    >
                      <FileSpreadsheet size={14} /> Export Survey Lines CSV
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Settings Menu */}
          <button className="menu-btn" onClick={onOpenSettingsModal}>
            Settings
          </button>
        </nav>
      </div>

      <div className="header-right">
        {/* Hidden file input for project open */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".surveycad,.json"
          style={{ display: 'none' }}
          onChange={handleOpenFile}
        />

        {/* Project Name indicator */}
        <div className="project-name-badge">
          {project.metadata.name || 'Untitled Survey'}
        </div>

        {/* Theme Toggle */}
        <button
          className="menu-btn"
          style={{ padding: '6px', borderRadius: '50%' }}
          onClick={() => {
            const nextTheme = project.settings.theme === 'dark' ? 'light' : 'dark';
            updateSettings({ theme: nextTheme });
            if (nextTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
            else document.documentElement.removeAttribute('data-theme');
          }}
          title="Toggle Light/Dark Theme"
        >
          {project.settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Sketch-to-Survey Quick Button (Advanced Mode) */}
        {project.settings.uiMode === 'advanced' && (
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
            onClick={onOpenSketchModal}
            title="Import rough sketch or field notebook page"
          >
            <Sparkles size={14} /> Sketch-to-Survey
          </button>
        )}

        {/* Generate Report Quick Button */}
        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}
          onClick={handleExportPDF}
        >
          <FileText size={14} /> Export PDF Report
        </button>
      </div>
    </header>
  );
};

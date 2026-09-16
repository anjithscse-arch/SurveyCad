import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCAD } from '../../context/CADContext';
import { GridRenderer } from './GridRenderer';
import { GeometryRenderer } from './GeometryRenderer';
import { DimensionRenderer } from './DimensionRenderer';
import { SnapIndicator } from './SnapIndicator';
import { NorthArrow } from './NorthArrow';
import { ScaleBar } from './ScaleBar';
import { screenToWorld, worldToScreen, zoomAtScreenPoint, fitToBounds } from '../../geometry/transform';
import { findSnap, SnapResult } from '../../geometry/snap';
import { AddPointCommand, MovePointCommand, DeletePointCommand } from '../../commands/pointCommands';
import { SetPolygonBoundaryCommand } from '../../commands/polygonCommands';
import { SurveyPoint, SurveyLine, SurveyPolygon, Point2D } from '../../types/geometry';
import { distance } from '../../geometry/distance';
import { calculateBearing, formatDMS } from '../../geometry/bearing';
import { getBoundingBox } from '../../geometry/polygon';
import { formatDistance, formatArea } from '../../survey/units';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const CADCanvas: React.FC = () => {
  const {
    project,
    viewport,
    setViewport,
    activeTool,
    setActiveTool,
    selectedPointIds,
    setSelectedPointIds,
    selectedLineIds,
    setSelectedLineIds,
    selectedPolygonId,
    setSelectedPolygonId,
    setCursorWorld,
    activeSnap,
    setActiveSnap,
    measurePoints,
    setMeasurePoints,
    executeCommand,
    areaResult,
    undo,
    redo,
  } = useCAD();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag / Pan State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });

  // Moving Point State
  const [draggingPoint, setDraggingPoint] = useState<{ point: SurveyPoint; startPos: Point2D } | null>(null);

  // Multi-point creation chain (Polyline / Polygon)
  const [currentChainPointIds, setCurrentChainPointIds] = useState<string[]>([]);
  const [rubberBandTarget, setRubberBandTarget] = useState<Point2D | null>(null);

  // Update container dimensions into viewport
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setViewport((prev) => ({
          ...prev,
          width: clientWidth,
          height: clientHeight,
        }));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [setViewport]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        setCurrentChainPointIds([]);
        setRubberBandTarget(null);
        setMeasurePoints([]);
        setSelectedPointIds([]);
        setSelectedLineIds([]);
        setActiveTool('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPointIds.length > 0) {
          const ptId = selectedPointIds[0];
          try {
            executeCommand(new DeletePointCommand(project, ptId));
            setSelectedPointIds([]);
          } catch (_) {}
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === 'f') {
        // Fit Drawing
        handleFitDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, selectedPointIds, undo, redo, activeTool, executeCommand]);

  // Fit Drawing to Canvas
  const handleFitDrawing = useCallback(() => {
    if (project.points.length === 0) return;
    const bounds = getBoundingBox(project.points, 10);
    setViewport((prev) => fitToBounds(bounds, prev.width, prev.height, 70));
  }, [project.points, setViewport]);

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setViewport((prev) => zoomAtScreenPoint(prev, screenPoint, zoomFactor));
  };

  // Mouse Move on Canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const rawWorld = screenToWorld(screenPos, viewport);

    // 1. Handle Panning
    if (isPanning) {
      const dx = screenPos.x - panStart.x;
      const dy = screenPos.y - panStart.y;
      setViewport((prev) => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy,
      }));
      setPanStart(screenPos);
      return;
    }

    // 2. Handle Snapping
    let snap: SnapResult | null = null;
    if (project.settings.showSnapHalos) {
      snap = findSnap(rawWorld, project.points, project.lines, viewport, {
        snapTolerancePixels: project.settings.snapTolerancePixels,
        enableGrid: project.settings.showGrid,
        gridSpacing: project.settings.gridSpacingMeters,
        excludePointIds: draggingPoint ? [draggingPoint.point.id] : undefined,
      });
    }
    setActiveSnap(snap);

    const effectiveWorld = snap ? snap.point : rawWorld;
    setCursorWorld(effectiveWorld);

    // 3. Handle Dragging Point
    if (draggingPoint) {
      // Update coordinates dynamically during drag
      const nextPoints = project.points.map((p) =>
        p.id === draggingPoint.point.id ? { ...p, x: effectiveWorld.x, y: effectiveWorld.y } : p
      );
      // Project is updated through state without pushing history until release
      // to keep dragging smooth
      project.points = nextPoints;
      setViewport((v) => ({ ...v })); // Trigger re-render
      return;
    }

    // 4. Update rubber-band line for multi-point tools
    if (currentChainPointIds.length > 0) {
      setRubberBandTarget(effectiveWorld);
    }
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button or Space+click triggers pan
    if (e.button === 1 || activeTool === 'pan' || e.shiftKey) {
      setIsPanning(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setPanStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      return;
    }

    if (e.button !== 0) return; // Left click only for tools

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const rawWorld = screenToWorld(screenPos, viewport);
    const targetWorld = activeSnap ? activeSnap.point : rawWorld;

    // Dispatch tool actions
    if (activeTool === 'point') {
      const nextLetter = String.fromCharCode(65 + (project.points.length % 26));
      const label = project.points.length >= 26 ? `P${project.points.length + 1}` : nextLetter;
      const newPoint: SurveyPoint = {
        id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        label,
        x: Math.round(targetWorld.x * 1000) / 1000,
        y: Math.round(targetWorld.y * 1000) / 1000,
      };
      executeCommand(new AddPointCommand(newPoint));
    } else if (activeTool === 'polyline' || activeTool === 'polygon') {
      handleChainClick(targetWorld);
    } else if (activeTool === 'measure') {
      handleMeasureClick(targetWorld);
    } else if (activeTool === 'select') {
      // Clear selection if clicking empty canvas
      setSelectedPointIds([]);
      setSelectedLineIds([]);
      setSelectedPolygonId(null);
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (draggingPoint) {
      const pt = project.points.find((p) => p.id === draggingPoint.point.id);
      if (pt) {
        // Execute the official Move command to store in history
        executeCommand(
          new MovePointCommand(
            pt.id,
            draggingPoint.startPos,
            { x: pt.x, y: pt.y },
            pt.label
          )
        );
      }
      setDraggingPoint(null);
    }
  };

  // Handle Point Mouse Down (for selection & drag)
  const handlePointMouseDown = (pt: SurveyPoint, e: React.MouseEvent) => {
    if (activeTool === 'polyline' || activeTool === 'polygon') {
      handleChainPointSelect(pt.id);
      return;
    }

    if (activeTool === 'select') {
      setSelectedPointIds([pt.id]);
      setSelectedLineIds([]);
      setSelectedPolygonId(null);
      setDraggingPoint({
        point: pt,
        startPos: { x: pt.x, y: pt.y },
      });
    }
  };

  // Handle Chain Point Selection
  const handleChainPointSelect = (ptId: string) => {
    if (activeTool === 'polygon' && currentChainPointIds.length >= 3 && currentChainPointIds[0] === ptId) {
      // User clicked starting point -> Close Polygon!
      closePolygonChain();
      return;
    }

    if (!currentChainPointIds.includes(ptId)) {
      const nextChain = [...currentChainPointIds, ptId];
      setCurrentChainPointIds(nextChain);
      createLinesBetweenChain(nextChain);
    }
  };

  // Handle Chain Click on empty space
  const handleChainClick = (worldPos: Point2D) => {
    const nextLetter = String.fromCharCode(65 + (project.points.length % 26));
    const label = project.points.length >= 26 ? `P${project.points.length + 1}` : nextLetter;
    const newPt: SurveyPoint = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label,
      x: Math.round(worldPos.x * 1000) / 1000,
      y: Math.round(worldPos.y * 1000) / 1000,
    };

    let newLine: SurveyLine | undefined;
    if (currentChainPointIds.length > 0) {
      const prevId = currentChainPointIds[currentChainPointIds.length - 1];
      newLine = {
        id: `line_${Date.now()}`,
        startPointId: prevId,
        endPointId: newPt.id,
      };
    }

    executeCommand(new AddPointCommand(newPt, newLine));
    setCurrentChainPointIds((prev) => [...prev, newPt.id]);
  };

  // Helper to connect points in chain
  const createLinesBetweenChain = (chain: string[]) => {
    if (chain.length < 2) return;
    const p1 = chain[chain.length - 2];
    const p2 = chain[chain.length - 1];
    const exists = project.lines.some(
      (l) =>
        (l.startPointId === p1 && l.endPointId === p2) ||
        (l.startPointId === p2 && l.endPointId === p1)
    );
    if (!exists) {
      const newLine: SurveyLine = {
        id: `line_${Date.now()}`,
        startPointId: p1,
        endPointId: p2,
      };
      project.lines.push(newLine);
    }
  };

  // Close Polygon Chain
  const closePolygonChain = () => {
    if (currentChainPointIds.length < 3) return;

    // Add closing line from last point to first
    const firstId = currentChainPointIds[0];
    const lastId = currentChainPointIds[currentChainPointIds.length - 1];
    const hasClosingLine = project.lines.some(
      (l) =>
        (l.startPointId === lastId && l.endPointId === firstId) ||
        (l.startPointId === firstId && l.endPointId === lastId)
    );

    let nextLines = [...project.lines];
    if (!hasClosingLine) {
      nextLines.push({
        id: `line_${Date.now()}`,
        startPointId: lastId,
        endPointId: firstId,
      });
    }

    const newPolygon: SurveyPolygon = {
      id: `poly_${Date.now()}`,
      name: 'Property Boundary',
      pointIds: currentChainPointIds,
      isClosed: true,
    };

    executeCommand(new SetPolygonBoundaryCommand(newPolygon, nextLines, project));
    setCurrentChainPointIds([]);
    setRubberBandTarget(null);
    setActiveTool('select');
  };

  // Handle Measure Tool
  const handleMeasureClick = (pos: Point2D) => {
    if (measurePoints.length === 0) {
      setMeasurePoints([pos]);
    } else if (measurePoints.length === 1) {
      setMeasurePoints([measurePoints[0], pos]);
    } else {
      setMeasurePoints([pos]);
    }
  };

  // Active rubber-band line calculation
  const drawingLine =
    currentChainPointIds.length > 0 && rubberBandTarget
      ? (() => {
          const lastId = currentChainPointIds[currentChainPointIds.length - 1];
          const lastPt = project.points.find((p) => p.id === lastId);
          return lastPt ? { start: lastPt, current: rubberBandTarget } : null;
        })()
      : null;

  // Active measurement result
  const measureResult =
    measurePoints.length === 2
      ? {
          dist: distance(measurePoints[0], measurePoints[1]),
          bearing: calculateBearing(measurePoints[0], measurePoints[1]),
        }
      : null;

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${activeTool === 'pan' || isPanning ? 'pan-tool' : ''}`}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg ref={svgRef} id="surveycad-svg-canvas" className="cad-svg-canvas">
        {/* Adaptive Grid */}
        {project.settings.showGrid && (
          <GridRenderer viewport={viewport} gridSpacingMeters={project.settings.gridSpacingMeters} />
        )}

        {/* Geometry (Polygons, Lines, Arcs, Points) */}
        <GeometryRenderer
          points={project.points}
          lines={project.lines}
          arcs={project.arcs}
          polygons={project.polygons}
          viewport={viewport}
          selectedPointIds={selectedPointIds}
          selectedLineIds={selectedLineIds}
          selectedPolygonId={selectedPolygonId}
          drawingLine={drawingLine}
          onPointMouseDown={handlePointMouseDown}
          onLineClick={(l) => {
            setSelectedLineIds([l.id]);
            setSelectedPointIds([]);
          }}
          onPolygonClick={(p) => {
            setSelectedPolygonId(p.id);
          }}
        />

        {/* Dimension & Side Length Labels */}
        {project.settings.showDimensions && (
          <DimensionRenderer
            points={project.points}
            lines={project.lines}
            arcs={project.arcs}
            polygons={project.polygons}
            viewport={viewport}
            linearUnit={project.settings.linearUnit}
            areaUnit={project.settings.areaUnit}
            precision={project.settings.decimalPrecision}
            showBearings={project.settings.showBearings}
          />
        )}

        {/* Snap Indicator */}
        <SnapIndicator snap={activeSnap} viewport={viewport} />

        {/* Temporary Measurement Line */}
        {measurePoints.length === 2 && (
          <g pointerEvents="none">
            <line
              x1={worldToScreen(measurePoints[0], viewport).x}
              y1={worldToScreen(measurePoints[0], viewport).y}
              x2={worldToScreen(measurePoints[1], viewport).x}
              y2={worldToScreen(measurePoints[1], viewport).y}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          </g>
        )}
      </svg>

      {/* Overlay: Live Area Card at Top-Left */}
      <div className="canvas-overlay-top-left">
        {areaResult.isValid && (
          <div className="area-live-badge">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="area-badge-title">Enclosed Boundary Area</span>
              {areaResult.hasSelfIntersections ? (
                <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600 }}>
                  <AlertTriangle size={12} /> Intersecting Edges
                </span>
              ) : (
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600 }}>
                  <CheckCircle2 size={12} /> Valid Boundary
                </span>
              )}
            </div>

            <div className="area-badge-primary">
              {formatArea(areaResult.sqMeters, project.settings.areaUnit, project.settings.decimalPrecision)}
            </div>

            <div className="area-badge-sub">
              <span>{formatArea(areaResult.cents, 'cent', 2)}</span>
              <span>•</span>
              <span>{formatArea(areaResult.acres, 'acre', 4)}</span>
              <span>•</span>
              <span>Perimeter: {formatDistance(areaResult.perimeterMeters, project.settings.linearUnit, project.settings.decimalPrecision)}</span>
            </div>
          </div>
        )}

        {/* Multi-point drawing banner */}
        {currentChainPointIds.length > 0 && (
          <div
            style={{
              background: 'var(--bg-panel)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--accent-cyan)',
              color: 'var(--text-main)',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'auto',
            }}
          >
            <span>Points in boundary: <strong>{currentChainPointIds.length}</strong></span>
            {currentChainPointIds.length >= 3 && (
              <button
                className="btn-primary"
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={closePolygonChain}
              >
                Close Boundary
              </button>
            )}
            <button
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: 11 }}
              onClick={() => {
                setCurrentChainPointIds([]);
                setRubberBandTarget(null);
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Measure Tool Output Banner */}
        {measureResult && (
          <div
            style={{
              background: 'var(--bg-panel)',
              backdropFilter: 'blur(8px)',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #f59e0b',
              color: '#f8fafc',
              fontSize: 11,
              display: 'flex',
              gap: 12,
              fontFamily: 'var(--font-mono)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <span>Distance: <strong>{formatDistance(measureResult.dist, project.settings.linearUnit, 3)}</strong></span>
            <span>Bearing: <strong>{formatDMS(measureResult.bearing)}</strong></span>
          </div>
        )}
      </div>

      {/* Overlay: North Arrow Top-Right */}
      {project.settings.showNorthArrow && (
        <div className="canvas-overlay-top-right">
          <NorthArrow />
        </div>
      )}

      {/* Overlay: Scale Bar Bottom-Left */}
      {project.settings.showScaleBar && (
        <div className="canvas-overlay-bottom-left">
          <ScaleBar viewport={viewport} />
        </div>
      )}
    </div>
  );
};

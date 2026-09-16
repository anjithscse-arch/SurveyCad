import React from 'react';
import { SurveyPoint, SurveyLine, SurveyArc, SurveyPolygon, ViewportTransform, Point2D } from '../../types/geometry';
import { worldToScreen } from '../../geometry/transform';
import { generateSvgArcPath } from '../../geometry/arc';

interface GeometryRendererProps {
  points: SurveyPoint[];
  lines: SurveyLine[];
  arcs?: SurveyArc[];
  polygons: SurveyPolygon[];
  viewport: ViewportTransform;
  selectedPointIds: string[];
  selectedLineIds: string[];
  selectedPolygonId: string | null;
  drawingLine?: { start: Point2D; current: Point2D } | null;
  onPointMouseDown?: (point: SurveyPoint, e: React.MouseEvent) => void;
  onLineClick?: (line: SurveyLine, e: React.MouseEvent) => void;
  onPolygonClick?: (polygon: SurveyPolygon, e: React.MouseEvent) => void;
}

export const GeometryRenderer: React.FC<GeometryRendererProps> = ({
  points,
  lines,
  arcs,
  polygons,
  viewport,
  selectedPointIds,
  selectedLineIds,
  selectedPolygonId,
  drawingLine,
  onPointMouseDown,
  onLineClick,
  onPolygonClick,
}) => {
  const pointMap = new Map(points.map((p) => [p.id, p]));
  const selectedPointSet = new Set(selectedPointIds);
  const selectedLineSet = new Set(selectedLineIds);

  return (
    <g className="cad-geometry-layer">
      {/* 1. Polygons Fill */}
      {polygons.map((poly) => {
        const polyPoints = poly.pointIds.map((id) => pointMap.get(id)).filter(Boolean) as SurveyPoint[];
        if (polyPoints.length < 3) return null;

        const pathPoints = polyPoints
          .map((pt) => {
            const s = worldToScreen(pt, viewport);
            return `${s.x},${s.y}`;
          })
          .join(' ');

        const isSelected = selectedPolygonId === poly.id;

        return (
          <polygon
            key={`poly-${poly.id}`}
            points={pathPoints}
            fill={isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)'}
            stroke={isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)'}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray={poly.isClosed ? undefined : '5,5'}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onPolygonClick?.(poly, e);
            }}
          />
        );
      })}

      {/* 2. Survey Lines */}
      {lines.map((line) => {
        const p1 = pointMap.get(line.startPointId);
        const p2 = pointMap.get(line.endPointId);
        if (!p1 || !p2) return null;

        const s1 = worldToScreen(p1, viewport);
        const s2 = worldToScreen(p2, viewport);
        const isSelected = selectedLineSet.has(line.id);

        return (
          <g key={`line-group-${line.id}`}>
            {/* Invisible thicker hit-test stroke for easy clicking */}
            <line
              x1={s1.x}
              y1={s1.y}
              x2={s2.x}
              y2={s2.y}
              stroke="transparent"
              strokeWidth="14"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onLineClick?.(line, e);
              }}
            />
            {/* Visible Line Stroke */}
            <line
              x1={s1.x}
              y1={s1.y}
              x2={s2.x}
              y2={s2.y}
              stroke={isSelected ? '#38bdf8' : line.color || '#e2e8f0'}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={line.style === 'dashed' ? '6 3' : undefined}
              pointerEvents="none"
            />
          </g>
        );
      })}

      {/* 2b. Survey Arcs / Curved Boundary Edges */}
      {arcs?.map((arc) => {
        const p1 = pointMap.get(arc.startPointId);
        const p2 = pointMap.get(arc.endPointId);
        if (!p1 || !p2) return null;

        const pathD = generateSvgArcPath(arc, p1, p2, viewport);

        return (
          <g key={`arc-group-${arc.id}`}>
            {/* Thicker hit-test stroke */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth="14"
              style={{ cursor: 'pointer' }}
            />
            {/* Visible Arc Stroke */}
            <path
              d={pathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray={arc.isConvex === false ? '5 3' : undefined}
            />
          </g>
        );
      })}

      {/* 3. Live Rubber-banding Line during creation */}
      {drawingLine && (
        <line
          x1={worldToScreen(drawingLine.start, viewport).x}
          y1={worldToScreen(drawingLine.start, viewport).y}
          x2={worldToScreen(drawingLine.current, viewport).x}
          y2={worldToScreen(drawingLine.current, viewport).y}
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          pointerEvents="none"
        />
      )}

      {/* 4. Survey Points / Stations */}
      {points.map((pt) => {
        const s = worldToScreen(pt, viewport);
        const isSelected = selectedPointSet.has(pt.id);

        return (
          <g
            key={`point-${pt.id}`}
            transform={`translate(${s.x}, ${s.y})`}
            style={{ cursor: 'pointer' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onPointMouseDown?.(pt, e);
            }}
          >
            {/* Selection Halo */}
            {isSelected && (
              <circle r="12" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
            )}

            {/* Station Crosshair Marks */}
            <line x1="-7" y1="0" x2="7" y2="0" stroke={isSelected ? '#38bdf8' : '#f8fafc'} strokeWidth="1" />
            <line x1="0" y1="-7" x2="0" y2="7" stroke={isSelected ? '#38bdf8' : '#f8fafc'} strokeWidth="1" />

            {/* Station Circle */}
            <circle
              r="4.5"
              fill={isSelected ? '#38bdf8' : '#0f172a'}
              stroke={isSelected ? '#ffffff' : '#38bdf8'}
              strokeWidth="1.5"
            />

            {/* Station Label (e.g. A, B, P1) */}
            <text
              x="8"
              y="-8"
              fill={isSelected ? '#38bdf8' : '#f8fafc'}
              fontSize="11px"
              fontWeight="700"
              fontFamily="var(--font-mono)"
              textAnchor="start"
              style={{
                paintOrder: 'stroke',
                stroke: 'rgba(15, 23, 42, 0.9)',
                strokeWidth: '3px',
                strokeLinejoin: 'round',
              }}
            >
              {pt.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

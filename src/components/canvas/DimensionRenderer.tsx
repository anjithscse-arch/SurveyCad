import React from 'react';
import { SurveyPoint, SurveyLine, SurveyArc, SurveyPolygon, ViewportTransform, Point2D } from '../../types/geometry';
import { worldToScreen } from '../../geometry/transform';
import { distance } from '../../geometry/distance';
import { calculateBearing, formatDMS } from '../../geometry/bearing';
import { formatDistance, formatArea } from '../../survey/units';
import { polygonCentroid } from '../../geometry/polygon';
import { LinearUnit, AreaUnit } from '../../types/survey';

interface DimensionRendererProps {
  points: SurveyPoint[];
  lines: SurveyLine[];
  arcs?: SurveyArc[];
  polygons: SurveyPolygon[];
  viewport: ViewportTransform;
  linearUnit?: LinearUnit;
  areaUnit?: AreaUnit;
  precision?: number;
  showBearings?: boolean;
}

export const DimensionRenderer: React.FC<DimensionRendererProps> = ({
  points,
  lines,
  arcs,
  polygons,
  viewport,
  linearUnit = 'm',
  areaUnit = 'sqm',
  precision = 2,
  showBearings = true,
}) => {
  const pointMap = new Map(points.map((p) => [p.id, p]));

  return (
    <g className="cad-dimensions-layer" pointerEvents="none">
      {/* Side Length & Bearing Labels on Lines */}
      {lines.map((line) => {
        const p1 = pointMap.get(line.startPointId);
        const p2 = pointMap.get(line.endPointId);
        if (!p1 || !p2) return null;

        const s1 = worldToScreen(p1, viewport);
        const s2 = worldToScreen(p2, viewport);

        const realDist = distance(p1, p2);
        const bearing = calculateBearing(p1, p2);

        // Midpoint on screen
        const midScreen: Point2D = {
          x: (s1.x + s2.x) / 2,
          y: (s1.y + s2.y) / 2,
        };

        // Normal offset vector to prevent overlapping the line
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 30) return null; // Too short to label comfortably

        const offsetDist = 12;
        const nx = -dy / len;
        const ny = dx / len;

        const labelPos = {
          x: midScreen.x + nx * offsetDist,
          y: midScreen.y + ny * offsetDist,
        };

        let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        // Keep text right-side up
        if (angleDeg > 90 || angleDeg < -90) {
          angleDeg += 180;
        }

        const distText = formatDistance(realDist, linearUnit, precision);
        const bearingText = formatDMS(bearing, false);

        return (
          <g
            key={`dim-${line.id}`}
            transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${angleDeg})`}
          >
            {/* Background pill */}
            <rect
              x="-36"
              y="-9"
              width="72"
              height={showBearings ? "24" : "16"}
              rx="3"
              fill="rgba(15, 23, 42, 0.85)"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="0.5"
            />
            {/* Distance */}
            <text
              x="0"
              y={showBearings ? "-1" : "3"}
              textAnchor="middle"
              fill="#f8fafc"
              fontSize="10px"
              fontWeight="600"
              fontFamily="var(--font-mono)"
            >
              {distText}
            </text>
            {/* Bearing */}
            {showBearings && (
              <text
                x="0"
                y="11"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="8.5px"
                fontFamily="var(--font-mono)"
              >
                {bearingText}
              </text>
            )}
          </g>
        );
      })}

      {/* Curve / Arc Dimensions (Radius R, Arc Length L, Delta) */}
      {arcs?.map((arc) => {
        const p1 = pointMap.get(arc.startPointId);
        const p2 = pointMap.get(arc.endPointId);
        if (!p1 || !p2) return null;

        let midWorld: Point2D;
        if (arc.midPointId && pointMap.has(arc.midPointId)) {
          midWorld = pointMap.get(arc.midPointId)!;
        } else {
          // Midpoint of chord
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          const vx = mx - arc.center.x;
          const vy = my - arc.center.y;
          const vlen = Math.hypot(vx, vy);

          if (vlen > 1e-4) {
            midWorld = {
              x: arc.center.x + (vx / vlen) * arc.radius,
              y: arc.center.y + (vy / vlen) * arc.radius,
            };
          } else {
            // Semicircle fallback: normal to chord
            const cdx = p2.x - p1.x;
            const cdy = p2.y - p1.y;
            const clen = Math.hypot(cdx, cdy) || 1;
            const sign = arc.isConvex !== false ? 1 : -1;
            midWorld = {
              x: arc.center.x + (-cdy / clen) * arc.radius * sign,
              y: arc.center.y + (cdx / clen) * arc.radius * sign,
            };
          }
        }

        const midScreen = worldToScreen(midWorld, viewport);
        const rText = `R=${formatDistance(arc.radius, linearUnit, precision)}`;
        const lText = `L=${formatDistance(arc.arcLength, linearUnit, precision)}`;
        const deltaDeg = ((arc.deltaRad * 180) / Math.PI).toFixed(1);

        return (
          <g key={`dim-arc-${arc.id}`} transform={`translate(${midScreen.x}, ${midScreen.y})`}>
            {/* Background pill */}
            <rect
              x="-48"
              y="-12"
              width="96"
              height="24"
              rx="4"
              fill="rgba(15, 23, 42, 0.9)"
              stroke="#38bdf8"
              strokeWidth="1"
            />
            {/* Arc Curve Dimensions */}
            <text
              x="0"
              y="-2"
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="9px"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              {rText} • {lText}
            </text>
            <text
              x="0"
              y="8"
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="8px"
              fontFamily="var(--font-mono)"
            >
              Δ={deltaDeg}°
            </text>
          </g>
        );
      })}

      {/* Polygon Centroid Area Badge */}
      {polygons.filter((p) => p.isClosed && p.pointIds.length >= 3).map((poly) => {
        const polyPoints = poly.pointIds.map((id) => pointMap.get(id)).filter(Boolean) as SurveyPoint[];
        if (polyPoints.length < 3) return null;

        const centroidWorld = polygonCentroid(polyPoints);
        const centroidScreen = worldToScreen(centroidWorld, viewport);

        return (
          <g key={`poly-badge-${poly.id}`} transform={`translate(${centroidScreen.x}, ${centroidScreen.y})`}>
            <circle r="4" fill="#38bdf8" opacity="0.6" />
            <text
              x="0"
              y="16"
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="11px"
              fontWeight="700"
              fontFamily="var(--font-sans)"
              letterSpacing="0.05em"
            >
              {poly.name || 'BOUNDARY PARCEL'}
            </text>
          </g>
        );
      })}
    </g>
  );
};

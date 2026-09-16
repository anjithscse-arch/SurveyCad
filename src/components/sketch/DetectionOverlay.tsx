import React from 'react';
import { PointCandidate, LineCandidate, MeasurementCandidate, NorthArrowCandidate, Point2D } from '../../sketch/types';

interface DetectionOverlayProps {
  imageWidth: number;
  imageHeight: number;
  points: PointCandidate[];
  lines: LineCandidate[];
  measurements: MeasurementCandidate[];
  northArrow?: NorthArrowCandidate;
  selectedId: string | null;
  onSelect: (id: string, type: 'point' | 'measurement') => void;
  visibleLayers: {
    points: boolean;
    lines: boolean;
    measurements: boolean;
    northArrow: boolean;
  };
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  imageWidth,
  imageHeight,
  points,
  lines,
  measurements,
  northArrow,
  selectedId,
  onSelect,
  visibleLayers,
}) => {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
    >
      {/* 1. Detected Boundary Lines */}
      {visibleLayers.lines &&
        lines.map((line) => (
          <line
            key={`overlay-line-${line.id}`}
            x1={line.start.x}
            y1={line.start.y}
            x2={line.end.x}
            y2={line.end.y}
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="6 3"
            opacity="0.85"
          />
        ))}

      {/* 2. Detected Points / Stations */}
      {visibleLayers.points &&
        points.map((pt) => {
          const isSelected = selectedId === pt.id;
          return (
            <g
              key={`overlay-pt-${pt.id}`}
              transform={`translate(${pt.imagePosition.x}, ${pt.imagePosition.y})`}
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(pt.id, 'point');
              }}
            >
              <circle
                r="10"
                fill={isSelected ? '#38bdf8' : 'rgba(15, 23, 42, 0.8)'}
                stroke={isSelected ? '#ffffff' : '#38bdf8'}
                strokeWidth="2"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11px"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {pt.label}
              </text>
            </g>
          );
        })}

      {/* 3. Detected Measurements */}
      {visibleLayers.measurements &&
        measurements.map((m) => {
          const isSelected = selectedId === m.id;
          const bb = m.boundingBox;
          return (
            <g
              key={`overlay-m-${m.id}`}
              transform={`translate(${bb.x}, ${bb.y})`}
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(m.id, 'measurement');
              }}
            >
              {/* Bounding box highlight */}
              <rect
                x="0"
                y="0"
                width={bb.width}
                height={bb.height}
                rx="3"
                fill={isSelected ? 'rgba(56, 189, 248, 0.35)' : 'rgba(245, 158, 11, 0.25)'}
                stroke={isSelected ? '#38bdf8' : '#f59e0b'}
                strokeWidth={isSelected ? '2' : '1.5'}
              />
              {/* Tag with confidence badge */}
              <g transform="translate(0, -5)">
                <rect
                  x="0"
                  y="-12"
                  width="48"
                  height="12"
                  rx="2"
                  fill="#0f172a"
                  stroke="#f59e0b"
                  strokeWidth="0.5"
                />
                <text x="4" y="-3" fill="#f59e0b" fontSize="8px" fontFamily="monospace" fontWeight="bold">
                  {Math.round(m.confidence * 100)}%
                </text>
              </g>
            </g>
          );
        })}

      {/* 4. North Arrow Candidate */}
      {visibleLayers.northArrow && northArrow?.detected && northArrow.boundingBox && (
        <rect
          x={northArrow.boundingBox.x}
          y={northArrow.boundingBox.y}
          width={northArrow.boundingBox.width}
          height={northArrow.boundingBox.height}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
      )}
    </svg>
  );
};

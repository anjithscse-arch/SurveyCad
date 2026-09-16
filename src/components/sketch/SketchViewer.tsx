import React, { useState, useRef, useEffect } from 'react';
import { DetectionOverlay } from './DetectionOverlay';
import { PointCandidate, LineCandidate, MeasurementCandidate, NorthArrowCandidate, Point2D } from '../../sketch/types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Sliders,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SketchViewerProps {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  points: PointCandidate[];
  lines: LineCandidate[];
  measurements: MeasurementCandidate[];
  northArrow?: NorthArrowCandidate;
  selectedId: string | null;
  onSelect: (id: string, type: 'point' | 'measurement') => void;
  onRotationChange?: (rotation: number) => void;
}

export const SketchViewer: React.FC<SketchViewerProps> = ({
  imageDataUrl,
  imageWidth,
  imageHeight,
  points,
  lines,
  measurements,
  northArrow,
  selectedId,
  onSelect,
  onRotationChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transform (zoom & pan in pixel space)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  // Layer visibility toggles
  const [visibleLayers, setVisibleLayers] = useState({
    points: true,
    lines: true,
    measurements: true,
    northArrow: true,
  });

  // Fit to screen on initial mount
  const handleFit = () => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 40) / imageWidth;
    const scaleY = (clientHeight - 40) / imageHeight;
    const newZoom = Math.min(scaleX, scaleY, 1.5);
    setZoom(newZoom);
    setPan({
      x: (clientWidth - imageWidth * newZoom) / 2,
      y: (clientHeight - imageHeight * newZoom) / 2,
    });
  };

  useEffect(() => {
    handleFit();
  }, [imageWidth, imageHeight]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.max(0.2, Math.min(5, prev * factor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    onRotationChange?.(nextRot);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#070a12',
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoomable & Pannable Viewport */}
      <div
        style={{
          position: 'absolute',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: `${imageWidth / 2}px ${imageHeight / 2}px`,
          width: imageWidth,
          height: imageHeight,
          transition: isPanning ? 'none' : 'transform 0.05s ease-out',
        }}
      >
        {/* Source Sketch Image */}
        <img
          src={imageDataUrl}
          alt="Survey Sketch"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            boxShadow: '0 0 20px rgba(0,0,0,0.6)',
            borderRadius: 4,
          }}
          draggable={false}
        />

        {/* Detection Overlay */}
        <DetectionOverlay
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          points={points}
          lines={lines}
          measurements={measurements}
          northArrow={northArrow}
          selectedId={selectedId}
          onSelect={onSelect}
          visibleLayers={visibleLayers}
        />
      </div>

      {/* Floating Toolbar Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          display: 'flex',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          padding: '4px 8px',
          zIndex: 10,
        }}
      >
        <button
          className="menu-btn"
          style={{ padding: '5px 8px' }}
          onClick={() => setZoom((z) => Math.min(5, z * 1.25))}
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          className="menu-btn"
          style={{ padding: '5px 8px' }}
          onClick={() => setZoom((z) => Math.max(0.2, z * 0.8))}
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          className="menu-btn"
          style={{ padding: '5px 8px' }}
          onClick={handleFit}
          title="Fit to Screen"
        >
          <Maximize2 size={15} />
        </button>
        <button
          className="menu-btn"
          style={{ padding: '5px 8px' }}
          onClick={handleRotate}
          title="Rotate 90° Clockwise"
        >
          <RotateCw size={15} />
        </button>

        <div style={{ width: 1, background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Toggle Layer Visibility */}
        <button
          className={`menu-btn ${visibleLayers.measurements ? 'active' : ''}`}
          style={{ fontSize: 11, padding: '4px 8px' }}
          onClick={() => setVisibleLayers((v) => ({ ...v, measurements: !v.measurements }))}
          title="Toggle Measurement Boxes"
        >
          {visibleLayers.measurements ? 'Dimensions ON' : 'Dimensions OFF'}
        </button>
        <button
          className={`menu-btn ${visibleLayers.points ? 'active' : ''}`}
          style={{ fontSize: 11, padding: '4px 8px' }}
          onClick={() => setVisibleLayers((v) => ({ ...v, points: !v.points }))}
          title="Toggle Points"
        >
          {visibleLayers.points ? 'Points ON' : 'Points OFF'}
        </button>
      </div>
    </div>
  );
};

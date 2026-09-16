import { Point2D, ViewportTransform, BoundingBox } from '../types/geometry';

/**
 * Convert World Coordinate (Easting X, Northing Y in meters)
 * to Screen Pixel Coordinate on SVG canvas.
 * Note: Northing (+Y) points UP in real world, but Screen (+Y) points DOWN.
 */
export function worldToScreen(world: Point2D, vp: ViewportTransform): Point2D {
  return {
    x: world.x * vp.zoom + vp.panX,
    y: -world.y * vp.zoom + vp.panY,
  };
}

/**
 * Convert Screen Pixel Coordinate to World Coordinate (Easting X, Northing Y in meters).
 */
export function screenToWorld(screen: Point2D, vp: ViewportTransform): Point2D {
  return {
    x: (screen.x - vp.panX) / vp.zoom,
    y: (vp.panY - screen.y) / vp.zoom,
  };
}

/**
 * Zoom centered at a specific screen point (e.g. mouse cursor position)
 */
export function zoomAtScreenPoint(
  vp: ViewportTransform,
  screenPoint: Point2D,
  zoomFactor: number,
  minZoom: number = 0.01,
  maxZoom: number = 1000
): ViewportTransform {
  const newZoom = Math.max(minZoom, Math.min(maxZoom, vp.zoom * zoomFactor));
  if (newZoom === vp.zoom) return vp;

  // The world point under cursor must remain at the exact same screen position
  const worldPoint = screenToWorld(screenPoint, vp);

  const newPanX = screenPoint.x - worldPoint.x * newZoom;
  const newPanY = screenPoint.y + worldPoint.y * newZoom;

  return {
    ...vp,
    zoom: newZoom,
    panX: newPanX,
    panY: newPanY,
  };
}

/**
 * Fit a bounding box into the viewport with padding
 */
export function fitToBounds(
  bounds: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 60
): ViewportTransform {
  const usableWidth = Math.max(10, canvasWidth - padding * 2);
  const usableHeight = Math.max(10, canvasHeight - padding * 2);

  const zoomX = usableWidth / Math.max(bounds.width, 1);
  const zoomY = usableHeight / Math.max(bounds.height, 1);
  const zoom = Math.min(zoomX, zoomY, 50); // Cap max initial zoom

  // Center of the bounding box in world space
  const worldCenterX = bounds.minX + bounds.width / 2;
  const worldCenterY = bounds.minY + bounds.height / 2;

  // Center of the screen
  const screenCenterX = canvasWidth / 2;
  const screenCenterY = canvasHeight / 2;

  // Pan to place world center at screen center
  const panX = screenCenterX - worldCenterX * zoom;
  const panY = screenCenterY + worldCenterY * zoom;

  return {
    zoom,
    panX,
    panY,
    width: canvasWidth,
    height: canvasHeight,
  };
}

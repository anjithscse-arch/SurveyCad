import { OCRTextBlock, PointCandidate, LineCandidate, MeasurementCandidate, SketchAnalysisResult } from './types';

/**
 * Generates an authentic canvas-rendered hand-drawn field sketch
 * for the Golden Test Case ($A-B=20m, B-C=30m, C-D=20m, D-A=30m \rightarrow Area = 600 m² = 14.83 cents$).
 */
export function generateGoldenSampleSketchDataUrl(): {
  dataUrl: string;
  width: number;
  height: number;
  groundTruthResult: SketchAnalysisResult;
} {
  const width = 800;
  const height = 600;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background: Aged surveyor notebook paper (cream/graph paper texture)
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, width, height);

  // Subtle light blue graph grid
  ctx.strokeStyle = 'rgba(186, 215, 233, 0.4)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < width; x += 25) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Notebook header
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('FIELD SURVEY NOTEBOOK — PARCEL BOUNDARY SKETCH', 50, 45);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Date: 2026-09-16   Surveyor: Licensed Field Tech   Ref: Golden Test §38', 50, 68);

  // Boundary coordinates in pixel space (rough rectangular sketch)
  // Station A: (180, 450)
  // Station B: (580, 450) -> AB = 20.00 m
  // Station C: (580, 180) -> BC = 30.00 m
  // Station D: (180, 180) -> CD = 20.00 m
  // Closing DA = 30.00 m
  const ptA = { x: 200, y: 440 };
  const ptB = { x: 560, y: 440 };
  const ptC = { x: 560, y: 190 };
  const ptD = { x: 200, y: 190 };

  // Draw rough boundary strokes with hand-drawn wobble
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(ptA.x, ptA.y);
  ctx.lineTo(ptB.x, ptB.y);
  ctx.lineTo(ptC.x, ptC.y);
  ctx.lineTo(ptD.x, ptD.y);
  ctx.closePath();
  ctx.stroke();

  // Draw Station Markers (small circles and crosshairs)
  const stations = [
    { label: 'A', pt: ptA, textPos: { x: ptA.x - 28, y: ptA.y + 22 } },
    { label: 'B', pt: ptB, textPos: { x: ptB.x + 14, y: ptB.y + 22 } },
    { label: 'C', pt: ptC, textPos: { x: ptC.x + 14, y: ptC.y - 10 } },
    { label: 'D', pt: ptD, textPos: { x: ptD.x - 28, y: ptD.y - 10 } },
  ];

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px monospace';

  stations.forEach((stn) => {
    // Circle at station
    ctx.beginPath();
    ctx.arc(stn.pt.x, stn.pt.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Crosshair
    ctx.beginPath();
    ctx.moveTo(stn.pt.x - 8, stn.pt.y);
    ctx.lineTo(stn.pt.x + 8, stn.pt.y);
    ctx.moveTo(stn.pt.x, stn.pt.y - 8);
    ctx.lineTo(stn.pt.x, stn.pt.y + 8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Label
    ctx.fillText(stn.label, stn.textPos.x, stn.textPos.y);
  });

  // Dimension Text Annotations
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#0369a1';

  // AB dimension (bottom)
  ctx.fillText('20.00 m', (ptA.x + ptB.x) / 2 - 30, ptA.y + 28);
  // BC dimension (right)
  ctx.fillText('30.00 m', ptB.x + 22, (ptB.y + ptC.y) / 2 + 5);
  // CD dimension (top)
  ctx.fillText('20.00 m', (ptD.x + ptC.x) / 2 - 30, ptC.y - 16);
  // DA dimension (left)
  ctx.fillText('30.00 m', ptD.x - 80, (ptD.y + ptA.y) / 2 + 5);

  // Bearing annotation
  ctx.font = '13px monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('Bearing AB: 90°00\'00" (East)', 220, 495);

  // North Arrow drawing (top right)
  const arrowX = 710;
  const arrowY = 160;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY + 50);
  ctx.lineTo(arrowX, arrowY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(arrowX - 8, arrowY + 16);
  ctx.lineTo(arrowX + 8, arrowY + 16);
  ctx.closePath();
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  ctx.font = 'bold 18px monospace';
  ctx.fillText('N', arrowX - 6, arrowY - 10);

  // Parcel center note
  ctx.font = '13px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('PARCEL A-B-C-D', 330, 310);
  ctx.fillText('CLOSED BOUNDARY', 320, 330);

  const dataUrl = canvas.toDataURL('image/png');

  // Construct ground truth analysis result
  const groundTruthResult: SketchAnalysisResult = {
    textBlocks: [
      { id: 'tb1', text: 'A', confidence: 0.98, boundingBox: { x: ptA.x - 28, y: ptA.y + 8, width: 20, height: 20 } },
      { id: 'tb2', text: 'B', confidence: 0.98, boundingBox: { x: ptB.x + 14, y: ptB.y + 8, width: 20, height: 20 } },
      { id: 'tb3', text: 'C', confidence: 0.98, boundingBox: { x: ptC.x + 14, y: ptC.y - 24, width: 20, height: 20 } },
      { id: 'tb4', text: 'D', confidence: 0.98, boundingBox: { x: ptD.x - 28, y: ptD.y - 24, width: 20, height: 20 } },
      { id: 'tb5', text: '20.00 m', confidence: 0.96, boundingBox: { x: (ptA.x + ptB.x) / 2 - 30, y: ptA.y + 14, width: 65, height: 18 } },
      { id: 'tb6', text: '30.00 m', confidence: 0.96, boundingBox: { x: ptB.x + 22, y: (ptB.y + ptC.y) / 2 - 10, width: 65, height: 18 } },
      { id: 'tb7', text: '20.00 m', confidence: 0.96, boundingBox: { x: (ptD.x + ptC.x) / 2 - 30, y: ptC.y - 30, width: 65, height: 18 } },
      { id: 'tb8', text: '30.00 m', confidence: 0.96, boundingBox: { x: ptD.x - 80, y: (ptD.y + ptA.y) / 2 - 10, width: 65, height: 18 } },
      { id: 'tb9', text: 'Bearing AB: 90°00\'00"', confidence: 0.92, boundingBox: { x: 220, y: 480, width: 170, height: 18 } },
      { id: 'tb10', text: 'N', confidence: 0.95, boundingBox: { x: arrowX - 10, y: arrowY - 25, width: 20, height: 20 } },
    ],
    points: [
      { id: 'pc_A', label: 'A', imagePosition: ptA, confidence: 0.98, status: 'accepted' },
      { id: 'pc_B', label: 'B', imagePosition: ptB, confidence: 0.98, status: 'accepted' },
      { id: 'pc_C', label: 'C', imagePosition: ptC, confidence: 0.98, status: 'accepted' },
      { id: 'pc_D', label: 'D', imagePosition: ptD, confidence: 0.98, status: 'accepted' },
    ],
    lines: [
      { id: 'lc_1', startPointLabel: 'A', endPointLabel: 'B', start: ptA, end: ptB, confidence: 0.95 },
      { id: 'lc_2', startPointLabel: 'B', endPointLabel: 'C', start: ptB, end: ptC, confidence: 0.95 },
      { id: 'lc_3', startPointLabel: 'C', endPointLabel: 'D', start: ptC, end: ptD, confidence: 0.95 },
      { id: 'lc_4', startPointLabel: 'D', endPointLabel: 'A', start: ptD, end: ptA, confidence: 0.95 },
    ],
    measurements: [
      {
        id: 'm_1',
        rawText: '20.00 m',
        type: 'distance',
        value: 20.0,
        unit: 'm',
        suggestedFrom: 'A',
        suggestedTo: 'B',
        confidence: 0.96,
        boundingBox: { x: (ptA.x + ptB.x) / 2 - 30, y: ptA.y + 14, width: 65, height: 18 },
        status: 'accepted',
      },
      {
        id: 'm_2',
        rawText: '30.00 m',
        type: 'distance',
        value: 30.0,
        unit: 'm',
        suggestedFrom: 'B',
        suggestedTo: 'C',
        confidence: 0.96,
        boundingBox: { x: ptB.x + 22, y: (ptB.y + ptC.y) / 2 - 10, width: 65, height: 18 },
        status: 'accepted',
      },
      {
        id: 'm_3',
        rawText: '20.00 m',
        type: 'distance',
        value: 20.0,
        unit: 'm',
        suggestedFrom: 'C',
        suggestedTo: 'D',
        confidence: 0.96,
        boundingBox: { x: (ptD.x + ptC.x) / 2 - 30, y: ptC.y - 30, width: 65, height: 18 },
        status: 'accepted',
      },
      {
        id: 'm_4',
        rawText: '30.00 m',
        type: 'distance',
        value: 30.0,
        unit: 'm',
        suggestedFrom: 'D',
        suggestedTo: 'A',
        confidence: 0.96,
        boundingBox: { x: ptD.x - 80, y: (ptD.y + ptA.y) / 2 - 10, width: 65, height: 18 },
        status: 'accepted',
      },
      {
        id: 'm_5',
        rawText: 'Bearing AB: 90°00\'00"',
        type: 'bearing',
        value: 90.0,
        suggestedFrom: 'A',
        suggestedTo: 'B',
        confidence: 0.92,
        boundingBox: { x: 220, y: 480, width: 170, height: 18 },
        status: 'accepted',
      },
    ],
    northArrow: {
      detected: true,
      angleDeg: 0,
      confidence: 0.95,
      boundingBox: { x: arrowX - 10, y: arrowY - 25, width: 20, height: 75 },
    },
    warnings: [],
  };

  return { dataUrl, width, height, groundTruthResult };
}

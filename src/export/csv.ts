import { SurveyPoint, SurveyLine } from '../types/geometry';
import { calculateBearing } from '../geometry/bearing';
import { distance } from '../geometry/distance';

export function exportPointsToCSV(points: SurveyPoint[]): string {
  const headers = ['Point', 'Easting_X', 'Northing_Y', 'Elevation', 'Description'];
  const rows = points.map((p) => [
    `"${p.label.replace(/"/g, '""')}"`,
    p.x.toFixed(4),
    p.y.toFixed(4),
    p.elevation !== undefined && p.elevation !== null ? p.elevation.toFixed(4) : '',
    `"${(p.description || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function exportLinesToCSV(lines: SurveyLine[], points: SurveyPoint[]): string {
  const pointMap = new Map<string, SurveyPoint>();
  points.forEach((p) => pointMap.set(p.id, p));

  const headers = ['Line', 'From', 'To', 'Distance_m', 'Bearing_deg', 'DeltaE', 'DeltaN'];
  const rows = lines.map((l, idx) => {
    const p1 = pointMap.get(l.startPointId);
    const p2 = pointMap.get(l.endPointId);
    if (!p1 || !p2) return null;

    const dist = distance(p1, p2);
    const bearing = calculateBearing(p1, p2);
    const dE = p2.x - p1.x;
    const dN = p2.y - p1.y;

    return [
      `"L${idx + 1}"`,
      `"${p1.label}"`,
      `"${p2.label}"`,
      dist.toFixed(4),
      bearing.toFixed(4),
      dE.toFixed(4),
      dN.toFixed(4),
    ].join(',');
  }).filter(Boolean);

  return [headers.join(','), ...rows].join('\r\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ParsedCSVPoint {
  label: string;
  x: number;
  y: number;
  elevation?: number;
  description?: string;
}

export function parseCSVPoints(csvText: string): { points: ParsedCSVPoint[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { points: [], errors: ['CSV must have a header row and at least one data row'] };
  }

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  let labelIdx = header.findIndex((h) => h.includes('point') || h.includes('label') || h.includes('name') || h.includes('id') || h === 'pt');
  let eastIdx = header.findIndex((h) => h.includes('east') || h === 'x' || h === 'e');
  let northIdx = header.findIndex((h) => h.includes('north') || h === 'y' || h === 'n');
  let elevIdx = header.findIndex((h) => h.includes('elev') || h === 'z' || h === 'el');
  let descIdx = header.findIndex((h) => h.includes('desc') || h.includes('code') || h.includes('remark'));

  // Default fallback if standard columns: Col 0 = Label, Col 1 = X/East, Col 2 = Y/North
  if (eastIdx === -1 && lines[0].split(',').length >= 2) eastIdx = 1;
  if (northIdx === -1 && lines[0].split(',').length >= 3) northIdx = 2;
  if (labelIdx === -1) labelIdx = 0;

  const points: ParsedCSVPoint[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) continue;

    const xVal = parseFloat(cols[eastIdx]);
    const yVal = parseFloat(cols[northIdx]);

    if (isNaN(xVal) || isNaN(yVal)) {
      errors.push(`Row ${i + 1}: Invalid coordinate values for Easting (${cols[eastIdx]}) or Northing (${cols[northIdx]})`);
      continue;
    }

    const label = (labelIdx >= 0 && cols[labelIdx]) ? cols[labelIdx] : `P${points.length + 1}`;
    const elev = elevIdx >= 0 && cols[elevIdx] ? parseFloat(cols[elevIdx]) : undefined;
    const desc = descIdx >= 0 ? cols[descIdx] : undefined;

    points.push({
      label,
      x: xVal,
      y: yVal,
      elevation: isNaN(elev as number) ? undefined : elev,
      description: desc,
    });
  }

  return { points, errors };
}

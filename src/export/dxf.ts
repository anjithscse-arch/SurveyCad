import { SurveyCADProject } from '../types/project';
import { distance } from '../geometry/distance';
import { calculateBearing } from '../geometry/bearing';

/**
 * Generate an AutoCAD Release 2000 compliant ASCII DXF file.
 * Compatible with AutoCAD, Civil 3D, LibreCAD, QCAD, and surveying total stations.
 */
export function generateDXF(project: SurveyCADProject): string {
  const lines: string[] = [];

  const add = (code: number | string, val: string | number) => {
    lines.push(code.toString());
    lines.push(val.toString());
  };

  // 1. HEADER SECTION
  add(0, 'SECTION');
  add(2, 'HEADER');
  add(9, '$ACADVER');
  add(1, 'AC1015'); // AutoCAD 2000
  add(9, '$INSUNITS');
  add(70, project.settings.linearUnit === 'ft' || project.settings.linearUnit === 'usft' ? 2 : 6); // 6 = Meters, 2 = Feet
  add(0, 'ENDSEC');

  // 2. TABLES SECTION (Layers & Line types)
  add(0, 'SECTION');
  add(2, 'TABLES');

  // Layer table
  add(0, 'TABLE');
  add(2, 'LAYER');
  add(70, 5); // Total layers

  const createLayer = (name: string, color: number) => {
    add(0, 'LAYER');
    add(2, name);
    add(70, 0);
    add(62, color); // AutoCAD color index (1: Red, 2: Yellow, 3: Green, 4: Cyan, 5: Blue, 7: White)
    add(6, 'CONTINUOUS');
  };

  createLayer('SURVEY_BOUNDARY', 3); // Green
  createLayer('SURVEY_POINTS', 4);   // Cyan
  createLayer('SURVEY_LABELS', 7);   // White
  createLayer('SURVEY_DIMENSIONS', 2); // Yellow
  createLayer('SURVEY_ARCS', 1);     // Red

  add(0, 'ENDTAB');
  add(0, 'ENDSEC');

  // 3. BLOCKS SECTION (Empty)
  add(0, 'SECTION');
  add(2, 'BLOCKS');
  add(0, 'ENDSEC');

  // 4. ENTITIES SECTION
  add(0, 'SECTION');
  add(2, 'ENTITIES');

  const pointMap = new Map(project.points.map((p) => [p.id, p]));

  // Export Survey Points
  for (const pt of project.points) {
    add(0, 'POINT');
    add(8, 'SURVEY_POINTS');
    add(10, pt.x.toFixed(4));
    add(20, pt.y.toFixed(4));
    add(30, (pt.z ?? 0).toFixed(4));

    // Station text label
    add(0, 'TEXT');
    add(8, 'SURVEY_LABELS');
    add(10, (pt.x + 0.6).toFixed(4));
    add(20, (pt.y + 0.6).toFixed(4));
    add(30, (pt.z ?? 0).toFixed(4));
    add(40, '0.5'); // Text height in meters
    add(1, pt.label);
  }

  // Export Straight Survey Lines
  for (const line of project.lines) {
    const p1 = pointMap.get(line.startPointId);
    const p2 = pointMap.get(line.endPointId);
    if (!p1 || !p2) continue;

    add(0, 'LINE');
    add(8, 'SURVEY_BOUNDARY');
    add(10, p1.x.toFixed(4));
    add(20, p1.y.toFixed(4));
    add(30, (p1.z ?? 0).toFixed(4));
    add(11, p2.x.toFixed(4));
    add(21, p2.y.toFixed(4));
    add(31, (p2.z ?? 0).toFixed(4));

    // Dimension label at line midpoint
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const dist = distance(p1, p2);
    const brg = calculateBearing(p1, p2);

    add(0, 'TEXT');
    add(8, 'SURVEY_DIMENSIONS');
    add(10, midX.toFixed(4));
    add(20, (midY + 0.4).toFixed(4));
    add(30, '0.0');
    add(40, '0.4'); // Text height
    add(1, `${dist.toFixed(2)}m (${brg.toFixed(1)}°)`);
  }

  // Export Curved Arcs
  if (project.arcs) {
    for (const arc of project.arcs) {
      const p1 = pointMap.get(arc.startPointId);
      const p2 = pointMap.get(arc.endPointId);
      if (!p1 || !p2) continue;

      // Center point calculation if centerPoint available or derived
      const cx = arc.centerPoint?.x ?? (p1.x + p2.x) / 2;
      const cy = arc.centerPoint?.y ?? (p1.y + p2.y) / 2;

      // Angles from center to start and end
      const startAngle = (Math.atan2(p1.y - cy, p1.x - cx) * 180) / Math.PI;
      const endAngle = (Math.atan2(p2.y - cy, p2.x - cx) * 180) / Math.PI;

      add(0, 'ARC');
      add(8, 'SURVEY_ARCS');
      add(10, cx.toFixed(4));
      add(20, cy.toFixed(4));
      add(30, '0.0');
      add(40, arc.radius.toFixed(4));
      add(50, ((startAngle + 360) % 360).toFixed(2));
      add(51, ((endAngle + 360) % 360).toFixed(2));
    }
  }

  // Export Closed Boundary Polylines (LWPOLYLINE)
  for (const poly of project.polygons) {
    const pts = poly.pointIds.map((id) => pointMap.get(id)).filter(Boolean);
    if (pts.length < 3) continue;

    add(0, 'LWPOLYLINE');
    add(8, 'SURVEY_BOUNDARY');
    add(90, pts.length); // Number of vertices
    add(70, poly.isClosed ? 1 : 0); // 1 = Closed loop

    for (const pt of pts) {
      if (!pt) continue;
      add(10, pt.x.toFixed(4));
      add(20, pt.y.toFixed(4));
    }
  }

  add(0, 'ENDSEC');
  add(0, 'EOF');

  return lines.join('\n');
}

/**
 * Trigger browser download of DXF file
 */
export function downloadDXF(project: SurveyCADProject, filename?: string): void {
  const dxfContent = generateDXF(project);
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${project.metadata.name.replace(/\s+/g, '_')}_survey.dxf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

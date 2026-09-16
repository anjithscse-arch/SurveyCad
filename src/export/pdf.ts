import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SurveyCADProject } from '../types/project';
import { AreaCalculationResult } from '../types/survey';
import { calculateBearing, formatDMS } from '../geometry/bearing';
import { distance } from '../geometry/distance';
import { formatNumber } from '../survey/units';

export interface PDFExportOptions {
  includeDrawing?: boolean;
  drawingDataUrl?: string;
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export function generateSurveyReportPDF(
  project: SurveyCADProject,
  areaResult: AreaCalculationResult | null,
  options: PDFExportOptions = {}
): void {
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: options.pageSize || 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // Title & Header Banner
  doc.setFillColor(15, 23, 42); // #0f172a slate
  doc.rect(14, currentY, pageWidth - 28, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SURVEYCAD — OFFICIAL SURVEY REPORT', 20, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text(`Digital Land Survey Drawing & Area Calculation Platform | Format v1.0`, 20, currentY + 16);

  currentY += 28;

  // Project Metadata Block (2 columns)
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PROJECT INFORMATION', 20, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const col1X = 20;
  const col2X = pageWidth / 2 + 10;

  doc.text(`Project Name: ${project.metadata.name || 'Untitled Project'}`, col1X, currentY + 14);
  doc.text(`Property: ${project.metadata.propertyName || '—'}`, col1X, currentY + 20);
  doc.text(`Location: ${project.metadata.location || '—'}`, col1X, currentY + 25);

  doc.text(`Surveyor: ${project.metadata.surveyor || '—'}`, col2X, currentY + 14);
  doc.text(`Client: ${project.metadata.client || '—'}`, col2X, currentY + 20);
  doc.text(`Date: ${project.metadata.date || new Date().toISOString().split('T')[0]}`, col2X, currentY + 25);

  currentY += 34;

  // Property Area & Boundary Summary Card
  doc.setDrawColor(59, 130, 246);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, currentY, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PROPERTY SUMMARY & AREA MEASUREMENTS', 20, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  if (areaResult && areaResult.isValid) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Enclosed Area:`, 20, currentY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${formatNumber(areaResult.sqMeters, 2)} m²   |   ${formatNumber(areaResult.cents, 2)} cents   |   ${formatNumber(areaResult.acres, 4)} acres`,
      52,
      currentY + 14
    );

    doc.text(
      `${formatNumber(areaResult.sqFeet, 2)} sq ft   |   ${formatNumber(areaResult.hectares, 4)} ha   |   ${formatNumber(areaResult.sqYards, 2)} sq yd`,
      52,
      currentY + 20
    );

    doc.setFont('helvetica', 'bold');
    doc.text(`Total Perimeter:`, 20, currentY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${formatNumber(areaResult.perimeterMeters, 2)} m   (${formatNumber(areaResult.perimeterFeet, 2)} ft)   |   Vertices: ${areaResult.vertexCount}`,
      52,
      currentY + 25
    );
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(
      areaResult?.validationError || 'No closed boundary polygon detected for area calculation.',
      20,
      currentY + 16
    );
  }

  currentY += 34;

  // Embed Survey Drawing if available
  if (options.includeDrawing && options.drawingDataUrl) {
    try {
      const imgWidth = pageWidth - 28;
      const imgHeight = 70;
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, currentY, imgWidth, imgHeight, 'S');
      doc.addImage(options.drawingDataUrl, 'PNG', 15, currentY + 1, imgWidth - 2, imgHeight - 2);
      currentY += imgHeight + 8;
    } catch (_) {
      // fallback if image insertion fails
    }
  }

  // Coordinate Table (Point Table)
  const pointRows = project.points.map((p) => [
    p.label,
    p.x.toFixed(3),
    p.y.toFixed(3),
    p.elevation !== undefined && p.elevation !== null ? p.elevation.toFixed(3) : '—',
    p.description || '—',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Station', 'Easting (X)', 'Northing (Y)', 'Elevation (Z)', 'Description']],
    body: pointRows.length > 0 ? pointRows : [['—', '—', '—', '—', 'No points defined']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Survey Lines Table
  const pointMap = new Map(project.points.map((p) => [p.id, p]));
  const lineRows = project.lines.map((l, idx) => {
    const p1 = pointMap.get(l.startPointId);
    const p2 = pointMap.get(l.endPointId);
    if (!p1 || !p2) return [`L${idx + 1}`, '—', '—', '—', '—', '—', '—'];

    const dist = distance(p1, p2);
    const bearing = calculateBearing(p1, p2);
    const dE = p2.x - p1.x;
    const dN = p2.y - p1.y;

    return [
      `L${idx + 1}`,
      p1.label,
      p2.label,
      `${dist.toFixed(3)} m`,
      formatDMS(bearing),
      dE >= 0 ? `+${dE.toFixed(3)}` : dE.toFixed(3),
      dN >= 0 ? `+${dN.toFixed(3)}` : dN.toFixed(3),
    ];
  });

  if (lineRows.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 15;
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Line', 'From', 'To', 'Distance', 'Bearing (WCB)', 'ΔEasting', 'ΔNorthing']],
      body: lineRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section 123: Professional Disclaimer Box
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(248, 113, 113);
  doc.roundedRect(14, currentY, pageWidth - 28, 18, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text('PROFESSIONAL SURVEYING DISCLAIMER (SDD SECTION 123)', 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(185, 28, 28);
  const disclaimer =
    'This software performs computational and graphical processing of user-provided survey data. ' +
    'Generated measurements should be independently verified by a qualified survey professional before being used for ' +
    'legal, cadastral, construction, or property-boundary purposes.';
  doc.text(disclaimer, 18, currentY + 10, { maxWidth: pageWidth - 36 });

  // Save the PDF
  const safeName = project.metadata.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'survey_report';
  doc.save(`${safeName}_report.pdf`);
}

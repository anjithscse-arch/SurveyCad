import { describe, it, expect } from 'vitest';
import { solveChainSurvey, diagonalsNeeded } from '../geometry/chainSurvey';
import { polygonArea } from '../geometry/polygon';
import { distance } from '../geometry/distance';
import { convertArea, AREA_TO_SQMETERS } from '../survey/units';

describe('accuracy stress tests (money-sensitive: unit conversion, scale, tape error)', () => {
  it('acre <-> cent round-trip is exact (1 acre = 100 cents by definition)', () => {
    const oneAcreInCents = convertArea(1, 'acre', 'cent');
    expect(oneAcreInCents).toBeCloseTo(100, 9);
  });

  it('sqm -> cent -> sqm round-trip introduces no drift', () => {
    const original = 12345.6789; // m²
    const asCents = convertArea(original, 'sqm', 'cent');
    const back = convertArea(asCents, 'cent', 'sqm');
    expect(back).toBeCloseTo(original, 9);
  });

  it('a real-world sized irregular hexagonal plot (n=6, 3 diagonals) reconstructs to exact area', () => {
    // ~2500 m² irregular plot, realistic dimensions for a residential/agricultural parcel
    const truth = [
      { x: 0, y: 0 },
      { x: 40, y: -5 },
      { x: 62, y: 20 },
      { x: 55, y: 48 },
      { x: 20, y: 55 },
      { x: -8, y: 25 },
    ];
    const n = truth.length;
    const sides: number[] = [];
    for (let i = 0; i < n; i++) sides.push(distance(truth[i], truth[(i + 1) % n]));
    expect(diagonalsNeeded(n)).toBe(3);
    const diagonals = [
      distance(truth[0], truth[2]),
      distance(truth[0], truth[3]),
      distance(truth[0], truth[4]),
    ];

    const { points } = solveChainSurvey(sides, diagonals);
    const trueArea = polygonArea(truth);
    const solvedArea = polygonArea(points);

    expect(trueArea).toBeGreaterThan(1000); // sanity: this is a realistic-scale plot
    expect(solvedArea).toBeCloseTo(trueArea, 6);

    // Cross-check in cents too, since that's what actually appears on the legal document
    const trueCents = convertArea(trueArea, 'sqm', 'cent');
    const solvedCents = convertArea(solvedArea, 'sqm', 'cent');
    expect(solvedCents).toBeCloseTo(trueCents, 4);
  });

  it('quantifies how much a realistic tape-reading error (±1cm on a ~30m side) moves the final area', () => {
    // A tape measurement to the nearest cm is standard field practice.
    // This test doesn't assert a pass/fail -- it documents the actual sensitivity
    // so the error budget is known, not assumed.
    const base = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 32, y: 25 },
      { x: -2, y: 27 },
    ];
    const n = base.length;
    const sides = base.map((p, i) => distance(p, base[(i + 1) % n]));
    const diagonal = distance(base[0], base[2]);

    const { points: exact } = solveChainSurvey(sides, [diagonal]);
    const exactArea = polygonArea(exact);

    // Perturb every side length by +1cm (worst-case compounding, not random cancellation)
    const perturbedSides = sides.map((s) => s + 0.01);
    const perturbedDiagonal = diagonal + 0.01;
    const { points: perturbed } = solveChainSurvey(perturbedSides, [perturbedDiagonal]);
    const perturbedArea = polygonArea(perturbed);

    const percentError = Math.abs(perturbedArea - exactArea) / exactArea * 100;

    // Document: for a ~30m-sided plot, 1cm-per-side tape error should move area
    // by well under 1% (this is what "accurate enough for legal/financial use" means
    // in practice -- if this ever exceeds ~1%, the solver's error sensitivity has
    // gotten worse and the claim "as accurate as AutoCAD" needs re-examining).
    expect(percentError).toBeLessThan(1);
  });

  it('handles a "thin" fan triangle (near-collinear diagonal) without numerical blowup', () => {
    // Point 3 is almost exactly on the line from P1 through P2 -- a near-degenerate
    // triangle for the P1-P2-P3 fan step. Real field data can look like this for
    // long, narrow plots. The solver should still return a finite, sane result.
    const sides = [50, 20, 51, 40]; // side 2 (P2->P3) is short, diagonal P1->P3 is long and nearly aligned with side 1
    const diagonal = 69.8; // close to 50 + 20*cos(small angle), i.e. nearly collinear
    const { points } = solveChainSurvey(sides, [diagonal]);
    for (const p of points) {
      expect(isFinite(p.x)).toBe(true);
      expect(isFinite(p.y)).toBe(true);
    }
    const area = polygonArea(points);
    expect(isFinite(area)).toBe(true);
    expect(area).toBeGreaterThan(0);
  });

  it('all AREA_TO_SQMETERS constants match their official legal definitions exactly', () => {
    expect(AREA_TO_SQMETERS.acre).toBeCloseTo(4046.8564224, 9);
    expect(AREA_TO_SQMETERS.cent).toBeCloseTo(40.468564224, 9); // 1/100 acre
    expect(AREA_TO_SQMETERS.guntha).toBeCloseTo(101.17141056, 9); // 1/40 acre
    expect(AREA_TO_SQMETERS.hectare).toBe(10000);
    // Internal consistency: 100 cents and 40 gunthas must both equal exactly 1 acre
    expect(AREA_TO_SQMETERS.cent * 100).toBeCloseTo(AREA_TO_SQMETERS.acre, 6);
    expect(AREA_TO_SQMETERS.guntha * 40).toBeCloseTo(AREA_TO_SQMETERS.acre, 6);
  });

  it('are is exactly 100 sqm, and 1 hectare is exactly 100 ares', () => {
    expect(AREA_TO_SQMETERS.are).toBe(100);
    expect(convertArea(1, 'hectare', 'are')).toBeCloseTo(100, 9);
    expect(convertArea(2500, 'sqm', 'are')).toBeCloseTo(25, 9);
  });
});

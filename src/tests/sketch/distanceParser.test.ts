import { describe, it, expect } from 'vitest';
import { parseDistanceString } from '../../sketch/parsing/distanceParser';
import { parseBearingString } from '../../sketch/parsing/bearingParser';
import { classifyAnnotation } from '../../sketch/parsing/annotationClassifier';

describe('Sketch Parsing & Classification Tests', () => {
  it('parses metric and imperial distance strings', () => {
    expect(parseDistanceString('30m')?.valueInMeters).toBe(30);
    expect(parseDistanceString('30.25 m')?.valueInMeters).toBe(30.25);
    expect(parseDistanceString('100 ft')?.valueInMeters).toBeCloseTo(30.48, 2);
    expect(parseDistanceString('30 metres')?.valueInMeters).toBe(30);
    expect(parseDistanceString('25\' 6"')?.valueInMeters).toBeCloseTo(7.7724, 3);
  });

  it('parses bearings from sketch annotations', () => {
    expect(parseBearingString('90')?.degrees).toBe(90);
    expect(parseBearingString('N 45° 15\' E')?.degrees).toBeCloseTo(45.25, 2);
    expect(parseBearingString('S 45 W')?.degrees).toBe(225);
    expect(parseBearingString('0°')?.degrees).toBe(0);
  });

  it('classifies annotations into survey categories', () => {
    expect(classifyAnnotation('30.25 m').type).toBe('distance');
    expect(classifyAnnotation('N 30° E').type).toBe('bearing');
    expect(classifyAnnotation('A').type).toBe('pointLabel');
    expect(classifyAnnotation('P1').type).toBe('pointLabel');
    expect(classifyAnnotation('North ↑').type).toBe('northArrow');
    expect(classifyAnnotation('N').type).toBe('northArrow');
    expect(classifyAnnotation('B').type).toBe('pointLabel');
  });
});

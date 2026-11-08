import { describe, it, expect } from 'vitest';
import { intersectHalfspaces, morphPlanes } from './halfspace';
import { SEQUENCE } from './solids';

const euler = (p) => p.vertices.length - p.edges.length + p.faces.length;

describe('morph solids', () => {
  it('builds each solid with the right face count and a valid topology', () => {
    const expected = { pyramid: 5, cube: 6, octahedron: 8, dodecahedron: 12, icosahedron: 20, triacontahedron: 30 };
    for (const s of SEQUENCE) {
      const p = intersectHalfspaces(s.planes);
      expect(p.faces.length).toBe(expected[s.name]);
      expect(euler(p)).toBe(2);
    }
  });

  it('every in-between shape is a closed convex polyhedron with at least as many faces as either end', () => {
    for (let i = 0; i < SEQUENCE.length - 1; i++) {
      const A = SEQUENCE[i], B = SEQUENCE[i + 1];
      for (let k = 1; k < 168; k++) {
        const p = intersectHalfspaces(morphPlanes(A, B, k / 168));
        expect(euler(p)).toBe(2);
        expect(p.faces.length).toBeGreaterThanOrEqual(A.planes.length);
      }
    }
  });

  it('passes through the Archimedean midpoints for dual pairs', () => {
    const [, cube, octa, dodeca, icosa] = SEQUENCE;
    expect(intersectHalfspaces(morphPlanes(cube, octa, 0.5)).faces.length).toBe(14); // cuboctahedron
    expect(intersectHalfspaces(morphPlanes(dodeca, icosa, 0.5)).faces.length).toBe(32); // icosidodecahedron
  });

  it('the loop back (last solid → pyramid) is clean at every frame', () => {
    const A = SEQUENCE[SEQUENCE.length - 1], B = SEQUENCE[0];
    for (let k = 1; k < 168; k++) {
      const p = intersectHalfspaces(morphPlanes(A, B, k / 168));
      expect(euler(p)).toBe(2);
    }
  });

  it('icosahedron → triacontahedron peaks at 50 faces and fits the GPU buffers', () => {
    const ico = SEQUENCE.find((s) => s.name === 'icosahedron');
    const tri = SEQUENCE.find((s) => s.name === 'triacontahedron');
    let maxFaces = 0, maxTris = 0, maxEdges = 0, maxVerts = 0;
    for (let k = 0; k <= 168; k++) {
      const p = intersectHalfspaces(morphPlanes(ico, tri, k / 168));
      maxFaces = Math.max(maxFaces, p.faces.length);
      maxTris = Math.max(maxTris, p.faces.reduce((n, f) => n + f.indices.length - 2, 0));
      maxEdges = Math.max(maxEdges, p.edges.length);
      maxVerts = Math.max(maxVerts, p.vertices.length);
    }
    expect(maxFaces).toBe(50);
    expect(maxTris).toBeLessThanOrEqual(512); // MAX_TRIANGLES
    expect(maxEdges).toBeLessThanOrEqual(192); // MAX_EDGES
    expect(maxVerts).toBeLessThanOrEqual(128); // MAX_JOINTS
  });

  it('starts and ends exactly on the source and target solids', () => {
    const [, cube, octa] = SEQUENCE;
    expect(intersectHalfspaces(morphPlanes(cube, octa, 0)).faces.length).toBe(6);
    expect(intersectHalfspaces(morphPlanes(cube, octa, 1)).faces.length).toBe(8);
  });
});

import { meanProjectedArea } from './solids';

describe('solid sizing', () => {
  it('pyramid reads about as large as the average Platonic solid', () => {
    const [pyramid, ...rest] = SEQUENCE;
    const avg = rest.reduce((s, x) => s + meanProjectedArea(x), 0) / rest.length;
    expect(meanProjectedArea(pyramid) / avg).toBeCloseTo(1, 2);
  });
});

import { createPyramidGrow } from './pyramidGrow';

describe('intro: base spreads, then the pyramid rises out of it', () => {
  const finished = intersectHalfspaces(SEQUENCE[0].planes);
  const grow = createPyramidGrow(finished);
  const height = (p) => Math.max(...p.vertices.map((v) => v[1])) - Math.min(...p.vertices.map((v) => v[1]));
  const width = (p) => Math.max(...p.vertices.map((v) => v[0])) - Math.min(...p.vertices.map((v) => v[0]));

  it('starts as (almost) nothing', () => {
    const p = grow.at(0, 0);
    expect(width(p)).toBeLessThan(0.02);
    expect(height(p)).toBeLessThan(0.02);
  });

  it('after the base stage it is a flat full-size square', () => {
    const p = grow.at(1, 0);
    expect(width(p)).toBeCloseTo(width(finished), 6);
    expect(height(p)).toBeLessThan(0.01);
  });

  it('ends exactly on the finished pyramid', () => {
    const p = grow.at(1, 1);
    p.vertices.forEach((v, i) => v.forEach((x, c) => expect(x).toBeCloseTo(finished.vertices[i][c], 9)));
  });

  it('height grows monotonically during the rise, with no overshoot', () => {
    const h = Array.from({ length: 21 }, (_, i) => height(grow.at(1, i / 20)));
    for (let i = 1; i < h.length; i++) expect(h[i]).toBeGreaterThanOrEqual(h[i - 1] - 1e-9);
    expect(Math.max(...h)).toBeLessThanOrEqual(height(finished) + 1e-9);
  });
});

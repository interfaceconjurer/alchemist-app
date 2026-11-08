import { intersectHalfspaces, planesFromVertices } from './halfspace';

const PHI = (1 + Math.sqrt(5)) / 2;

/** Uniform circumradius so every solid reads at the same size through the morph. */
export const SOLID_RADIUS = 2.3;

const normalizeTo = (vertices, r) => {
  const max = Math.max(...vertices.map((v) => Math.hypot(...v)));
  return vertices.map((v) => v.map((x) => (x * r) / max));
};

// Square pyramid, Great Pyramid proportions; centroid lifted so origin is inside.
const PYRAMID = (() => {
  const b = 1.8, h = 2.3, y0 = -h / 3;
  return [[0, y0 + h, 0], [-b, y0, -b], [b, y0, -b], [b, y0, b], [-b, y0, b]];
})();

const CUBE = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];

// Dual-aligned with the cube: vertices sit on the cube's face normals,
// so cube → octahedron passes through a true cuboctahedron.
const OCTAHEDRON = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, -1, 0]];

const ICOSAHEDRON = [
  [0, 1, PHI], [0, 1, -PHI], [0, -1, PHI], [0, -1, -PHI],
  [PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, 1], [-PHI, 0, -1],
  [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0],
];

// Dodecahedron built as the icosahedron's dual (vertices on its face normals),
// so dodecahedron → icosahedron passes through an icosidodecahedron.
const DODECAHEDRON = planesFromVertices(ICOSAHEDRON).map((p) => p.n);

function solid(name, raw) {
  const vertices = normalizeTo(raw, SOLID_RADIUS);
  return { name, vertices, planes: planesFromVertices(vertices) };
}

/**
 * Mean on-screen (projected) area of a convex solid, averaged over all view
 * directions. By Cauchy's formula this is surface area / 4 — a good proxy for
 * "how big it looks" while spinning.
 */
export function meanProjectedArea({ planes }) {
  const { vertices, faces } = intersectHalfspaces(planes);
  let area = 0;
  for (const { indices } of faces) {
    const a = vertices[indices[0]];
    for (let k = 1; k < indices.length - 1; k++) {
      const b = vertices[indices[k]], c = vertices[indices[k + 1]];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      area += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
    }
  }
  return area / 4;
}

function scaled(s, factor) {
  const vertices = s.vertices.map((v) => v.map((x) => x * factor));
  return { ...s, vertices, planes: planesFromVertices(vertices) };
}

// Rhombic triacontahedron (30 rhombic faces): the icosahedron's 12 corners plus
// the dodecahedron's 20 corners, at the radius ratio that makes each set of 4
// coplanar. Its faces sit over the icosahedron's 30 edges, so the
// icosahedron → triacontahedron morph carves it cleanly.
const TRIACONTAHEDRON = (() => {
  const icoR = Math.hypot(...ICOSAHEDRON[0]);
  const ico = ICOSAHEDRON.map((v) => v.map((x) => x / icoR));
  // Dodeca directions are unit; scale so face rhombi are planar:
  // r_dodeca / r_ico = sqrt(3) / (phi * sqrt(phi^2 + 1) / phi^2)… derived numerically below.
  const dodecaDirs = DODECAHEDRON;
  // Solve for the ratio: pick one ico edge (a,b) and the two dodeca corners c,d
  // nearest its midpoint; require (b-a)×(c-a)·(d-a) = 0.
  const [a] = ico;
  const b = ico.slice(1).reduce((best, v) => (dist(v, a) < dist(best, a) ? v : best));
  const mid = a.map((x, i) => (x + b[i]) / 2);
  const [c, d] = [...dodecaDirs].sort((u, v) => dist(u, mid) - dist(v, mid));
  const coplanarity = (k) => triple(sub(b, a), sub(c.map((x) => x * k), a), sub(d.map((x) => x * k), a));
  let lo = 0.5, hi = 1.5;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (Math.sign(coplanarity(m)) === Math.sign(coplanarity(lo))) lo = m; else hi = m;
  }
  const k = (lo + hi) / 2;
  return [...ico, ...dodecaDirs.map((v) => v.map((x) => x * k))];
})();

function dist(u, v) { return Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]); }
function sub(u, v) { return [u[0] - v[0], u[1] - v[1], u[2] - v[2]]; }
function triple(u, v, w) {
  return u[0] * (v[1] * w[2] - v[2] * w[1]) - u[1] * (v[0] * w[2] - v[2] * w[0]) + u[2] * (v[0] * w[1] - v[1] * w[0]);
}

const PLATONIC = [
  solid('cube', CUBE),
  solid('octahedron', OCTAHEDRON),
  solid('dodecahedron', DODECAHEDRON),
  solid('icosahedron', ICOSAHEDRON),
];

// Equal circumradius undersizes the pyramid (long apex, flat base), so size it
// to the average apparent size of the other four instead.
const pyramidRaw = solid('pyramid', PYRAMID);
const targetArea = PLATONIC.reduce((sum, s) => sum + meanProjectedArea(s), 0) / PLATONIC.length;
const pyramid = scaled(pyramidRaw, Math.sqrt(targetArea / meanProjectedArea(pyramidRaw)));

// Same apparent size as the others, like the pyramid.
const triacontaRaw = solid('triacontahedron', TRIACONTAHEDRON);
const triacontahedron = scaled(triacontaRaw, Math.sqrt(targetArea / meanProjectedArea(triacontaRaw)));

/** Morph order: face count grows 5 → 6 → 8 → 12 → 20 → 30, then loops. */
export const SEQUENCE = [pyramid, ...PLATONIC, triacontahedron];

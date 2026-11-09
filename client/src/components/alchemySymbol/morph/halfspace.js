/**
 * Convex polyhedra as intersections of half-spaces { x : n·x <= d }.
 *
 * Morphing between two solids A and B = intersecting A's planes with B's
 * planes and sliding their offsets: B's planes slide in from "just touching
 * A's corners" (so they start invisible) and cut A's vertices off, then A's
 * planes slide out until they no longer touch B. Every in-between shape is a
 * real convex polyhedron with A's faces + B's faces, so the face count grows
 * on the way through (e.g. cube → cuboctahedron → octahedron).
 *
 * Pure math, no three.js dependency, so it's unit-testable and cheap. Plane
 * counts are small (≤ ~40), so brute-force vertex enumeration is fine.
 */

const EPS = 1e-6;
// Vertices closer than this are one vertex. When a cutting plane only just
// touches a corner, it creates a cluster of near-coincident vertices (an
// invisible sliver face); merging them keeps every frame a clean solid.
// ~1/1000 of the solid's radius — far below a pixel.
const MERGE_EPS = 2e-3;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const normalize = (a) => scale(a, 1 / len(a));

/** Face planes of the convex hull of a point set (dedupes coplanar triples). */
export function planesFromVertices(vertices) {
  const planes = [];
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        let nrm = cross(sub(vertices[j], vertices[i]), sub(vertices[k], vertices[i]));
        if (len(nrm) < EPS) continue;
        nrm = normalize(nrm);
        let d = dot(nrm, vertices[i]);
        if (d < 0) { nrm = scale(nrm, -1); d = -d; }
        if (vertices.every((v) => dot(nrm, v) <= d + 1e-5)) {
          if (!planes.some((p) => dot(p.n, nrm) > 1 - 1e-5)) planes.push({ n: nrm, d });
        }
      }
    }
  }
  return planes;
}

function solve3(p, q, r) {
  // Cramer's rule for n_p·x = d_p, n_q·x = d_q, n_r·x = d_r.
  const qr = cross(q.n, r.n);
  const det = dot(p.n, qr);
  if (Math.abs(det) < 1e-9) return null;
  const rp = cross(r.n, p.n);
  const pq = cross(p.n, q.n);
  return scale(
    [
      p.d * qr[0] + q.d * rp[0] + r.d * pq[0],
      p.d * qr[1] + q.d * rp[1] + r.d * pq[1],
      p.d * qr[2] + q.d * rp[2] + r.d * pq[2],
    ],
    1 / det,
  );
}

/**
 * Polyhedron bounded by `planes` (all must contain the origin).
 * Returns { vertices, faces: [{ normal, indices }], edges: [[i, j]] } with
 * face indices ordered counter-clockwise around the outward normal.
 */
export function intersectHalfspaces(planes, tol = 1e-5) {
  const m = planes.length;
  const vertices = [];
  const vertexPlanes = [];

  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      for (let c = b + 1; c < m; c++) {
        const x = solve3(planes[a], planes[b], planes[c]);
        if (!x) continue;
        let inside = true;
        for (let i = 0; i < m && inside; i++) inside = dot(planes[i].n, x) <= planes[i].d + tol;
        if (!inside) continue;
        // Merge with an existing vertex if coincident (>3 planes meeting).
        let idx = vertices.findIndex((v) => len(sub(v, x)) < MERGE_EPS);
        if (idx === -1) { idx = vertices.length; vertices.push(x); vertexPlanes.push(new Set()); }
        vertexPlanes[idx].add(a).add(b).add(c);
      }
    }
  }

  // Any plane a vertex lies on (catches planes that weren't in the solving triple).
  vertices.forEach((v, vi) => {
    planes.forEach((p, pi) => { if (Math.abs(dot(p.n, v) - p.d) < tol * 10) vertexPlanes[vi].add(pi); });
  });

  const faces = [];
  planes.forEach((p, pi) => {
    const idx = [];
    vertexPlanes.forEach((set, vi) => { if (set.has(pi)) idx.push(vi); });
    if (idx.length < 3) return;
    const centroid = scale(idx.reduce((acc, vi) => [acc[0] + vertices[vi][0], acc[1] + vertices[vi][1], acc[2] + vertices[vi][2]], [0, 0, 0]), 1 / idx.length);
    // Tangent basis on the face plane.
    const helper = Math.abs(p.n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = normalize(cross(p.n, helper));
    const w = cross(p.n, u);
    idx.sort((i, j) => {
      const di = sub(vertices[i], centroid), dj = sub(vertices[j], centroid);
      return Math.atan2(dot(di, w), dot(di, u)) - Math.atan2(dot(dj, w), dot(dj, u));
    });
    // Skip slivers that are numerically a line.
    const area = idx.reduce((acc, vi, k) => {
      const a = sub(vertices[vi], centroid), b = sub(vertices[idx[(k + 1) % idx.length]], centroid);
      return acc + dot(cross(a, b), p.n);
    }, 0) * 0.5;
    if (area < 1e-6) return;
    faces.push({ normal: p.n, plane: pi, indices: idx });
  });

  // Edges = consecutive vertex pairs on face loops, deduped.
  const edgeKeys = new Set();
  const edges = [];
  faces.forEach(({ indices }) => {
    indices.forEach((vi, k) => {
      const vj = indices[(k + 1) % indices.length];
      const key = vi < vj ? `${vi}-${vj}` : `${vj}-${vi}`;
      if (!edgeKeys.has(key)) { edgeKeys.add(key); edges.push([vi, vj]); }
    });
  });

  return { vertices, faces, edges };
}

/** Max distance from origin to any vertex (circumradius about the origin). */
export function circumradius(vertices) {
  return vertices.reduce((r, v) => Math.max(r, len(v)), 0);
}

/** Largest plane offset s.t. the plane still touches the vertex set: max n·v. */
export function support(vertices, n) {
  return vertices.reduce((m, v) => Math.max(m, dot(n, v)), -Infinity);
}

/**
 * Plane set for the morph from A to B at progress t ∈ [0, 1].
 * - B's planes start at A's support distance (touching A's corners → no cut)
 *   and ease in to their real offsets over [0, cutEnd].
 * - A's planes stay put, then ease out to B's support distance (touching B's
 *   corners → no longer cutting) over [releaseStart, 1].
 */
export function morphPlanes(A, B, t, { cutEnd = 0.6, releaseStart = 0.4 } = {}) {
  const ease = (x) => x * x * (3 - 2 * x);
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const cut = ease(clamp01(t / cutEnd));
  const release = ease(clamp01((t - releaseStart) / (1 - releaseStart)));
  const planes = [];
  A.planes.forEach((p) => {
    const out = Math.max(p.d, support(B.vertices, p.n)) * 1.0005;
    planes.push({ n: p.n, d: p.d + (out - p.d) * release, source: 'A' });
  });
  B.planes.forEach((p) => {
    const start = Math.max(p.d, support(A.vertices, p.n)) * 1.0005;
    planes.push({ n: p.n, d: start + (p.d - start) * cut, source: 'B' });
  });
  return planes;
}


/**
 * Two-stage pyramid intro, built on the pyramid's real topology so every
 * frame is drawn with the same 5 faces / 8 edges as the finished solid:
 *
 *   1. Base: the square spreads out of a point at the base centre, lying flat
 *      (the apex sits on the base, so the sides read as one flat plate).
 *   2. Rise: the apex lifts straight up out of the base until the pyramid
 *      reaches full height.
 *
 * `base` and `rise` are 0..1 eased progress values supplied by the caller.
 */

const MIN = 1e-3;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

function faceNormal(vertices, indices) {
  const a = vertices[indices[0]];
  const n = cross(sub(vertices[indices[1]], a), sub(vertices[indices[2]], a));
  const len = Math.hypot(n[0], n[1], n[2]);
  return len > 1e-12 ? [n[0] / len, n[1] / len, n[2] / len] : [0, 1, 0];
}

/** `pyramid` is the finished solid as returned by intersectHalfspaces. */
export function createPyramidGrow(pyramid) {
  const apexIndex = pyramid.vertices.reduce(
    (best, v, i) => (v[1] > pyramid.vertices[best][1] ? i : best),
    0,
  );
  const baseIdx = pyramid.vertices.map((_, i) => i).filter((i) => i !== apexIndex);
  const center = baseIdx
    .reduce((c, i) => [c[0] + pyramid.vertices[i][0], c[1] + pyramid.vertices[i][1], c[2] + pyramid.vertices[i][2]], [0, 0, 0])
    .map((x) => x / baseIdx.length);
  const apex = pyramid.vertices[apexIndex];

  return {
    apexIndex,
    /** Polyhedron at the given stage progress (same shape as intersectHalfspaces output). */
    at(base, rise) {
      const s = Math.max(base, MIN);
      const h = Math.max(rise, MIN);
      const vertices = pyramid.vertices.map((v, i) => {
        if (i === apexIndex) {
          return [center[0] + (apex[0] - center[0]) * h, center[1] + (apex[1] - center[1]) * h, center[2] + (apex[2] - center[2]) * h];
        }
        return [center[0] + (v[0] - center[0]) * s, v[1], center[2] + (v[2] - center[2]) * s];
      });
      const faces = pyramid.faces.map((f) => ({ ...f, normal: faceNormal(vertices, f.indices) }));
      return { vertices, faces, edges: pyramid.edges };
    },
  };
}

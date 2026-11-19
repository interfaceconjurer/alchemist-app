export const SKETCH_PREFIX = '/sketch/';
export const validSlug = (slug) => typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

export const pathFor = (item) => item ? SKETCH_PREFIX + item.slug : '/';

// undefined identifies other routes; null identifies a malformed sketch address.
export function slugFromPath(pathname) {
  if (!pathname.startsWith(SKETCH_PREFIX)) return undefined;
  try {
    const slug = decodeURIComponent(pathname.slice(SKETCH_PREFIX.length).replace(/\/+$/, '')).toLowerCase();
    return validSlug(slug) ? slug : null;
  } catch { return null; }
}

import { workSections } from './components/workList/workList';

/**
 * Each work item (a sketch in the Laboratory sketchbook) has its own address,
 * /sketch/<title>, so it can be linked to and the browser's back and forward
 * buttons move between items. Home is /.
 *
 * The slug comes from the item's title ("Portfolio review with Apollo" →
 * portfolio-review-with-apollo), so the address reads like the page. A project
 * may set `slug` in its JSON to keep an old address after a retitle.
 */
export const SKETCH_PREFIX = '/sketch/';

export function slugify(title) {
  return String(title)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // accents: café → cafe
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const slugFor = (item) => item.slug || slugify(item.title);

const items = workSections.flatMap((section) => section.items);
const bySlug = new Map(items.map((item) => [slugFor(item), item]));
if (bySlug.size !== items.length) {
  // Two items would share an address; project-data tests catch this before it ships.
  console.error('Two work items have the same /sketch/ address. Give one a `slug`.');
}

/** The address of a work item, or of home for `null`. */
export const pathFor = (item) => (item ? `${SKETCH_PREFIX}${slugFor(item)}` : '/');

/**
 * The work item an address points to. `undefined`: not a sketch address (home,
 * or anything else). `null`: a /sketch/ address with no such item.
 */
export function itemForPath(pathname) {
  if (!pathname.startsWith(SKETCH_PREFIX)) return undefined;
  let slug = pathname.slice(SKETCH_PREFIX.length).replace(/\/+$/, '');
  try { slug = decodeURIComponent(slug); } catch { return null; }
  return bySlug.get(slug.toLowerCase()) ?? null;
}

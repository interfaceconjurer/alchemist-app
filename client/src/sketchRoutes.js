import { workSections } from './components/workList/workList';
import { slugFromPath } from './sketchPath';
export { pathFor } from './sketchPath';

const bySlug = new Map(workSections.flatMap(section => section.items.map(item => [item.slug, item])));

export function itemForPath(pathname) {
  const slug = slugFromPath(pathname);
  return slug === undefined ? undefined : bySlug.get(slug) ?? null;
}

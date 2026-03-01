import { workSections } from './components/workList/workList';

const workItemMap = new Map();
for (const section of workSections) {
  for (const item of section.items) {
    workItemMap.set(item.id, item);
  }
}

/**
 * Given an array of IDs, return full work item objects.
 * Unknown IDs are silently dropped.
 */
export function resolveWorkItemsByIds(ids) {
  const resolved = [];
  for (const id of ids) {
    const item = workItemMap.get(id);
    if (item) {
      resolved.push(item);
    }
  }
  return resolved;
}

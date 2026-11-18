import { expect, it } from 'vitest';
import { feedItems } from './workList';

const projects = Object.entries(import.meta.glob('../../data/projects/*.json', { eager: true, import: 'default' }))
  .map(([path, project]) => [path.split('/').pop(), project]);

// Safari (and every WebKit browser, such as Arc Search on iPhone) can't parse a
// month and year alone ("Nov 2026"), which broke the newest-first sort on phones.
// Only a full date sorts the same in every browser.
it.each(projects)('%s has a full date every browser can sort by', (_file, project) => {
  expect(project.date).toMatch(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([1-9]|[12]\d|3[01]), \d{4}$/);
  expect(Number.isNaN(new Date(project.date).getTime())).toBe(false);
});

it('lists the feed newest first', () => {
  const times = feedItems.map((item) => new Date(item.date).getTime());
  expect(times).toEqual([...times].sort((a, b) => b - a));
});

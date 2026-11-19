import { coverPage, isPageCovered, onPageCover } from './pageCover';

it('reports the page covered while any overlay covers it, and notifies on each change', () => {
  const changes = [];
  const stop = onPageCover((covered) => changes.push(covered));
  expect(isPageCovered()).toBe(false);
  const first = coverPage();
  const second = coverPage();
  expect(isPageCovered()).toBe(true);
  first();
  first(); // releasing twice has no effect
  expect(isPageCovered()).toBe(true);
  second();
  expect(isPageCovered()).toBe(false);
  expect(changes).toEqual([true, false]);
  stop();
  coverPage()();
  expect(changes).toEqual([true, false]);
});

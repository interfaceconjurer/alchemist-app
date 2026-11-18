import React, { useRef } from 'react';
import { render } from '@testing-library/react';
import { useSwipeBack } from './useSwipeBack';

function Stage({ dispatch }) {
  const ref = useRef(null);
  useSwipeBack(ref, true, true, dispatch);
  return (
    <section ref={ref} data-testid="stage">
      <p data-testid="content">work item</p>
      <dialog open><div data-testid="viewer-image">zoomable image</div></dialog>
    </section>
  );
}
const touch = (el, type, points, changed = points) => {
  const list = (ps) => ps.map(([x, y], i) => ({ identifier: i, clientX: x, clientY: y, target: el }));
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { touches: type === 'touchend' ? list(points) : list(points), changedTouches: list(changed) });
  el.dispatchEvent(event);
};
const close = { type: 'CLOSE_ACTIVE_TAB' };

it('closes the work item on a one-finger swipe right across it', () => {
  const dispatch = vi.fn();
  const { getByTestId } = render(<Stage dispatch={dispatch} />);
  const content = getByTestId('content');
  touch(content, 'touchstart', [[20, 300]]);
  touch(content, 'touchend', [], [[200, 310]]);
  expect(dispatch).toHaveBeenCalledWith(close);
});

it('ignores touches inside the artifact viewer, so pinching and panning a zoomed image never closes it', () => {
  const dispatch = vi.fn();
  const { getByTestId } = render(<Stage dispatch={dispatch} />);
  const image = getByTestId('viewer-image');
  touch(image, 'touchstart', [[150, 300]]);
  touch(image, 'touchend', [], [[300, 305]]); // a pan ending 150px to the right
  expect(dispatch).not.toHaveBeenCalled();
});

it('never treats a two-finger gesture as a swipe', () => {
  const dispatch = vi.fn();
  const { getByTestId } = render(<Stage dispatch={dispatch} />);
  const content = getByTestId('content');
  touch(content, 'touchstart', [[100, 300]]);
  touch(content, 'touchstart', [[100, 300], [160, 300]]); // second finger: a pinch
  touch(content, 'touchend', [[100, 300]], [[300, 300]]); // one finger lifts far right
  touch(content, 'touchend', [], [[100, 300]]);
  expect(dispatch).not.toHaveBeenCalled();
});

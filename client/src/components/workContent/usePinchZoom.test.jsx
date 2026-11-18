import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { DOUBLE_TAP_ZOOM, MAX_ZOOM, clampView, usePinchZoom, zoomAbout } from './usePinchZoom';

it('keeps the view between fitted and the zoom cap, with the picture covering its box', () => {
  expect(clampView({ scale: 0.5, x: 40, y: 40 }, 200, 100)).toEqual({ scale: 1, x: 0, y: 0 });
  expect(clampView({ scale: 9, x: 0, y: 0 }, 200, 100).scale).toBe(MAX_ZOOM);
  // At 2x the picture is 400 x 200 in a 200 x 100 box: it can move at most 200 x 100.
  expect(clampView({ scale: 2, x: -500, y: 30 }, 200, 100)).toEqual({ scale: 2, x: -200, y: 0 });
});

it('zooms about a point, which stays where it is', () => {
  const view = zoomAbout({ scale: 1, x: 0, y: 0 }, 2, 50, 30);
  // The box point (50, 30) maps to the same picture point before and after.
  expect((50 - view.x) / view.scale).toBe(50);
  expect((30 - view.y) / view.scale).toBe(30);
});

function Viewer({ src = '/a.svg' }) {
  const zoom = usePinchZoom(src);
  return (
    <div ref={zoom.ref} data-testid="box" data-zoomed={zoom.zoomed} {...zoom.handlers}>
      <img alt="art" style={zoom.style} />
      <button type="button" onClick={() => zoom.zoomBy(1.5)}>in</button>
      <button type="button" onClick={zoom.reset}>reset</button>
    </div>
  );
}
const setup = (props) => {
  const result = render(<Viewer {...props} />);
  const box = result.getByTestId('box');
  Object.defineProperties(box, { clientWidth: { value: 200 }, clientHeight: { value: 100 } });
  box.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 });
  return { ...result, box, img: result.getByAltText('art') };
};
const pointer = (box, type, id, x, y, extra = {}) => fireEvent[type](box, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, ...extra });

it('pinches the picture with two fingers, up to the cap', () => {
  const { box, img } = setup();
  pointer(box, 'pointerDown', 1, 80, 50);
  pointer(box, 'pointerDown', 2, 120, 50);
  // Spread evenly about (100, 50), 40 px apart to 80: 2x, centred where the pinch began.
  pointer(box, 'pointerMove', 1, 60, 50);
  pointer(box, 'pointerMove', 2, 140, 50);
  expect(img.style.transform).toBe('translate(-100px, -50px) scale(2)');
  // Moving both fingers together pans the zoomed picture with them.
  pointer(box, 'pointerMove', 1, 50, 50);
  pointer(box, 'pointerMove', 2, 130, 50);
  expect(img.style.transform).toBe('translate(-110px, -50px) scale(2)');
  pointer(box, 'pointerMove', 2, 1000, 50);
  expect(img.style.transform).toMatch(new RegExp(`scale\\(${MAX_ZOOM}\\)$`));
  pointer(box, 'pointerUp', 2, 1000, 50);
  pointer(box, 'pointerUp', 1, 80, 50);
  expect(box).toHaveAttribute('data-zoomed', 'true');
});

it('double-taps to zoom in and back out, without a gesture', () => {
  const { box, img } = setup();
  const tap = (t) => { pointer(box, 'pointerDown', 1, 100, 50, { timeStamp: t }); pointer(box, 'pointerUp', 1, 100, 50, { timeStamp: t }); };
  tap(1000); tap(1100);
  expect(img.style.transform).toBe(`translate(${100 - 100 * DOUBLE_TAP_ZOOM}px, ${50 - 50 * DOUBLE_TAP_ZOOM}px) scale(${DOUBLE_TAP_ZOOM})`);
  tap(2000); tap(2100);
  expect(img.style.transform).toBe('');
});

it('drags to pan only while zoomed', () => {
  const { box, img, getByText } = setup();
  pointer(box, 'pointerDown', 1, 100, 50);
  pointer(box, 'pointerMove', 1, 60, 50);
  pointer(box, 'pointerUp', 1, 60, 50);
  expect(img.style.transform).toBe(''); // fitted: nothing to pan
  fireEvent.click(getByText('in')); // 1.5x about the centre: translate(-50px, -25px)
  pointer(box, 'pointerDown', 1, 100, 50);
  pointer(box, 'pointerMove', 1, 80, 40);
  expect(img.style.transform).toBe('translate(-70px, -35px) scale(1.5)');
});

it('returns to the fitted view for the next image', () => {
  const { box, getByText, rerender } = setup();
  fireEvent.click(getByText('in'));
  expect(box).toHaveAttribute('data-zoomed', 'true');
  rerender(<Viewer src="/b.svg" />);
  expect(box).toHaveAttribute('data-zoomed', 'false');
});

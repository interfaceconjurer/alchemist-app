import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ThemeProvider } from '../../contexts/ThemeContext';
import WorkContent from './WorkContent';

it('reserves a diagram’s intrinsic aspect ratio before its lazy image loads', () => {
  render(<ThemeProvider><WorkContent content={{ artifacts: [{ type: 'diagram', src: '/diagram.svg', alt: 'Pipeline', width: 900, height: 269 }] }} /></ThemeProvider>);
  const image = screen.getByRole('img', { name: 'Pipeline' });
  expect(image).toHaveAttribute('width', '900');
  expect(image).toHaveAttribute('height', '269');
  expect(image.parentElement.style.aspectRatio).toBe('900 / 269');
});

it('embeds a self-contained artifact at its intrinsic aspect ratio with a download link', () => {
  render(<ThemeProvider><WorkContent content={{ artifacts: [{
    type: 'embed', src: '/work/deck/index.html', title: 'Slide deck', width: 1920, height: 1080,
    download: { href: '/work/deck/deck.pdf', label: 'Download PDF' },
  }] }} /></ThemeProvider>);
  const frame = screen.getByTitle('Slide deck');
  expect(frame.tagName).toBe('IFRAME');
  expect(frame).toHaveAttribute('src', '/work/deck/index.html');
  expect(frame.parentElement.style.aspectRatio).toBe('1920 / 1080');
  expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute('href', '/work/deck/deck.pdf');
});

const gallery = {
  artifacts: [
    { type: 'embed', src: '/work/deck/index.html', title: 'Slide deck', label: 'The deck', description: 'Use the arrow keys.', width: 1920, height: 1080 },
    { type: 'code', label: 'CLI', code: 'run' },
  ],
  outcome: [
    { src: '/a.png', alt: 'First render', caption: 'Atmospheric scale' },
    { src: '/b.png', alt: 'Second render', caption: 'Holographic elements' },
  ],
};

it('opens an artifact in a full-screen viewer with its title and description', () => {
  render(<ThemeProvider><WorkContent content={gallery} /></ThemeProvider>);
  const dialog = document.querySelector('dialog.artifact-viewer');
  expect(dialog).not.toHaveAttribute('open');
  fireEvent.click(screen.getByRole('button', { name: 'View The deck larger' }));
  expect(dialog).toHaveAttribute('open');
  expect(within(dialog).getByRole('heading', { name: 'The deck' })).toBeInTheDocument();
  expect(within(dialog).getByText('Use the arrow keys.')).toBeInTheDocument();
  expect(within(dialog).getByTitle('Slide deck')).toHaveAttribute('src', '/work/deck/index.html');
  expect(within(dialog).getByText('1 / 3')).toBeInTheDocument(); // code blocks stay inline
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(dialog).not.toHaveAttribute('open');
});

it('pages through outcome images with the arrow keys and buttons', () => {
  render(<ThemeProvider><WorkContent content={gallery} /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'View Atmospheric scale larger' }));
  const dialog = document.querySelector('dialog.artifact-viewer');
  expect(within(dialog).getByRole('img', { name: 'First render' })).toHaveAttribute('src', '/a.png');
  expect(within(dialog).getByText('2 / 3')).toBeInTheDocument();
  fireEvent.keyDown(dialog, { key: 'ArrowRight' });
  expect(within(dialog).getByRole('img', { name: 'Second render' })).toBeInTheDocument();
  expect(within(dialog).getByRole('heading', { name: 'Holographic elements' })).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  expect(within(dialog).getByText('1 / 3')).toBeInTheDocument(); // wraps to the deck
  fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
  expect(within(dialog).getByText('3 / 3')).toBeInTheDocument();
});

it('shows every outcome image in a wrapping grid rather than a scrolling strip', () => {
  render(<ThemeProvider><WorkContent content={gallery} /></ThemeProvider>);
  expect(document.querySelector('.work-content-outcome-grid')).not.toBeNull();
  expect(document.querySelector('.work-content-outcome-row')).toBeNull();
});

it('leaves artifacts marked viewable: false as plain media outside the viewer', () => {
  render(<ThemeProvider><WorkContent content={{
    artifacts: [
      { type: 'diagram', src: '/logo.svg', alt: 'Logo', label: 'Project Identity' },
      { type: 'diagram', src: '/pipeline.svg', alt: 'Pipeline', label: 'Training Pipeline', viewable: false },
    ],
    outcome: [{ src: '/a.png', alt: 'Render', caption: 'Atmospheric scale' }],
  }} /></ThemeProvider>);
  expect(screen.getByRole('button', { name: 'View Project Identity larger' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'View Training Pipeline larger' })).toBeNull();
  expect(screen.getByRole('img', { name: 'Pipeline' }).closest('button')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'View Project Identity larger' }));
  expect(within(document.querySelector('dialog')).getByText('1 / 2')).toBeInTheDocument();
});

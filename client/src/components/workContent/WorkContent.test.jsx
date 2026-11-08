import React from 'react';
import { render, screen } from '@testing-library/react';
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

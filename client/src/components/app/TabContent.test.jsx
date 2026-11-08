import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import TabContent from './TabContent';

it('shows ready portfolio content immediately without a simulated loading delay', () => {
  const tab = { id: 'a', title: 'Ready project', description: 'Ready description' };
  render(<TabContent tabs={[tab]} activeTabId="a" animatedTabs={new Set()} fadingTabs={new Set()} />);
  expect(screen.getByRole('heading', { name: 'Ready project' })).toBeVisible();
  expect(screen.getByText('Ready description')).toBeVisible();
  expect(document.querySelector('.stage-content--hidden')).toBeNull();
  expect(document.querySelector('.terminal-loader')).toBeNull();
});

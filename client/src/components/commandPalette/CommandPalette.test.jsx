import React, { useState } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import CommandPalette from './CommandPalette';

const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.unstubAllGlobals();
  if (scrollDescriptor) Object.defineProperty(Element.prototype, 'scrollIntoView', scrollDescriptor);
  else delete Element.prototype.scrollIntoView;
});

function Harness({ onAction = () => {}, onSelectItem = () => {} }) {
  const [open, setOpen] = useState(false);
  return (
    <ThemeProvider>
      <button onClick={() => setOpen(true)}>Open search</button>
      <CommandPalette isOpen={open} onClose={() => setOpen(false)} onAction={onAction} onSelectItem={onSelectItem} openTabIds={[]} />
    </ThemeProvider>
  );
}

function openSearch() {
  const trigger = screen.getByRole('button', { name: 'Open search' });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, input: screen.getByRole('combobox', { name: 'Search work items and actions' }) };
}

describe('command palette keyboard behavior', () => {
  it('labels its modal, search field, results, and current option', () => {
    render(<Harness />);
    const { input } = openSearch();
    expect(screen.getByRole('dialog', { name: 'Search work and actions' })).toHaveAttribute('aria-modal', 'true');
    expect(input).toHaveFocus();
    const results = screen.getByRole('listbox', { name: 'Search results' });
    expect(input).toHaveAttribute('aria-controls', results.id);
    const active = document.getElementById(input.getAttribute('aria-activedescendant'));
    expect(active).toHaveAttribute('role', 'option');
    expect(active).toHaveAttribute('aria-selected', 'true');
  });

  it('restores the trigger after Escape and after clicking outside', () => {
    render(<Harness />);
    let { trigger, input } = openSearch();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    ({ trigger } = openSearch());
    fireEvent.click(document.querySelector('.command-palette-overlay'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab and Shift+Tab inside the modal search field', () => {
    render(<Harness />);
    const { input } = openSearch();
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(false);
    expect(input).toHaveFocus();
    expect(fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(input).toHaveFocus();
  });

  it('keeps arrow selection valid through an empty search and invokes the selected action', () => {
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    const { trigger, input } = openSearch();
    fireEvent.change(input, { target: { value: 'no-matching-result-ever' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).not.toHaveAttribute('aria-activedescendant');
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'Close All Tabs' } });
    expect(screen.getByRole('option', { name: 'Close All Tabs' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAction).toHaveBeenCalledExactlyOnceWith('action:close-all');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

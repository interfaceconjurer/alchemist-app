import React from 'react';
import { render, act } from '@testing-library/react';
import App from './App';

it('renders without crashing', async () => {
  await act(async () => {
    render(<App />);
  });
});

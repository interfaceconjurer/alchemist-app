import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route} from "react-router-dom";
import './index.css';
import App from './App';

const Root = () => {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<App/>} />
      </Routes>
    </Router>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Root />);

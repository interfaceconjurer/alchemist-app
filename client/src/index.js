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
// Create a root.
const root = createRoot(container);

root.render(<Root />);
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.register();

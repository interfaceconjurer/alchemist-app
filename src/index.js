import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Switch, Route} from "react-router-dom";
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

const Root = () => {
  return (
    <Router>
      <Switch>
        <Route path="/" component={App} />
        <Route path='/resume' exact component={() => { window.location = 'http://digitalchem.ist/resume/Jordan_L_Wright.pdf'; return null;} }/>
      </Switch>
    </Router>
  );
}

ReactDOM.render(<Root />, document.getElementById('root'));
registerServiceWorker();

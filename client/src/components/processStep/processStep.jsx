import React from 'react';
import './processStep.css';


const ProcessStep = (props) =>
      <li className="process-step">
        {props.children}
      </li>
export default ProcessStep;
import React, { Component } from 'react';
import './processStep.css';


class ProcessStep extends Component {
  render(){
    return(
      <li className="process-step">
        {this.props.children}
      </li>
    )
  }
}
export default ProcessStep;
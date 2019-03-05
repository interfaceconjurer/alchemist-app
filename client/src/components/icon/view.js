import React, { Component } from 'react';
import './view.css';

class Icon extends Component {
    render() {
        return(
          <span className="icon-container" title={this.props.title}>
            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="17" height="17" viewBox="0 0 17 17">
              <path fill="#747474" d={this.props.icon}/>
            </svg>
            <span className="assistive-text">{this.props.assistiveText}</span>
          </span>
        );
    } 
}
export default Icon;
import React, { Component } from 'react';
import './View.css';

class View extends Component { 

    render() {
      return (
        <article className="symbolContainer">
          <object className="symbol" ref={this.props.symbolElement} type="image/svg+xml" data={this.props.symbol}>SVG Element</object>
        </article>
      );
    }
}

export default View;
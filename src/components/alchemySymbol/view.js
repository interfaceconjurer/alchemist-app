import React, { Component } from 'react';

class View extends Component { 

    render() {
      return (
        <object className="symbol" ref={this.props.symbolElement} type="image/svg+xml" data={this.props.symbol}>SVG Element</object>
      );
    }
}

export default View;
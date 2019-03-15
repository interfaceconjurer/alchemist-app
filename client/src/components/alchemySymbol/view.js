import React, { Component } from 'react';
import './view.css';

class View extends Component { 

    render() {
      return (
        <article className="symbolContainer">
          <section className="symbol" ref={this.props.symbolElement}>
            {this.props.symbol}
          </section>
        </article>
      );
    }
}

export default View;
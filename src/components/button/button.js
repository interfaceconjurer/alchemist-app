import React, { Component } from 'react';
import './Button.css';

class Button extends Component {
    render() {
        return(
          <button autoFocus={this.props.focus} onClick={this.props.onClick} className='button'>{this.props.label}</button>
        );
    } 
}
export default Button;
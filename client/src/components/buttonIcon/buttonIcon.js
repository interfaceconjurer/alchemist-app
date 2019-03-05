import React, { Component } from 'react';
import './buttonIcon.css';

class ButtonIcon extends Component {
    render() {
        return(
            <button autoFocus={this.props.focus} onClick={this.props.onClick} className='button-icon'>
              {this.props.icon}
            </button>
        );
    } 
}
export default ButtonIcon;
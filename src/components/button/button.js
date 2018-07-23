import React, { Component } from 'react';
import './button.css';


class Button extends Component {
    
    render() {
        return(
          <button className='button'>{this.props.label}</button>
        );
    } 
}

export default Button;
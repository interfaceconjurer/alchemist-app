import React, { Component } from 'react';
import symbols from '../symbols/symbols';
import View from './View';
import Helper from './Helper';

class AlchemySymbol extends Component {
    constructor(){
        super();
        this.state = {
          symbolsIndex:1
        }
        
      }

    componentDidMount(){
        this.symbolElement.addEventListener('load', this.animateSvg.bind(this));
    }

    updateSymbolIndex() {
        console.log('=^..^=');
        let newIndex;
        symbols[this.state.symbolsIndex + 1] ? newIndex = this.state.symbolsIndex + 1 : newIndex = 1;
        this.setState({ symbolsIndex: newIndex });
        this.animateSvg.bind(this)
    }

    animateSvg() {
      Helper.animateSymbol(this.symbolElement, this.state.symbolsIndex, this.updateSymbolIndex.bind(this));
    }

    render() {
        return (
            <View symbolElement={node => this.symbolElement = node} symbol={symbols[this.state.symbolsIndex]}/>
        );
    }
}

export default AlchemySymbol;
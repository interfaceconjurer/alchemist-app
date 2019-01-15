import React, { Component } from 'react';
import symbols from '../symbols/symbols';
import View from './View';
import Helper from './Helper';

class AlchemySymbol extends Component {
  constructor() {
    super();
    this.state = {
      symbolsIndex: 1
    }
    this.symbolInView = true;
    this.symbolTimeOutFunc = null;
    this.exitAnimation = null;
  }

  componentDidMount() {
    const runExecution = () => {
      this.animateSvg();
      this.symbolElement.addEventListener('load', this.animateSvg.bind(this));
      window.onscroll = this.logScroll.bind(this, this.symbolElement.offsetHeight);
    }
    window.addEventListener("load", runExecution);

  }

  componentWillUnmount(){
    window.onscroll = null;
  }

  logScroll = (symbolHeight) => {
    // symbol is OUT of view
    if(window.scrollY > symbolHeight && this.symbolInView){
      this.symbolInView = false;
      if(this.exitAnimation){
        clearTimeout(this.symbolTimeOutFunc);
        this.exitAnimation(this.symbolElement);
      }
    // symbol is IN of view
    } else if(window.scrollY < symbolHeight && !this.symbolInView){
      this.symbolInView = true;
      this.updateSymbolIndex();
    }
  }

  updateSymbolIndex() {
    if(this.symbolInView){
      let newIndex;
      symbols[this.state.symbolsIndex + 1] ? newIndex = this.state.symbolsIndex + 1 : newIndex = 1;
      this.setState({
        symbolsIndex: newIndex
      });
    }
  }

  animateSvg() {
    this.exitAnimation = Helper.animateSymbol(this.symbolElement, this.state.symbolsIndex, this.updateSymbolIndex.bind(this));
    this.symbolTimeOutFunc = setTimeout(this.exitAnimation.bind(this, this.symbolElement) ,8000);  
  }

  render() {
    return (
      <View symbolElement={node => this.symbolElement = node} symbol={symbols[this.state.symbolsIndex]}/>
    );
  }
}

export default AlchemySymbol;
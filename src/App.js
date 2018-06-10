import React, { Component } from 'react';
import symbols from './symbols/symbols';
import './App.css';

class App extends Component {
  constructor(){
    super();
    this.state = {
      counter:0
    }
  }

  handleTransitionEffect = (event) => {
    const element = event.target;
    element.classList.remove('animating');
    this.updateCounter();
    element.src = symbols[this.state.counter];
    setTimeout(() => {
      element.classList.add('animating');
    },50)
    
  }

  updateCounter = () => {
    let newCounter = symbols[this.state.counter + 1] ? this.state.counter + 1 : 0;
    
    this.setState((prevState) => ({
      counter: newCounter
    }));
  }
  
  componentDidMount(){
    const symbol = this.refs.symbol;
    symbol.classList.add('animating');
    symbol.addEventListener('animationend', this.handleTransitionEffect);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={symbols[this.state.counter]} ref='symbol' className="symbol" alt="alchemy symbol" />
          <h1 className="App-title">Jordan L. Wright</h1>
        </header>
        <p className="App-intro">
          Product Strategist, Designer &amp; UXE
        </p>
      </div>
    );
    
  }
}

export default App;

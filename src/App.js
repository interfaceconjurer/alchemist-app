import React, { Component } from 'react';
import './App.css';
import Button from './components/button/button';
import AlchemySymbol from './components/alchemySymbol/mediator';

class App extends Component {

  render() {
    return (
      <main className="App">
        <header className="App-header">
          <AlchemySymbol />
          <h1 className="App-title">Jordan L. Wright</h1>
          <p className="App-intro">
            Product Strategist, Designer &amp; UXE
          </p>
        </header>
        <nav className='nav'>
          <Button label="LinkedIn" />
          <Button label="Resume" />
        </nav>

        <div className='divider'></div>
        
      </main>
    );
    
  }
}

export default App;

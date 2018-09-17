import React, { Component } from 'react';
import './App.css';
import Button from './components/button/button';
import AlchemySymbol from './components/alchemySymbol/mediator';
import WorkLayout from './components/workLayout/mediator';
import Modal from './components/modal/mediator';
import pubSub from './pubSub';


class App extends Component {
  constructor(){
    super();
    this.state = {
      mainClass: 'main'
    }
  }

  componentWillMount(){
    pubSub.addListener('toggleModal', this.handleMainClassState);
  }

  componentWillUnmount(){
    pubSub.removeListener('toggleModal', this.handleMainClassState);
  }

  handleMainClassState = (config) => {
    const actionClass ={
      'SHOW_MODAL': 'main modalVisible',
      'HIDE_MODAL': 'main'
    };
      this.setState((state) => {
        return {mainClass: actionClass[config.actionType]}
      });
  }

  render() {
    return (
      <div className="App">
        <Modal/>
        <main role="main" className={this.state.mainClass}>
          <header className="App-header">
            <AlchemySymbol />
            <h1 className="App-title">Jordan L. Wright</h1>
            <p className="App-intro">
              Product Strategist &amp; Interface Conjurer
            </p>
          </header>
          <nav className='nav'>
            <Button label="LinkedIn" />
            <Button label="Resume" />
          </nav>
          <div className='divider'></div>
          <WorkLayout /> 
        </main>
      </div>
    );
    
  }
}

export default App;

import React, { Component } from 'react';
import { Route, Switch} from "react-router-dom";
import { TransitionGroup } from 'react-transition-group';
import './App.css';
import Icon from './components/Icon/Icon';
import { ICONS } from './components/Icon/iconList';
import AlchemySymbol from './components/AlchemySymbol/Mediator';
import WorkLayout from './components/WorkLayout/Mediator';
import Modal from './components/Modal/Mediator';
import PubSub from './PubSub';


class App extends Component {
  constructor(){
    super();
    this.state = {
      mainClass: 'main'
    }
  }

  componentWillMount(){
    PubSub.addListener('toggleModal', this.handleMainClassState);
  }

  componentWillUnmount(){
    PubSub.removeListener('toggleModal', this.handleMainClassState);
  }

  handleMainClassState = (config) => {
    const actionClass ={
      'SHOW_MODAL': {
        class: 'main modalVisible',
        bodyScroll: "hidden"
      },
      'HIDE_MODAL': {
        class: 'main',
        bodyScroll: "auto"
      }
    };
    const body = document.querySelector('body');
    body.style.overflow = actionClass[config.actionType].bodyScroll;
    this.setState((state) => {
      return {mainClass: actionClass[config.actionType].class}
    });
  }

  render() {
    console.log(this.props.location)
    return (
      <div className="App">
        <TransitionGroup>
          <Switch location={this.props.location}>
            <Route path="/workItem/:id" component={Modal} />
          </Switch>
        </TransitionGroup>
        <main className={this.state.mainClass}>
          <header className="App-header">
            <AlchemySymbol />
            <h1 className="App-title">Jordan L. Wright</h1>
            <p className="App-intro">
              Product Designer &amp; Interface Engineer UXE
            </p>
          </header>
          <nav className='nav'>
            <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="http://www.linkedin.com/in/jordan-l-wright-91b17321">
              <span>LinkedIn</span>
              <Icon title="Out-Bound Link" icon={ICONS.OUTBOUNDLINK} assistiveText="Out-Bound Link"/>
            </a>
            <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="http://digitalchem.ist/digitalchemist/resume/Jordan_L_Wright.pdf">
              <span>Resume</span>
              <Icon title="Out-Bound Link" icon={ICONS.OUTBOUNDLINK} assistiveText="Out-Bound Link"/>
            </a>
          </nav>
          <div className='divider'></div>
          <WorkLayout /> 
        </main>
      </div>
    );
  }
}

export default App;

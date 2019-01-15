import React, { Component } from 'react';
import { Route, Switch} from "react-router-dom";
import ReactGA from 'react-ga';
import './App.css';
import Icon from './components/Icon/Icon';
import { ICONS } from './components/Icon/iconList';
import AlchemySymbol from './components/AlchemySymbol/Mediator';
import WorkLayout from './components/WorkLayout/Mediator';
import Modal from './components/Modal/Mediator';
import PubSub from './PubSub';

ReactGA.initialize('UA-128600521-1');
ReactGA.pageview(window.location.pathname + window.location.search);

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
        class: 'main modalVisible'
      },
      'HIDE_MODAL': {
        class: 'main'
      }
    };    
    this.setState((state) => {
      return {mainClass: actionClass[config.actionType].class}
    });
  }

  render() {
    return (
      <div className="App">
        <Switch location={this.props.location}>
          <Route path="/workItem/:id" component={Modal} />
        </Switch> 
        <main ref="main" className={this.state.mainClass}>
          <header className="App-header">
            <AlchemySymbol />
            <h1 className="App-title">Jordan L. Wright</h1>
            <p className="App-intro">
              Product Designer &amp; Interface Conjurer
            </p>
          </header>
          <nav className='nav'>
            <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="http://www.linkedin.com/in/jordan-l-wright-91b17321">
              <span>LinkedIn</span>
              <Icon title="Out-Bound Link" icon={ICONS.OUTBOUNDLINK} assistiveText="Out-Bound Link"/>
            </a>
            <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="http://digitalchem.ist/resume/Jordan_L_Wright.pdf">
              <span>Resume</span>
              <Icon title="Out-Bound Link" icon={ICONS.OUTBOUNDLINK} assistiveText="Out-Bound Link"/>
            </a>
          </nav>
          <div className='divider'></div>
          <p className='work-statement'>Captured here are brief moments in the lifecycle of various works. Further details are available over a coffee or whiskey<span role="img" aria-label="Whiskey and coffee emojis"> ☕🥃</span> </p>
          <WorkLayout /> 
        </main>
      </div>
    );
  }
}

export default App;

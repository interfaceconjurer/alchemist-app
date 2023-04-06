import React, { Component } from 'react';
import { Route, Routes} from "react-router-dom";
import ReactGA from 'react-ga';
import './App.css';
import Resume from './resume/Jordan_L_Wright.pdf';
import Icon from './components/icon/view';
import { icons } from './components/iconList/iconList';
import AlchemySymbol from './components/alchemySymbol/mediator';
import WorkLayout from './components/workLayout/mediator';
import Modal from './components/modal/mediator';
import PubSub from './pubSub';
import Process from './components/process/process';
import ProcessExamples from './components/processExamples/processExamples';

ReactGA.initialize('UA-128600521-1');
ReactGA.pageview(window.location.pathname + window.location.search);

class App extends Component {
  constructor(){
    super();
    this.state = {
      mainClass: 'main'
    }
  }

  UNSAFE_componentWillMount(){
    PubSub.addListener('toggleModal', this.handleMainClassState);
  }

  componentWillUnmount(){
    PubSub.removeListener('toggleModal', this.handleMainClassState);
  }

  handleMainClassState = (config) => {
    const changeClass = () => {
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
    changeClass();
  }

  render() {
    return (
      <div className="App">
        <Routes location={this.props.location}>
          <Route path="/workItem/:id" component={Modal} />
        </Routes> 
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
              <Icon title="Out-Bound Link" icon={icons.outboundlink} assistiveText="Out-Bound Link"/>
            </a>
            <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href={Resume}>
              <span>Resume</span>
              <Icon title="Out-Bound Link" icon={icons.outboundlink} assistiveText="Out-Bound Link"/>
            </a>
            <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="https://github.com/interfaceconjurer">
              <span>GitHub</span>
              <Icon title="Out-Bound Link" icon={icons.outboundlink} assistiveText="Out-Bound Link"/>
            </a>
            <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="https://medium.com/@adigitalchemist">
              <span>Medium</span>
              <Icon title="Out-Bound Link" icon={icons.outboundlink} assistiveText="Out-Bound Link"/>
            </a>
          </nav>
          <div className='divider'></div>
            <Process />
          {/* <div className='divider'></div>
            <ProcessExamples />
          <div className='divider'></div>
          <h2 className="visual-design-statement">The Icing on the Cake. Who doesn’t like a little candy</h2>
          <p className='work-statement-preamble'>Random moments of visual design snippets, motion, and microinteractions</p>
          <p className='work-statement'>Further details are available over a coffee or whiskey<span role="img" aria-label="Whiskey and coffee emojis"> ☕🥃</span> </p>
          <WorkLayout />  */}
        </main>
      </div>
    );
  }
}

export default App;

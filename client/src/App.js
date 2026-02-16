import React, { Component } from 'react';
import { Route, Routes} from "react-router-dom";
import './App.css';
import Resume from './resume/Jordan_L_Wright.pdf';
import Icon from './components/icon/view';
import { icons } from './components/iconList/iconList';
import AlchemySymbol from './components/alchemySymbol/mediator';
import Modal from './components/modal/mediator';
import PubSub from './pubSub';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle/ThemeToggle';

class App extends Component {
  constructor(){
    super();
    this.state = {
      mainClass: 'main'
    }
    this.mainRef = React.createRef();
  }

  componentDidMount(){
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
      <ThemeProvider>
        <div className="App">
          <ThemeToggle />
          <Routes location={this.props.location}>
            <Route path="/workItem/:id" element={<Modal />} />
          </Routes>
          <main ref={this.mainRef} className={this.state.mainClass}>
            <AlchemySymbol />
            <header className="App-header">
              <h1 className="App-title">Jordan L. Wright</h1>
              <p className="App-intro">
                Interface Conjurer<br />
                <span className="App-intro-subtitle">Designer &amp; Engineer</span>
              </p>
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
              </nav>
            </header>
          </main>
        </div>
      </ThemeProvider>
    );
  }
}

export default App;

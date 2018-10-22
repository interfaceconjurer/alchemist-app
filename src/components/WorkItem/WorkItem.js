import React, { Component } from 'react';
import './WorkItem.css'

class WorkItem extends Component {
  constructor(){
    super();
    this.state = {
      workItemImageLoaded: false
    }
  }

  handleClick = () => {
    this.props.workItemClick(this.props.workItem);
  }

  handleLoad = () => {
    this.setState({ workItemImageLoaded: true });
  }

  getLoadingState = () => {
    if(!this.state.workItemImageLoaded){
      return <article className="loading-work-state">
                <span className="big-circle">
                  <span className="small-circle"></span>
                </span>
              </article>;
    } 
  }

  handleInput = (event) => {
    if(event.keyCode === 13 || event.keyCode === 32){
      event.target.click();
    }
  }

  render() {
    return(
      <li key={this.props.workItem.toString()}>
        {this.getLoadingState()}
        <button className={`buttonId-${this.props.workItem.id}`} onKeyUp={this.handleInput} onClick={this.handleClick}>
          <img onLoad={this.handleLoad} alt={this.props.workItem.description} src={this.props.imageSrc} />
        </button>
      </li>
    );
  } 
}
export default WorkItem;
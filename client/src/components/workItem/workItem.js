import React, { Component } from 'react';
import './workItem.css';
import LazyImage from "../lazyImage/vew";


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
                  <span className="electron-circle"></span>
                </span>
              </article>;
    } 
  }

  handleInput = (event) => {
    let needsAnimationToggle = !!(this.props.animatedGif && this.props.stillImage);
    let needsFocus = event.type === 'focus' || event.type === 'mouseover';
    let needsBlur = event.type === 'blur' || event.type === 'mouseout';
    this.handleCaption({needsFocus, needsBlur})
    this.handleAnimationToggle({needsFocus, needsBlur, needsAnimationToggle})
    if(event.keyCode === 13 || event.keyCode === 32){
      event.target.click();
    }
  }

  handleCaption = (eventType) => {
    if(eventType.needsFocus === true){
      this.refs.domButton.lastChild.classList.add('wic-show');
    }else if(eventType.needsBlur === true){
      this.refs.domButton.lastChild.classList.remove('wic-show');
    }
  }

  handleAnimationToggle = (obj) => {
    if(obj.needsFocus && obj.needsAnimationToggle){
      this.refs.domButton.classList.add('isFocused');
      this.imageElement.src = this.props.animatedGif
    } else if(obj.needsBlur && obj.needsAnimationToggle){
      this.refs.domButton.classList.remove('isFocused');
      this.imageElement.src = this.props.stillImage
    }
  }

  render() {
    return(
      <li key={this.props.workItem.toString()}>
        {this.getLoadingState()}
        <button 
          ref="domButton"
          className={`buttonId-${this.props.workItem.id}` + (this.props.animatedGif ? ' hasAnimation' : '')} 
          onMouseOver={this.handleInput} 
          onMouseOut={this.handleInput} 
          onFocus={this.handleInput} 
          onBlur={this.handleInput} 
          onKeyUp={this.handleInput} 
          onClick={this.handleClick}>
            <LazyImage 
              imageElement={node => this.imageElement = node} 
              animatedGif={this.props.animatedGif} 
              stillImage={this.props.stillImage} 
              onLoad={this.handleLoad} 
              alt={this.props.workItem.description} 
              src={this.props.imageSrc} />
              <span className='workitem-caption'>View More</span>
        </button>
      </li>
    );
  } 
}
export default WorkItem;
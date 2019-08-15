import React, { Component } from 'react';
import './processWork.css';
import TweenMax, { Elastic } from 'gsap';
import LazyImage from "../lazyImage/vew";
import WithBasicLoader from "../withBasicLoader/withBasicLoader"

class ProcessWork extends Component{
  constructor(){
    super();
    this.state = {
      workItemImageLoaded: false,
    }
  }

  handleLoad = () => {
    this.setState({ workItemImageLoaded: true });
  }

  handleInput = (event) => {
    let needsFocus = event.type === 'focus' || event.type === 'mouseover';
    let needsBlur = event.type === 'blur' || event.type === 'mouseout';
    if(needsFocus === true){
      event.currentTarget.lastChild.classList.add('pwc-show');
    }else if(needsBlur === true){
      event.currentTarget.lastChild.classList.remove('pwc-show');
    }    
  }

  handleClick = (event) => {
    const targetElement = event.currentTarget.parentNode;
    TweenMax.fromTo(targetElement, 0.6, {x:-40},
      {x:0, ease:Elastic.easeOut})
  }

  render(){
    return(
      <div className='process-work-wrap'>
            <figure className='process-work-image-holder'>
              <WithBasicLoader itemLoaded={this.state.workItemImageLoaded}>
                <button
                  onFocus={this.handleInput} 
                  onBlur={this.handleInput} 
                  onMouseOver={this.handleInput} 
                  onMouseOut={this.handleInput} 
                  onClick={this.handleClick}>
                  <LazyImage 
                    onLoad={this.handleLoad} 
                    alt={this.props.processItem.title} 
                    src={this.props.processItem.imageSrc} />
                    <figcaption className='process-work-caption'>Available Upon Request</figcaption>
                  </button>
              </WithBasicLoader>
            </figure>
            <p>{this.props.processItem.description}</p>
            <span className='process-work-disclaimer'>{this.props.processItem.disclaimer}</span>
      </div>
    )
  }
}
      
export default ProcessWork;
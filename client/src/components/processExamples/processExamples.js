import React, { Component } from 'react';
import ProcessWork from '../processWork/processWork';
import './processExamples.css';
import VisionSprint from '../../graphix/Mortgage-Lending.png';
import Mango from '../../graphix/Mango.png';
import DynamicForms from '../../graphix/Dynamic-Forms.png';
import TweenMax, { Elastic } from 'gsap';
import LazyImage from "../lazyImage/vew";
import '../workItem/workItem.css';



class ProcessExamples extends Component {
  constructor(){
    super();
    this.state = {
      workItemImageLoaded: false
    }
  }

  handleLoad = () => {
    this.setState({ workItemImageLoaded: true });
  }


  handleInput = (event) => {
    let needsFocus = event.type === 'focus' || event.type === 'mouseover';
    let needsBlur = event.type === 'blur' || event.type === 'mouseout';
    if(needsFocus === true){
      event.currentTarget.nextElementSibling.classList.add('pwc-show');
    }else if(needsBlur === true){
      event.currentTarget.nextElementSibling.classList.remove('pwc-show');
    }    
  }

  handleClick = (event) => {
    const targetElement = event.currentTarget.parentNode;
    TweenMax.fromTo(targetElement, 0.6, {x:-40},
      {x:0, ease:Elastic.easeOut})
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
  
  render(){
    return(
      <section className="process-examples-wrap">
        <h2>3 examples of work that showcase this product centric process</h2>
        <div className="process-examples">
          <ProcessWork>
            <figure className='process-work-image-holder'>
            {this.getLoadingState()}
              <button
                onFocus={this.handleInput} 
                onBlur={this.handleInput} 
                onMouseOver={this.handleInput} 
                onMouseOut={this.handleInput} 
                onClick={this.handleClick}>
                <LazyImage 
                  onLoad={this.handleLoad} 
                  alt="Mortgage Lending Vision Sprint" 
                  src={VisionSprint} />
                </button>
              <figcaption className='process-work-caption'>Available Upon Request</figcaption>
            </figure>
            <p>This Vision Sprint was dedicated to mapping out a 5 year vision for Salesforce to build out a comprehensive solution for the Mortgage Industry. </p>
            <span className='process-work-disclaimer'>Due to the sensitive nature of IP, this information can not be shared online. More information is available upon request </span>
          </ ProcessWork>
          <ProcessWork>
            <figure className='process-work-image-holder'>
            {this.getLoadingState()}
              <button
                  onFocus={this.handleInput} 
                  onBlur={this.handleInput} 
                  onMouseOver={this.handleInput} 
                  onMouseOut={this.handleInput} 
                  onClick={this.handleClick}>
                  <LazyImage 
                    onLoad={this.handleLoad} 
                    alt="Project Mango" 
                    src={Mango} />
                  </button>
              <figcaption className='process-work-caption'>Available Upon Request</figcaption>
            </figure>
            <p>Project Mango is an idea around document collection, verification, approval and providing transparency in the mortgage process. </p>
            <span className='process-work-disclaimer'>Due to the sensitive nature of IP, this information can not be shared online. More information is available upon request </span>
          </ ProcessWork>
          <ProcessWork>
            <figure className='process-work-image-holder'>
            {this.getLoadingState()}
              <button
                    onFocus={this.handleInput} 
                    onBlur={this.handleInput} 
                    onMouseOver={this.handleInput} 
                    onMouseOut={this.handleInput} 
                    onClick={this.handleClick}>
                    <LazyImage 
                      onLoad={this.handleLoad} 
                      alt="Mortgage Lending Vision Sprint" 
                      src={DynamicForms} />
                    </button>
              <figcaption className='process-work-caption'>Available Upon Request</figcaption>
            </figure>
            <p>Dynamic Forms is work I did around digitizing the Residential Loan Application in Mortgage on the Salesforce Platform.</p>
            <span className='process-work-disclaimer'>Due to the sensitive nature of IP, this information can not be shared online. More information is available upon request </span>
          </ ProcessWork>
        </div>
      </section>
    )
  }
}
export default ProcessExamples;
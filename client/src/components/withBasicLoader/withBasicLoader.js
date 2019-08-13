import React, { Component } from 'react';
import './withBasicLoader.css';


class WithBasicLoader extends Component{
 
  getLoadingState = () => {
    if(!this.props.itemLoaded){
      return <article className="loading-work-state">
                <section className="atom">
                  <span className="big-circle">
                    <span className="small-circle"></span>
                    <span className="electron-circle"></span>
                  </span>
                </section>
              </article>;
    } 
  }

  render(){
    return(
      <section className="item">
        {this.getLoadingState()}
        {this.props.children}
      </section>
    )
  }
}
export default WithBasicLoader;

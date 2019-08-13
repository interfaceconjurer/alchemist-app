import React, {Component} from 'react';
import './view.css';

class View extends Component{

  handleDataLoadingState(){
    if(!this.props.dataLoaded){
      return <section className="loading-data-state">
                <p>Loading Data from the Mother Ship... <span role="img" aria-label="UFO Space ship">🛸</span></p>
              </section>;
    } 
  }

    render(){
        return(
            <ul className="work-layout">
              {this.handleDataLoadingState()}
                {this.props.workItems}
            </ul>
        );
    }
}

export default View;
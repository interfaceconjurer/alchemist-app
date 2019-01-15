import React, { Component } from 'react';
import { withRouter } from "react-router";
import View from './View';
import WorkItem from '../WorkItem/WorkItem';
import workItemAPI from '../../workItemAPI';

class WorkLayout extends Component {
  constructor() {
    super();
    this.state = {
      data: ''
    }
  }

  componentDidMount() {
    const resolveAPIPromise = async () => {
      let data = await workItemAPI.getAllWorkItems();
      this.setState({
        data: data
      });
    }
    resolveAPIPromise();
  }

  handleClick = (workItem) => {
    this.props.history.push({
      pathname: `/workItem/${workItem.id}`
    });
  }

  getWorkItems(){
    const data = this.state.data;
    const allWork = Object.keys(data).map((workItem) => {
      // check for the highest pixel density 
      // display available
      let imageHighPixDens = data[workItem].images.hidpi ? data[workItem].images.hidpi : data[workItem].images.normal;
      let stillImageFromGif;
      let animatedGif;
      if(data[workItem].animated === true){
        // if you have an animation, see if i still image 
        // is available for default state
        stillImageFromGif = data[workItem].attachments.length > 0 ? data[workItem].attachments[0].url : "";
        animatedGif = imageHighPixDens;
      }
      // if you have a still from a gif, use that, 
      // otherwise use the highest quality image
      let imageSrc = stillImageFromGif ? stillImageFromGif : imageHighPixDens;
      return <WorkItem key={workItem.toString()} workItemClick={this.handleClick} stillImage={stillImageFromGif} animatedGif={animatedGif} workItem={data[workItem]} imageSrc={imageSrc} />
    });
    return allWork;
}
  render() {
    return ( 
      <View workItems={this.getWorkItems()} />
    );
  }
}

export default withRouter(WorkLayout);
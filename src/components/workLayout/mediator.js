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
      let imageSrc = data[workItem].images.hidpi ? data[workItem].images.hidpi : data[workItem].images.normal;
      return <WorkItem key={workItem.toString()} workItemClick={this.handleClick} workItem={data[workItem]} imageSrc={imageSrc} />
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
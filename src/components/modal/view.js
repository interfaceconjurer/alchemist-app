import React, {Component} from 'react';
import './view.css';
import Disabled from 'ally.js/src/maintain/disabled';
import TabFocus from 'ally.js/src/maintain/tab-focus';



class View extends Component{

  componentDidMount(){
    this.disableFocus = Disabled({
      context: '.main',
      filter: '.modal',
    });

    this.handleFocus = TabFocus({
      context: '.modal',
    });

    console.log(this.props.modalData);
  }

  componentWillUnmount(){
    this.handleFocus.disengage();
    this.disableFocus.disengage();
    this.props.modalData.targetSource.focus();
  }
    
    render(){
      let workItem = this.props.modalData.workItem;
      let imageSrc = workItem.images.hidpi ? workItem.images.hidpi : workItem.images.normal;
      let workItemTags = [];
      for(let i = 0;i < workItem.tags.length; i++){
        workItemTags.push(<i key={[i]}>{workItem.tags[i]}</i>);
      }
      let datePublished = new Date(workItem.published_at).toDateString();
      return (
          <div role="dialog" aria-modal="true" className="modal">
          {this.props.button}
            <img src={imageSrc} />
            <dl>
              <dt>{workItem.title}</dt>
              <dd>{workItem.description}</dd>
              <dd className="date-published">{datePublished}</dd>
            </dl>
            {workItemTags}
          </div>
      );
    }
}

export default View;
import React, {Component} from 'react';
import './view.css';
import Disabled from 'ally.js/src/maintain/disabled';
import TabFocus from 'ally.js/src/maintain/tab-focus';

class View extends Component{

  componentDidMount(){
    this.props.animateInCall();
    this.disableFocus = Disabled({
      context: '.main',
      filter: '.modal',
    });

    this.handleFocus = TabFocus({
      context: '.modal',
    });
  }

  componentWillUnmount(){
    this.handleFocus.disengage();
    this.disableFocus.disengage();
    this.props.modalData.targetSource.focus();
  }
    
    render(){
      const {workItem, imageSrc, workItemTags, datePublished} = this.props;
      return (
        <div className="modal-background">
          <div role="dialog" aria-modal="true" className="modal">
          {this.props.button}
            <img src={imageSrc} />
            {workItemTags}
            <dl>
              <dt>{workItem.title}</dt>
              <dd>{workItem.description.replace(/<\/?p[^>]*>/g, "")}</dd>
              <dd className="date-published">{datePublished}</dd>
            </dl>
          </div>
        </div>
      );
    }
}

export default View;
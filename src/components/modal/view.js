import React, {Component} from 'react';
import './View.css';
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
    let id = this.props.modalData.workItem.id;
    document.querySelector(`.buttonId-${id}`).focus();
    
  }
    
    render(){
      const {workItem, imageSrc, workItemTags, datePublished} = this.props;
      return (
        <div className="modal-background">
          <section role="dialog" aria-modal="true" className="modal">
            {this.props.buttonIcon}
            <dl>
              <dt>{workItem.title}</dt>
              <dd>{workItem.description.replace(/<\/?p[^>]*>/g, "")}</dd>
              <dd className="date-published">{datePublished}</dd>
            </dl>
            <img src={imageSrc} alt={workItem.title}/>
            <div className="tags">{workItemTags}</div>
            {this.props.button}
          </section>
        </div>
      );
    }
}

export default View;
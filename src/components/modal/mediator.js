import React, {Component} from 'react';
import View from './view';
import pubSub from '../../pubSub';
import Button from '../button/button';
import TweenMax, { Back } from 'gsap';

class Modal extends Component{
  constructor(){
    super();
    this.state = {
        visibility:false,
        modalData: '',
        modalDOMNode: ''
      }
  }
  
  componentWillMount(){
    pubSub.addListener('toggleModal', this.HandleModalUIState);
  }

  componentWillUnmount(){
    pubSub.removeListener('toggleModal', this.HandleModalUIState);
  }

  HandleModalUIState = (config) => {
    const body = document.querySelector('body');
    const modalAction = {
      'SHOW_MODAL': {
        visibility: true,
        data: config.actionConfig,
        bodyScroll: "hidden"
      },
      'HIDE_MODAL': {
        visibility: false,
        data: null,
        bodyScroll: "auto"
      }
    };
    body.style.overflow = modalAction[config.actionType].bodyScroll;
    this.setState((state) => {
      return {
        visibility: modalAction[config.actionType].visibility,
        modalData: modalAction[config.actionType].data
      }
    });
  }

  animateIn = () => {
    const modal = document.querySelector('.modal');
    this.setState({modalDOMNode: modal});
    TweenMax.to(modal, .4, {opacity:1, transform: "translateY(0)",  delay:.3, ease: Back.easeOut.config(1.7)});
  }

  animateOut = (hideModalCall) => {
    TweenMax.to(this.state.modalDOMNode, .4, {opacity:0, transform: "translateY(-10%)",  delay:0, ease: Back.easeIn.config(1.7)});
    TweenMax.delayedCall(.4, hideModalCall);
  }

  handleClick = () => {
    const hideModal = () => {
      let config = {
        actionType: 'HIDE_MODAL',
        actionConfig: this.state.modalData.targetSource
      };
      pubSub.fire('toggleModal', config);
    }
    this.animateOut(hideModal);
  }

  render(){
      
    if(this.state.visibility){
      let viewData = {};
      viewData.workItem = this.state.modalData.workItem;
      viewData.imageSrc = viewData.workItem.images.hidpi ? viewData.workItem.images.hidpi : viewData.workItem.images.normal;
      viewData.workItemTags = [];
      for(let i = 0;i < viewData.workItem.tags.length; i++){
        viewData.workItemTags.push(<i key={[i]}>{viewData.workItem.tags[i]}</i>);
      }
      viewData.datePublished = new Date(viewData.workItem.published_at).toDateString();

      const closeButton = <Button focus={true} onClick={this.handleClick} label="Close"/>;
      return (
          <View {...viewData} animateInCall={this.animateIn} modalData={this.state.modalData} button={closeButton}/>
      );
    }else{
      return null;
    }    
  }
}

export default Modal;

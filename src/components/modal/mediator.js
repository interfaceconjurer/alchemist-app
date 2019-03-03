import React, {Component} from 'react';
import { withRouter } from "react-router";
import workItemAPI from '../../workItemAPI';
import View from './view';
import PubSub from '../../pubSub';
import Button from '../button/button';
import ButtonIcon from '../buttonIcon/buttonIcon';
import Icon from '../icon/view';
import { icons } from '../iconList/iconList';

import TweenMax, { Back } from 'gsap';

class Modal extends Component{
  constructor(){
    super();
    this.state = {
        visibility:false,
        modalData: ''
      }
    this.modalDOMNode = '';
  }
  
  componentWillMount(){
    const resolveAPIPromise = async () => {
      let data = await workItemAPI.getSingleItem(this.props.match.params.id);
      let modalConfig = {
        actionType: 'SHOW_MODAL',
        actionConfig: {
          workItem: data
        }
      };
      this.HandleModalUIState(modalConfig);
    }
    resolveAPIPromise();
  }

  componentWillUnmount(){
    let modalConfig = {
      actionType: 'HIDE_MODAL',
      actionConfig: {}
    };
    PubSub.fire('toggleModal', modalConfig);
  }

  componentDidMount(){
    let modalConfig = {
      actionType: 'SHOW_MODAL',
      actionConfig: {}
    };
    PubSub.fire('toggleModal', modalConfig);
  }

  

  HandleModalUIState = (config) => {
    const modalAction = {
      'SHOW_MODAL': {
        visibility: true,
        data: config.actionConfig
      },
      'HIDE_MODAL': {
        visibility: false,
        data: null,
      }
    };
    this.setState((state) => {
      return {
        visibility: modalAction[config.actionType].visibility,
        modalData: modalAction[config.actionType].data
      }
    });
  }

  animateIn = () => {
    const main = document.querySelector('.main');
    const modal = document.querySelector('.modal');
    this.modalDOMNode = modal;
    const runGsap = () => {
      TweenMax.to(modal, .4, {autoAlpha:1, transform: "translateY(0)",  delay:0, ease: Back.easeOut.config(1.7)});
      main.removeEventListener("transitionend", runGsap);
    }
    if(this.props.history.action === "PUSH"){
      main.addEventListener("transitionend", runGsap);
    } else{
      runGsap();
    }
    
  }


  animateOut = (hideModalCall) => {
    TweenMax.to(this.modalDOMNode, .4, {autoAlpha:0, transform: "translateY(-10%)", onComplete:hideModalCall, delay:0, ease: Back.easeIn.config(1.7)});
  }

  handleClick = () => {
    const hideModal = () => {
      let config = {
        actionType: 'HIDE_MODAL',
        actionConfig: {}
      };
      PubSub.fire('toggleModal', config);
      this.props.history.goBack();
    }
    this.animateOut(hideModal);
  }

  render(){
    
    if(this.state.visibility){
      const getViewData = () => {
        let viewData = {};
        viewData.workItem = this.state.modalData.workItem;
        viewData.imageSrc = viewData.workItem.images.hidpi ? viewData.workItem.images.hidpi : viewData.workItem.images.normal;
        viewData.workItemTags = [];
        for(let i = 0;i < viewData.workItem.tags.length; i++){
          viewData.workItemTags.push(<i key={[i]}>{viewData.workItem.tags[i]}</i>);
        }
        viewData.datePublished = new Date(viewData.workItem.published_at).toDateString();
        return viewData;
      }
      const viewData = getViewData();
      const closeButton = <Button onClick={this.handleClick} label="Close"/>;
      const closeButtonIcon = <ButtonIcon focus={true} onClick={this.handleClick} title="Close Modal" icon={<Icon icon={icons.CLOSE}/>}/>;
      return (
        <View {...viewData} 
          animateInCall={this.animateIn} 
          modalData={this.state.modalData} 
          closeModal={this.handleClick} 
          buttonIcon={closeButtonIcon} 
          button={closeButton}/>
      );
    }else{
      return null;
    }    
  }
  
}
export default withRouter(Modal);

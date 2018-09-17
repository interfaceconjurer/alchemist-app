import React, {Component} from 'react';
import View from './view';
import pubSub from '../../pubSub';
import Button from '../button/button';


class Modal extends Component{
  constructor(){
    super();
    this.state = {
        visibility:false,
        modalData: ''
    }
  }
  
  componentWillMount(){
    pubSub.addListener('toggleModal', this.HandleModalUIState);
  }

  HandleModalUIState = (config) => {
    const modalAction = {
      'SHOW_MODAL': {
        visibility: true,
        data: config.actionConfig
      },
      'HIDE_MODAL': {
        visibility: false,
        data: null
      }
    };
    this.setState((state) => {
      return {
        visibility: modalAction[config.actionType].visibility,
        modalData: modalAction[config.actionType].data
      }
    });
  }

  handleClick = () => {
    let config = {
        actionType: 'HIDE_MODAL',
        actionConfig: this.state.modalData.targetSource
    };
    pubSub.fire('toggleModal', config);
  }

  render(){
    if(this.state.visibility){
      const closeButton = <Button focus={true} onClick={this.handleClick} label="Close"/>;
      return (
          <View modalData={this.state.modalData} button={closeButton}/>
      );
    }else{
      return null;
    }    
  }
}

export default Modal;

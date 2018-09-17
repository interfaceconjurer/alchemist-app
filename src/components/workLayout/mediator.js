import React, {
  Component
} from 'react';
import View from './view';
import pubSub from '../../pubSub';

class WorkLayout extends Component {
  constructor() {
    super();
    this.state = {
      data: ''
    }
  }

  componentDidMount() {
    this.fetchData();
  }

  fetchData() {
    const key = '5cecd738e40e30f52442e8753d4cd5f05148782252c87c63c62101f24fd3d6fa'
    const url = 'https://api.dribbble.com/v2/user/shots';
    fetch(url + '?access_token=' + key)
      .then((resp) => resp.json()) // Transform the data into json
      .then(data => this.setState({
        data: data
      }));
  }

  handleClick(workItem, event) {
    let modalConfig = {
      actionType: 'SHOW_MODAL',
      actionConfig: {
        workItem: workItem,
        targetSource: event.target
      }
    };
    pubSub.fire('toggleModal', modalConfig);
  }

  getWorkItems(){
    const data = this.state.data;
    if(this.state.data){
      const allWork = Object.keys(data).map((workItem) => {
        let imageSrc = data[workItem].images.hidpi ? data[workItem].images.hidpi : data[workItem].images.normal;
        return <li key={workItem.toString()}><input onClick={this.handleClick.bind(this, data[workItem])} type='image' alt={data[workItem].description} src={imageSrc} /></li>;
      });
      return allWork;
    } else{
        // create loading UI state
    }   
}

  render() {
    return ( <
      View workItems = {
        this.getWorkItems()
      }
      />
    );
  }
}

export default WorkLayout;
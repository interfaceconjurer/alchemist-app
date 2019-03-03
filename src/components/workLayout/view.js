import React, {Component} from 'react';
import './view.css';

class View extends Component{

    render(){
        return(
            <ul className="work-layout">
                {this.props.workItems}
            </ul>
        );
    }
}

export default View;
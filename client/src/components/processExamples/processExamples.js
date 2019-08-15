import React, { Component } from 'react';
import ProcessWork from '../processWork/processWork';
import './processExamples.css';
import VisionSprint from '../../graphix/Mortgage-Lending.png';
import Mango from '../../graphix/Mango.png';
import DynamicForms from '../../graphix/Dynamic-Forms.png';

class ProcessExamples extends Component {
  constructor(){
    super();
    this.state = {
      data : {
        processWorkItems : [{
          imageSrc : VisionSprint,
          title : "Mortgage Lending Vision Sprint",
          description : "This Vision Sprint was dedicated to mapping out a 5 year vision for Salesforce to build out a comprehensive solution for the Mortgage Industry.",
          disclaimer : "Due to the sensitive nature of IP, this information can not be shared online. More information is available upon request "
        },
        {
          imageSrc : Mango,
          title : "Project Mango",
          description : "Project Mango is an idea around document collection, verification, approval and providing transparency in the mortgage process.",
          disclaimer : "Due to the sensitive nature of IP, this information can not be shared online. More information is available upon request "
        },
        {
          imageSrc : DynamicForms,
          title : "Dynamic form builderd",
          description : "This Vision Sprint was dedicated to mapping out a 5 year vision for Salesforce to build out a comprehensive solution for the Mortgage Industry.",
          disclaimer : "Due to the sensitive nature of IP, this information can not be shared online. More information is available upon request "
        }]
      }
    }
  }
  
  render(){
    return(
      <section className="process-examples-wrap">
        <h2>3 examples of work that showcase this product centric process</h2>
        <div className="process-examples">
          <ProcessWork processItem={this.state.data.processWorkItems[0]} />
          <ProcessWork processItem={this.state.data.processWorkItems[1]} />
          <ProcessWork processItem={this.state.data.processWorkItems[2]} />
        </div>
      </section>
    )
  }
}
export default ProcessExamples;
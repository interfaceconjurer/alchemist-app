import React, { Component } from 'react';
import ProcessWork from '../processWork/processWork';
import './processExamples.css';
import VisionSprint from '../../graphix/Mortgage-Lending.png';
import Mango from '../../graphix/Mango.png';
import DynamicForms from '../../graphix/Dynamic-Forms.png';


class ProcessExamples extends Component {
  render(){
    return(
      <section className="process-examples-wrap">
        <h2>3 examples of work that showcase this product centric process</h2>
        <div className="process-examples">
          <ProcessWork>
            <figure className='process-work-image-holder'>
              <img tabindex="0" src={VisionSprint} alt="Mortgage Lending Vision Sprint"/>
            </figure>
            <p>This Vision Sprint was dedicated to mapping out a 5 year vision for Salesforce to build out a comprehensive solution for the Mortgage Industry. </p>
            <span className='process-work-disclaimer'>Due to the sensitive nature of IP, this information can not be shared online. More information is available upon request </span>
          </ ProcessWork>
          <ProcessWork>
            <figure className='process-work-image-holder'>
              <img tabindex="0" src={Mango} alt="Project Mango"/>
            </figure>
            <p>Project Mango is an idea around document collection, verification, approval and providing transparency in the mortgage process. </p>
            <span className='process-work-disclaimer'>Due to the sensitive nature of IP, this information can not be shared online. More information is available upon request </span>
          </ ProcessWork>
          <ProcessWork>
            <figure className='process-work-image-holder'>
              <img tabindex="0" src={DynamicForms} alt="Mortgage Lending Vision Sprint"/>
            </figure>
            <p>Dynamic Forms is work I did around digitizing the Residential Loan Application in Mortgage on the Salesforce Platform.</p>
            <span className='process-work-disclaimer'>Due to the sensitive nature of IP, this information can not be shared online. More information is available upon request </span>
          </ ProcessWork>
        </div>
      </section>
    )
  }
}
export default ProcessExamples;
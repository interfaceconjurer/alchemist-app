import React, { Component } from 'react';
import ProcessStep from '../processStep/processStep'
import './process.css';
import Icon from '../icon/view';
import { icons } from '../iconList/iconList';


class Process extends Component {
  render(){
    return(
      <section className="process-wrap">
        <h2>The Product Design Process in the Lab</h2>
        <ul className="process-wrap-ul">
          <ProcessStep>
            <figure>
              <Icon title="Atom 1" icon={icons.atom1} assistiveText="Image of atom with one proton"/>
            </figure>
            <h3>1. What problem are you solving?</h3>
            <p>This is everything. It is the most crucial piece to get right. If you are not super solid about this piece you should NOT move forward until you are G (aka solid as granite). There is little UX/design can do to make a good product if you are not squared away here. In fact, good design will highlight that this question has not been answered. You may be pushed to just "explore some designs around feature X", resist that push. Lack of a feature is not a problem. The feature is just a solution to some underlying problem. Find your problem. Know it intimately. And confirm through validation.</p>
          </ProcessStep>
          <ProcessStep>
            <figure>
              <Icon title="Atom 2" icon={icons.atom2} assistiveText="Image of atom with two protons"/>
            </figure>
            <h3>2. Who is the problem affecting?</h3>
            <p>This is about defining the characters of your story, who are they and what are their needs? What are their pains around this problem? What are their “jobs to be done”. This will define your personas. This may be consumers, customers, or your business users. In many cases in enterprise software, it will be all of the above. In that case you need to connect your customer’s goals, to their user’s needs which in turn is providing value to their customers; the consumer. Once you find the characters of your story, start talking to them to better understand their world.</p>
          </ProcessStep>
          <ProcessStep>
            <figure>
              <Icon title="Atom 3" icon={icons.atom3} assistiveText="Image of atom with three protons"/>
            </figure>
            <h3>3. What are the use-cases where this problem is manifesting?</h3>
            <p>This is where you start to map out the ecosystem of where your problem lives. What are the scenarios in which the problems you're addressing come to life? From this analysis you will start to define your moments of engagement. Around these key moments, start to dig into what are the specific flows and processes that happen around these moments and scenarios. Here you will start to get a clearer picture of how far your solution will need to reach to be effective.  </p>
          </ProcessStep>
          <ProcessStep>
            <figure>
              <Icon title="Atom 4" icon={icons.atom4} assistiveText="Image of atom with four protons"/>
            </figure>
            <h3>4. Where are the major pain points in the flows of these use-cases?</h3>
            <p>Now that you have your use-cases defined and you have started to map out these moments and user flows, start looking at where are the most pains. It's very important you do this generative research with customers and users: Validating what you have thus far, truing out your understanding, as well as having an opportunity empathize with the humans at the center of your story. These pains will become your opportunities</p>
          </ProcessStep>
          <ProcessStep>
            <figure>
              <Icon title="Atom 5" icon={icons.atom5} assistiveText="Image of atom with five protons"/>
            </figure>
            <h3>5. What are some concepts that turn these pains into opportunities?</h3>
            <p>Now that you have a comprehensive lay of the land, start sketching, writing, contemplating, whatever you do to get your creative mojo right. Your focus should be set by all your pre-work, now its time to get creative. Find inspiration, look at competitors' solutions, how have similar problems already been solved. No need to recreate the wheel, there's a time to be original, and other times a perfectly good pattern is already established. Having a comprehensive understanding of the mapping of different solutions to customer/user value will help guide you. </p>
          </ProcessStep>
          <ProcessStep>
            <figure>
              <Icon title="Atom 6" icon={icons.atom6} assistiveText="Image of atom with six protons"/>
            </figure>
            <h3>6. Is your solution providing customer value?</h3>
            <p>This is where you need to start evaluating your ideas and solutions. Understanding the value you are adding to the customer/user's world is key to knowing if you are on the right track. Iterate, evaluate, and repeat. Do this until your customers and users are delighted or at least slightly amused. Once you are on the right track and your solution is clearly providing value, what are the risks? What are the areas you have the most uncertainty about? Cross reference that with the areas that could have the most impact. Now you have a prioritized list. Continue to empathize with your users. Now go forth and make something you believe in!</p>
          </ProcessStep>
        </ul>
      </section>
    )
  }
}
export default Process;
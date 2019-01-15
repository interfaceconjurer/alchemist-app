import React, { Component } from 'react';
import LazyLoad from "vanilla-lazyload";
import './View.css';

// Only initialize it one time for the entire application
if (!document.lazyLoadInstance) {
  document.lazyLoadInstance = new LazyLoad({
    element_selector: ".lazy-load",
     load_delay: 1000,
     threshold: 0,
     class_loading: "lazy-loading",
     class_loaded: "lazy-loaded"
    });
}

class LazyImage extends Component {
  // Update lazyLoad after first rendering of every image
  componentDidMount() {
    document.lazyLoadInstance.update();
  }

  // Update lazyLoad after rerendering of every image
  componentDidUpdate() {
    document.lazyLoadInstance.update();
  }

  // Just render the image with data-src
  render() {
    const {src, onLoad, alt} = this.props;
    return (
      <img
        ref={this.props.imageElement}
        onLoad={onLoad}
        alt={alt}
        className="lazy-load"
        data-src={src}
      />
    );
  }
}

export default LazyImage;
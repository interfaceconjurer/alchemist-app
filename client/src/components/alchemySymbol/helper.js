import TweenMax, { Back, TimelineMax, Power0, Power1, RoughEase } from 'gsap';

export const _animateSymbol = (symbolElement, symbolIndex, animationEndedCall) => {

    // get all applicable classes
    const reactionClass1 = symbolElement.querySelectorAll('.reaction-class-1');
    const reactionClass2 = symbolElement.querySelectorAll('.reaction-class-2');
    const reactionClass3 = symbolElement.querySelectorAll('.reaction-class-3');
    const reactionClass4 = symbolElement.querySelectorAll('.reaction-class-4');
    const reactionClass5 = symbolElement.querySelectorAll('.reaction-class-5');
    const reactionClass6 = symbolElement.querySelectorAll('.reaction-class-6');
    const reactionClass7 = symbolElement.querySelectorAll('.reaction-class-7');
    const reactionClass8 = symbolElement.querySelectorAll('.reaction-class-8');
    const reactionClass9 = symbolElement.querySelectorAll('.reaction-class-9');
  
    const animationMethods = {

        animateSymbol_01: (symbolElement) => {

          const startLoopingAnimation = () => {
            // animate the offset circles in a loop
            const tl_reactionClass4 = new TimelineMax({transformOrigin: '50% 50%', repeat:-1, delay:.3, repeatDelay:0, ease: Power0.easeNone});
            tl_reactionClass4.to(reactionClass4, 0, {transformOrigin: '50% 50%', rotation:180})
              .to(reactionClass4, 2, {rotation:170})
              .to(reactionClass4, 2, {rotation:180}); 
            const tl_reactionClass5 = new TimelineMax({transformOrigin: '50% 50%', repeat:-1, delay:.3, repeatDelay:0, ease: Power0.easeNone});
            tl_reactionClass5.to(reactionClass5, 0, {transformOrigin: '50% 50%', rotation:0})
              .to(reactionClass5, 2, {rotation:10})
              .to(reactionClass5, 2, {rotation:0});
            // animate the triangle and base plate
            const tl_reactionClass6 = new TimelineMax({repeat:-1, delay:.3, repeatDelay:0, ease: Power0.easeNone});
            tl_reactionClass6.to(reactionClass6, 0, {x:83.8, y:0})
              .to(reactionClass6, 2, {x:83.8, y:-11})
              .to(reactionClass6, 2, {x:83.8, y:0});
            const tl_reactionClass7 = new TimelineMax({repeat:-1, delay:.3, repeatDelay:0, ease: Power0.easeNone});
            tl_reactionClass7.to(reactionClass7, 0, {x:9, y:140.7})
              .to(reactionClass7, 2, {x:9, y:129})
              .to(reactionClass7, 2, {x:9, y:140.7});
            // animate out 
            // animationMethods.exitAnimation(symbolElement);
          }
          // animate the center triangel
          TweenMax.from(reactionClass1, .6, {transformOrigin: '44.5% 45%', delay:.2, scale:.8, opacity:.6, ease:Back.easeOut.config(3)});
          // animate the circles
          TweenMax.fromTo(reactionClass2, .6, 
            {transformOrigin: '44.5% 45%', x:70, y:-10, opacity:.1}, 
            {transformOrigin: '50% 50%', x:0, y:0, delay:.4, scale:1, opacity:1,
            ease:Back.easeOut.config(2)});
          TweenMax.fromTo(reactionClass3, .6, 
              {transformOrigin: '44.5% 45%', x:-70, y:-10, opacity:.1}, 
              {transformOrigin: '50% 50%', x:0, y:0, delay:.4, opacity:1, 
              ease:Back.easeOut.config(2), onComplete: startLoopingAnimation});
        },
        animateSymbol_02: (symbolElement) => {

          const startLoopingAnimation = () => {
            // animate the sun
            const tl_reactionClass4 = new TimelineMax({repeat:-1, delay:.6, repeatDelay:0});
            tl_reactionClass4.to(reactionClass4, 2, {transformOrigin: '50% 50%', rotation:100})
              .to(reactionClass4, 2, {transformOrigin: '50% 50%', rotation:0, ease:Power1.easeIn});
            // animate the circles of triangles
            const tl_reactionClass5 = new TimelineMax({repeat:-1, delay:.6, repeatDelay:0});
            tl_reactionClass5.to(reactionClass5, 2, {transformOrigin: '50% 50%', scale:1.1})
              .to(reactionClass5, 2, {transformOrigin: '50% 50%', scale:1, ease:Power0.easeNone});
            const tl_reactionClass6 = new TimelineMax({repeat:-1, delay:.6, repeatDelay:0});
            tl_reactionClass6.to(reactionClass6, 40, {transformOrigin: '-135% 190%', rotation:360, ease:Power0.easeNone});
            const tl_reactionClass7 = new TimelineMax({repeat:-1, delay:.6, repeatDelay:0});
            tl_reactionClass7.to(reactionClass7, 30, {transformOrigin: '90% -25%', rotation:360, ease:Power0.easeNone});
            const tl_reactionClass8 = new TimelineMax({repeat:-1, delay:2, repeatDelay:3});
            tl_reactionClass8.to(reactionClass8, .2, {transformOrigin: '50% 50%', scale:1})
              .to(reactionClass8, .2, {scale:1.2, opacity:0})
              .to(reactionClass8, .2, {scale:1, opacity:1, ease:Power0.easeNone});

            // animationMethods.exitAnimation(symbolElement);
          }
          // animate the top triangles and adjacent lines
          TweenMax.from(reactionClass1, .6, {delay:.3, scale:.8, x:30, y:100, opacity:.6, ease:Back.easeOut.config(3)});
          TweenMax.from(reactionClass2, .6, {delay:.9, y:100, opacity:0, ease:Back.easeOut.config(3)});
          TweenMax.from(reactionClass3, .6, {delay:.3, scale:.8, x:40, y:170, opacity:.6, ease:Back.easeOut.config(3), onComplete: startLoopingAnimation});
        },
        animateSymbol_03: (symbolElement) => {

          const startLoopingAnimation = () => {
            // animate the center flower symbol
            const tl_reactionClass1 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass1.to(reactionClass1, 2, {transformOrigin: '50% 50%', scale:.95, rotation:100})
              .to(reactionClass1, 2, {transformOrigin: '50% 50%', rotation:0, scale:1, ease:Power1.easeIn});
            const tl_reactionClass3 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass3.to(reactionClass3, 2, {transformOrigin: '50% 50%', opacity:0, ease:RoughEase.ease.config({ template:  Power0.easeNone, strength: 1, points: 20, taper: "none", randomize:  true, clamp: false})})
              .to(reactionClass3, 2, {transformOrigin: '50% 50%', opacity:1, ease:RoughEase.ease.config({ template:  Power0.easeNone, strength: 1, points: 20, taper: "none", randomize:  true, clamp: false})});           
            const tl_reactionClass2 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass2.to(reactionClass2, 2, {transformOrigin: '50% 50%', scale:2.7})
              .to(reactionClass2, 2, {transformOrigin: '50% 50%', scale:1, ease:Power1.easeIn});
            
            // animationMethods.exitAnimation(symbolElement);
          }


          TweenMax.from(reactionClass1, .6, {transformOrigin: '50% 50%', delay:.3, scale:.4, opacity:0, ease:Back.easeOut.config(3)});
          TweenMax.from(reactionClass2, .6, {transformOrigin: '50% 50%', delay:.6, scale:.2, ease:Back.easeOut.config(6), onComplete: startLoopingAnimation});


        },
        animateSymbol_04: (symbolElement) => {
          const startLoopingAnimation = () => {
            // animate the center flower symbol
            const tl_reactionClass3 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass3.to(reactionClass3, 2, {transformOrigin: '50% 50%', rotation:30})
              .to(reactionClass3, 2, {transformOrigin: '50% 50%', rotation:0});
            const tl_reactionClass4 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass4.to(reactionClass4, 2, {transformOrigin: '50% 50%', opacity:0, ease:RoughEase.ease.config({ template:  Power0.easeNone, strength: 1, points: 20, taper: "none", randomize:  true, clamp: false})})
              .to(reactionClass4, 2, {transformOrigin: '50% 50%', opacity:1, ease:RoughEase.ease.config({ template:  Power0.easeNone, strength: 1, points: 20, taper: "none", randomize:  true, clamp: false})});           
            const tl_reactionClass5 = new TimelineMax({repeat:-1, delay:1, repeatDelay:0});
            tl_reactionClass5.to(reactionClass5, 2, {transformOrigin: '50% 50%', opacity:0, ease:RoughEase.ease.config({ template:  Power0.easeNone, strength: 1, points: 20, taper: "none", randomize:  true, clamp: false})})
              .to(reactionClass5, 2, {transformOrigin: '50% 50%', opacity:1, ease:RoughEase.ease.config({ template:  Power0.easeNone, strength: 1, points: 20, taper: "none", randomize:  true, clamp: false})});           
            const tl_reactionClass6 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass6.to(reactionClass6, 10, {transformOrigin: '130% 180%', rotation:360, ease:Power0.easeNone});
            const tl_reactionClass7 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass7.to(reactionClass7, 10, {transformOrigin: '200% 100%', rotation:-360, ease:Power0.easeNone});
            const tl_reactionClass8 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass8.to(reactionClass8, 2, {transformOrigin: '50% 50%', scale:1.32, ease:Power0.easeNone})
            .to(reactionClass8, 2, {transformOrigin: '50% 50%', scale:1, ease:Power0.easeNone});               
            const tl_reactionClass9 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass9.to(reactionClass9, 10, {transformOrigin: '85% 100%', rotation:-360, ease:Power0.easeNone});
            
            // animationMethods.exitAnimation(symbolElement);
          }


          TweenMax.from(reactionClass1, .6, {transformOrigin: '50% 50%', delay:.3, scale:.2, opacity:0, ease:Back.easeOut.config(3)});
          TweenMax.from(reactionClass2, .6, {transformOrigin: '50% 50%', delay:.5, scale:.9, opacity:0, ease:Back.easeOut.config(3), onComplete: startLoopingAnimation});

        },
        animateSymbol_05: (symbolElement) => {

          const startLoopingAnimation = () => {
            // animate the two offset circles in a loop
            const tl_reactionClass1 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0, ease:Power0.easeNone});
            tl_reactionClass1.to(reactionClass1, 2, {transformOrigin: '44.5% 46.9%', rotation:59})
            .to(reactionClass1, 2, {transformOrigin: '44.5% 46.9%', rotation:-0});
            const tl_reactionClass3 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0, ease:Power0.easeNone});
            tl_reactionClass3.to(reactionClass3, 2, {transformOrigin: '50% 50%', y:-24.5, x:51})
            .to(reactionClass3, 2, {transformOrigin: '50% 50%', y:-6.5, x:17});
            const tl_reactionClass4 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0, ease:Power0.easeNone});
            tl_reactionClass4.to(reactionClass4, 2, {transformOrigin: '50% 50%', y:-27, x:-11})
            .to(reactionClass4, 2, {transformOrigin: '50% 50%', y:-6.5, x:17});
            const tl_reactionClass5 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0, ease:Power0.easeNone});
            tl_reactionClass5.to(reactionClass5, 2, {transformOrigin: '50% 50%', y:27, x:11})
            .to(reactionClass5, 2, {transformOrigin: '50% 50%', y:-6.5, x:17});
            
            
            // animationMethods.exitAnimation(symbolElement);
          }

          TweenMax.from(reactionClass1, .6, {transformOrigin: '50% 50%', delay:.4, scale:.7, opacity:0, ease:Back.easeOut.config(3)});
          TweenMax.from(reactionClass2, .6, {transformOrigin: '50% 50%', delay:.9, scale:.2, opacity:0, ease:Back.easeOut.config(6), onComplete: startLoopingAnimation});
          TweenMax.from(reactionClass6, .6, {transformOrigin: '50% 50%', delay:.4, opacity:0, ease:Back.easeOut.config(3)});

        },
        animateSymbol_06: (symbolElement) => {
          
          const startLoopingAnimation = () => {
            // animate the two offset circles in a loop
            const tl_reactionClass3 = new TimelineMax({repeat:-1, delay:.3, repeatDelay:0, ease: Power0.easeNone});
            tl_reactionClass3.to(reactionClass3, 0, {x:0, y:0})
              .to(reactionClass3, 2, {x:12, y:-12})
              .to(reactionClass3, 2, {x:0, y:0});
            const tl_reactionClass2 = new TimelineMax({repeat:-1, delay:.3, repeatDelay:0, ease: Power0.easeNone});
            tl_reactionClass2.to(reactionClass2, 0, {x:0, y:0})
              .to(reactionClass2, 2, {x:-12, y:12})
              .to(reactionClass2, 2, {x:0, y:0});
            const tl_reactionClass4 = new TimelineMax({repeat:-1, delay:.3, repeatDelay:0, ease: Power0.easeNone});
            tl_reactionClass4.to(reactionClass4, 0, {opacity:1})
              .to(reactionClass4, 2, {opacity:.1})
              .to(reactionClass4, 2, {opacity:1});

            // animationMethods.exitAnimation(symbolElement);
          }
          // animate the center circle
          TweenMax.from(reactionClass1, .6, {transformOrigin: '44.5% 45%', delay:.2, scale:.8, opacity:.6, ease:Back.easeOut.config(3)});
          // animate the 2 offset center circles
          TweenMax.fromTo(reactionClass2, .6, 
              {transformOrigin: '44.5% 45%', x:50, y:-50, scale:.1, opacity:.1}, 
              {transformOrigin: '50% 50%', x:0, y:0, delay:.4, scale:1, opacity:1,
              ease:Back.easeOut.config(2)});
          TweenMax.fromTo(reactionClass3, .6, 
              {transformOrigin: '44.5% 45%', x:-50, y:50, scale:.1, opacity:.1}, 
              {transformOrigin: '50% 50%', x:0, y:0, delay:.4, scale:1, opacity:1, 
              ease:Back.easeOut.config(2), onComplete: startLoopingAnimation});
        },
        animateSymbol_07: (symbolElement) => {
          const startLoopingAnimation = () => {
            // animate the two offset circles in a loop
            const tl_reactionClass3 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0, ease:Power0.easeNone});
            tl_reactionClass3.to(reactionClass3, 8, {transformOrigin: '50% 67%', rotation:180, ease:Power0.easeNone});
            const tl_reactionClass4 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass4.to(reactionClass4, 2, {transformOrigin: '50% 50%', opacity:0, scale:1.3, ease:Power0.easeNone})
              .to(reactionClass4, 2, {transformOrigin: '50% 50%', opacity:1, scale:1, ease:Power0.easeNone});

            // animationMethods.exitAnimation(symbolElement);
          }

          TweenMax.from(reactionClass1, .6, {transformOrigin: '50% 50%', delay:.4, scale:.7, opacity:0, ease:Back.easeOut.config(3)});
          TweenMax.from(reactionClass2, .6, {transformOrigin: '50% 50%', delay:.8, scale:.8, opacity:0, ease:Back.easeOut.config(6), onComplete: startLoopingAnimation});
        },
        animateSymbol_08: (symbolElement) => {
          const startLoopingAnimation = () => {
            const tl_reactionClass3 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0, ease:Power0.easeNone});
            tl_reactionClass3.to(reactionClass3, 15, {transformOrigin: '50% 50%', rotation:360, ease:Power0.easeNone});
            const tl_reactionClass4 = new TimelineMax({repeat:-1, delay:0, repeatDelay:0});
            tl_reactionClass4.to(reactionClass4, 2, {transformOrigin: '50% 50%', scale:1.25, ease:Power0.easeNone})
              .to(reactionClass4, 2, {transformOrigin: '50% 50%', scale:1, ease:Power0.easeNone});
            // animationMethods.exitAnimation(symbolElement);
          }

          TweenMax.from(reactionClass1, .6, {transformOrigin: '50% 50%', delay:.4, scale:.7, opacity:0, ease:Back.easeOut.config(3)});
          TweenMax.from(reactionClass2, .6, {transformOrigin: '50% 50%', delay:.8, scale:.2, opacity:0, ease:Back.easeOut.config(6), onComplete: startLoopingAnimation});


        },
        exitAnimation: (symbolElement) => {
          TweenMax.to(symbolElement, .6, 
            {scale:0, rotation:-30, opacity:0,ease:Back.easeIn.config(1.7), onComplete: animationEndedCall});
        }
        
    };
      // animate the whole symbol first
      TweenMax.fromTo(symbolElement, .6, {scale:0, rotation:-180, opacity:0}, 
        {scale:1, rotation:0.01, opacity:1, force3D:true, ease:Back.easeOut.config(1.7)});

      animationMethods['animateSymbol_0' + symbolIndex](symbolElement);

      return animationMethods.exitAnimation;
}

export default {
    animateSymbol: _animateSymbol  
}
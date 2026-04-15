import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './VegetableBasket.css';

gsap.registerPlugin(ScrollTrigger);

const VegetableBasket = () => {
  const basketRef = useRef(null);
  const vegetablesRef = useRef([]);

  useEffect(() => {
    const basket = basketRef.current;

    // Initial entrance animation
    gsap.from(basket, {
      scale: 0,
      rotation: -180,
      duration: 1.2,
      ease: 'elastic.out(1, 0.5)',
      delay: 0.3,
    });

    // Scroll-based parallax animation
    ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        
        // Move basket down as user scrolls
        gsap.to(basket, {
          y: progress * window.innerHeight * 0.5,
          rotation: progress * 15,
          scale: 1 - (progress * 0.2),
          duration: 0.3,
          ease: 'none'
        });
        
        // Fade out at 80% scroll
        if (progress > 0.8) {
          gsap.to(basket, {
            opacity: 1 - ((progress - 0.8) * 5),
            scale: 1 - ((progress - 0.8) * 2),
            duration: 0.3
          });
        } else {
          gsap.to(basket, {
            opacity: 1,
            duration: 0.3
          });
        }
      }
    });

    // Individual vegetable animations
    vegetablesRef.current.forEach((veg, index) => {
      if (!veg) return;

      // Continuous floating animation
      gsap.to(veg, {
        y: '+=15',
        rotation: '+=5',
        duration: gsap.utils.random(2, 4),
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
        delay: index * 0.2
      });

      // Hover interaction
      veg.addEventListener('mouseenter', () => {
        gsap.to(veg, {
          scale: 1.3,
          rotation: gsap.utils.random(-15, 15),
          duration: 0.3,
          ease: 'back.out(1.7)'
        });
      });

      veg.addEventListener('mouseleave', () => {
        gsap.to(veg, {
          scale: 1,
          rotation: 0,
          duration: 0.3
        });
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div ref={basketRef} className="vegetable-basket">
      <div className="basket">🧺</div>
      
      <div 
        ref={el => vegetablesRef.current[0] = el}
        className="vegetable" 
        style={{ top: '20%', left: '15%' }}
      >
        🥕
      </div>
      
      <div 
        ref={el => vegetablesRef.current[1] = el}
        className="vegetable" 
        style={{ top: '15%', right: '20%' }}
      >
        🍌
      </div>
      
      <div 
        ref={el => vegetablesRef.current[2] = el}
        className="vegetable" 
        style={{ top: '35%', left: '25%' }}
      >
        🍎
      </div>
      
      <div 
        ref={el => vegetablesRef.current[3] = el}
        className="vegetable" 
        style={{ top: '40%', right: '25%' }}
      >
        🍅
      </div>
      
      <div 
        ref={el => vegetablesRef.current[4] = el}
        className="vegetable" 
        style={{ top: '28%', left: '50%', transform: 'translateX(-50%)' }}
      >
        🥭
      </div>

      {/* Spilling grains animation */}
      <div className="spilling-grains">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i}
            className="grain-particle"
            style={{
              left: `${i * 8 - 40}px`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default VegetableBasket;

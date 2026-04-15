import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './RiceGrainBackground.css';

gsap.registerPlugin(ScrollTrigger);

const RiceGrainBackground = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const grainConfig = {
      count: 100,
      layers: [
        { opacity: 0.15, speed: 1.0, blur: 1 },
        { opacity: 0.2, speed: 0.7, blur: 0.5 },
        { opacity: 0.25, speed: 0.4, blur: 0 },
      ],
      size: { min: 5, max: 15 },
      duration: { min: 15, max: 35 },
      xVariation: 40,
    };

    const grains = [];

    // Create grains for each layer
    grainConfig.layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < grainConfig.count / 3; i++) {
        const grain = document.createElement('div');
        grain.className = `rice-grain grain-layer-${layerIndex}`;
        
        const size = gsap.utils.random(grainConfig.size.min, grainConfig.size.max);
        const startX = gsap.utils.random(0, 100);
        
        grain.style.cssText = `
          position: fixed;
          width: ${size}px;
          height: ${size * 2.5}px;
          background: rgba(255, 255, 255, ${layer.opacity});
          border-radius: 50%;
          pointer-events: none;
          z-index: -${layerIndex + 1};
          left: ${startX}%;
          bottom: -20px;
          opacity: 0;
          will-change: transform, opacity;
          backface-visibility: hidden;
          transform: translateZ(0);
          ${layer.blur > 0 ? `filter: blur(${layer.blur}px);` : ''}
        `;
        
        container.appendChild(grain);
        grains.push({ element: grain, layer, layerIndex });
      }
    });

    // Animate each grain infinitely
    grains.forEach(({ element, layer }, index) => {
      const duration = gsap.utils.random(grainConfig.duration.min, grainConfig.duration.max) / layer.speed;
      const xDrift = gsap.utils.random(-grainConfig.xVariation, grainConfig.xVariation);
      const rotation = gsap.utils.random(0, 360);
      const delay = gsap.utils.random(0, 8);
      
      // Create infinite animation
      const tl = gsap.timeline({ repeat: -1 });
      
      tl.to(element, {
        y: -window.innerHeight - 200,
        x: `+=${xDrift}`,
        rotation: rotation,
        opacity: 1,
        duration: duration,
        ease: 'none',
      })
      .set(element, {
        y: 0,
        x: 0,
        opacity: 0,
      });
      
      tl.delay(delay);
    });

    // Scroll-triggered speed boost
    ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const velocity = self.getVelocity();
        if (Math.abs(velocity) > 100) {
          const speedMultiplier = 1.5 + Math.min(Math.abs(velocity) / 1000, 2);
          grains.forEach(({ element }) => {
            gsap.to(element, {
              timeScale: speedMultiplier,
              duration: 0.3,
              overwrite: 'auto'
            });
          });
        } else {
          grains.forEach(({ element }) => {
            gsap.to(element, {
              timeScale: 1,
              duration: 0.5,
              overwrite: 'auto'
            });
          });
        }
      }
    });

    return () => {
      grains.forEach(({ element }) => element.remove());
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="rice-grain-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -10,
      }}
    />
  );
};

export default RiceGrainBackground;

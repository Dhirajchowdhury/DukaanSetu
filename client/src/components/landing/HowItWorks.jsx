import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './HowItWorks.css';

gsap.registerPlugin(ScrollTrigger);

const HowItWorks = () => {
  const timelineRef = useRef(null);
  const lineProgressRef = useRef(null);
  const stepsRef = useRef([]);

  const steps = [
    { 
      number: 'Step 1', 
      title: 'Sign Up Free', 
      description: 'Create your account in seconds. No credit card required.',
      icon: '✨'
    },
    { 
      number: 'Step 2', 
      title: 'Scan Products', 
      description: 'Use your phone camera to scan barcodes and add products instantly.',
      icon: '📱'
    },
    { 
      number: 'Step 3', 
      title: 'Track Inventory', 
      description: 'Monitor stock levels, expiry dates, and sales in real-time.',
      icon: '📊'
    },
    { 
      number: 'Step 4', 
      title: 'Get Alerts', 
      description: 'Receive smart notifications for low stock and expiring products.',
      icon: '🔔'
    },
  ];

  useEffect(() => {
    const timeline = timelineRef.current;
    const lineProgress = lineProgressRef.current;
    const stepElements = stepsRef.current;

    // Animate timeline line on scroll
    gsap.to(lineProgress, {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: timeline,
        start: 'top 60%',
        end: 'bottom 80%',
        scrub: 1,
      }
    });

    // Animate each step
    stepElements.forEach((step, index) => {
      if (!step) return;

      gsap.to(step, {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: step,
          start: 'top 75%',
          onEnter: () => {
            step.classList.add('active');
            
            // Pulse icon animation
            const icon = step.querySelector('.step-icon');
            gsap.fromTo(icon, 
              { scale: 0.8, opacity: 0 },
              { 
                scale: 1, 
                opacity: 1, 
                duration: 0.5,
                ease: 'back.out(1.7)'
              }
            );
          }
        }
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section className="how-it-works">
      <div className="how-it-works-container">
        <h2>How It Works</h2>
        
        <div className="timeline" ref={timelineRef}>
          <div className="timeline-line">
            <div ref={lineProgressRef} className="timeline-line-progress" />
          </div>
          
          {steps.map((step, index) => (
            <div 
              key={index} 
              ref={el => stepsRef.current[index] = el}
              className="step-item"
              style={{ transform: 'translateX(-30px)' }}
            >
              <div className="step-dot" />
              <div className="step-content">
                <div className="step-header">
                  <div className="step-icon">{step.icon}</div>
                  <div>
                    <div className="step-number">{step.number}</div>
                    <h3 className="step-title">{step.title}</h3>
                  </div>
                </div>
                <p className="step-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

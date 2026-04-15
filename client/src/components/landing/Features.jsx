import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Features.css';

gsap.registerPlugin(ScrollTrigger);

const FeatureCard = ({ title, description, icon, size, gradient, index }) => {
  const cardRef = useRef(null);
  const iconRef = useRef(null);
  const blobRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    const iconEl = iconRef.current;

    // Entrance animation
    gsap.from(card, {
      opacity: 0,
      y: 60,
      duration: 0.8,
      delay: index * 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
      },
    });

    // Blob morphing animation
    if (blobRef.current) {
      gsap.to(blobRef.current, {
        attr: {
          d: 'M40,-60C52.3,-53.7,63.2,-42.5,69.5,-29C75.8,-15.5,77.5,0.3,73.3,14.3C69.1,28.3,59,40.5,46.8,49.7C34.7,58.8,20.5,65,-0.2,65.3C-20.8,65.7,-41.7,60.2,-54.8,50.5C-68,40.8,-73.5,26.8,-74.3,12.5C-75.2,-1.8,-71.5,-16.5,-63.8,-28.8C-56.2,-41.2,-44.7,-51.2,-32.2,-57.3C-19.7,-63.3,-6.2,-65.5,6.8,-74.8C19.8,-84.2,27.7,-66.3,40,-60Z'
        },
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }

    // Hover effects
    const handleMouseEnter = () => {
      gsap.to(card, {
        y: -12,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        duration: 0.3,
        ease: 'power2.out'
      });

      gsap.to(iconEl, {
        scale: 1.2,
        rotation: 10,
        duration: 0.4,
        ease: 'back.out(1.7)'
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        y: 0,
        boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
        duration: 0.3
      });

      gsap.to(iconEl, {
        scale: 1,
        rotation: 0,
        duration: 0.3
      });
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [index]);

  return (
    <div ref={cardRef} className={`feature-card feature-${size}`}>
      <svg className="blob-container" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradient.start} stopOpacity="0.2" />
            <stop offset="100%" stopColor={gradient.end} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          ref={blobRef}
          d="M45,-65C58.7,-58.3,70.3,-44.9,76.8,-29.2C83.4,-13.5,84.9,4.5,80.1,20.3C75.3,36.1,64.2,49.8,50.5,58.9C36.7,68,20.3,72.5,3.7,67.3C-12.9,62.1,-25.8,47.2,-39.7,37.8C-53.6,28.4,-68.5,24.5,-76.2,14.3C-83.9,4.1,-84.4,-12.4,-78.1,-26.7C-71.8,-41,-58.7,-53.1,-44.3,-59.5C-29.9,-65.9,-14.9,-66.7,0.3,-67.1C15.6,-67.6,31.2,-71.7,45,-65Z"
          fill={`url(#grad-${index})`}
        />
      </svg>

      <div className="card-content">
        <div ref={iconRef} className="icon">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};

const Features = () => {
  const sectionRef = useRef(null);

  const features = [
    {
      id: 1,
      title: 'Barcode Scanner',
      description: 'Lightning-fast scanning with your phone camera. Add products in seconds.',
      icon: '📱',
      size: 'large',
      gradient: { start: '#8AA624', end: '#6B8519' }
    },
    {
      id: 2,
      title: 'Expiry Alerts',
      description: 'Never waste stock again with smart notifications.',
      icon: '⏰',
      size: 'small',
      gradient: { start: '#FEA405', end: '#E59400' }
    },
    {
      id: 3,
      title: 'Categories',
      description: 'Organize products your way with custom tags.',
      icon: '🗂️',
      size: 'small',
      gradient: { start: '#B87C4C', end: '#9A6A3F' }
    },
    {
      id: 4,
      title: 'Real-time Analytics',
      description: 'Track sales trends, inventory value, and performance metrics at a glance.',
      icon: '📊',
      size: 'wide',
      gradient: { start: '#DBE4C9', end: '#C5D5B3' }
    }
  ];

  return (
    <section className="features-section" ref={sectionRef}>
      <div className="features-container">
        <div className="section-header">
          <h2 className="section-title">
            Everything You Need. <span className="highlight">Nothing You Don't.</span>
          </h2>
          <p className="section-subtitle">
            Powerful features designed specifically for general store owners
          </p>
        </div>

        <div className="bento-grid">
          {features.map((feature, index) => (
            <FeatureCard key={feature.id} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

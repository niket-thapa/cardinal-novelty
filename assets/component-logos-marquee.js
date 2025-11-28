class LogosMarquee {
  constructor() {
    this.sections = document.querySelectorAll('.logos-marquee-section');
    this.init();
  }

  init() {
    this.sections.forEach(section => {
      this.setupMarquee(section);
    });
    
    // Add mobile-specific initialization
    this.setupMobileOptimizations();
  }
  
  setupMobileOptimizations() {
    // Check if we're on a mobile device
    const isMobile = window.innerWidth <= 749;
    
    if (isMobile) {
      // Add mobile-specific optimizations
      this.sections.forEach(section => {
        const track = section.querySelector('[data-marquee-track]');
        if (track) {
          // Ensure the track is properly initialized for mobile
          track.style.willChange = 'transform';
          track.style.transform = 'translateZ(0)';
          track.style.backfaceVisibility = 'hidden';
          
          // Check for RTL and apply mobile RTL animation only on mobile
          const isRTL = document.documentElement.dir === 'rtl' || section.closest('[dir="rtl"]');
          if (isRTL && isMobile) {
            track.style.setProperty('animation-name', 'marquee-scroll-mobile-rtl', 'important');
            track.style.setProperty('animation-duration', '20s', 'important');
            track.style.setProperty('animation-timing-function', 'linear', 'important');
            track.style.setProperty('animation-iteration-count', 'infinite', 'important');
          }
        }
      });
      
      // Pause animations when page is not visible (battery saving)
      document.addEventListener('visibilitychange', () => {
        this.sections.forEach(section => {
          const track = section.querySelector('[data-marquee-track]');
          if (track) {
            if (document.hidden) {
              track.style.animationPlayState = 'paused';
            } else {
              track.style.animationPlayState = 'running';
            }
          }
        });
      });
    }
  }

  setupMarquee(section) {
    const track = section.querySelector('[data-marquee-track]');
    const content = section.querySelector('.logos-marquee__content');
    
    if (!track || !content) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      this.setupScrollableMarquee(track, content);
      return;
    }

    // Setup continuous marquee
    this.setupContinuousMarquee(track, content, section);
  }

  setupContinuousMarquee(track, content, section) {
    const speed = parseInt(section.dataset.marqueeSpeed) || 120;
    const pauseOnHover = section.dataset.pauseOnHover === 'true';
    
    // Check if RTL
    const isRTL = document.documentElement.dir === 'rtl' || section.closest('[dir="rtl"]');
    
    // Check if mobile device
    const isMobile = window.innerWidth <= 749;
    
    // Calculate animation duration based on content width
    // We want to move exactly 1/4 of the content width (one set of logos)
    const contentWidth = content.scrollWidth;
    const containerWidth = track.parentElement.offsetWidth;
    const totalDistance = contentWidth / 4; // Move one set of logos
    
    // Use different calculation for mobile vs desktop
    let duration;
    if (isMobile) {
      // On mobile, use a fixed faster duration for better performance
      duration = 20; // 20 seconds for mobile
    } else {
      duration = (totalDistance / containerWidth) * speed;
    }
    
    // Apply dynamic duration with higher precision
    track.style.animationDuration = `${duration.toFixed(2)}s`;
    
    // Apply RTL animation if needed
    if (isRTL) {
      if (isMobile) {
        track.style.animationName = 'marquee-scroll-mobile-rtl';
        track.style.setProperty('animation-name', 'marquee-scroll-mobile-rtl', 'important');
      } else {
        track.style.animationName = 'marquee-scroll-rtl';
      }
    } else if (isMobile) {
      track.style.animationName = 'marquee-scroll-mobile';
    }
    
    // Force hardware acceleration on mobile
    if (isMobile) {
      track.style.transform = 'translateZ(0)';
      track.style.backfaceVisibility = 'hidden';
      
      // Debug: Log animation name for troubleshooting
      console.log('Marquee Debug:', {
        isRTL,
        isMobile,
        animationName: track.style.animationName,
        computedAnimation: getComputedStyle(track).animationName,
        windowWidth: window.innerWidth
      });
    }
    
    // Setup pause on hover (only for desktop)
    if (pauseOnHover && !isMobile) {
      section.addEventListener('mouseenter', () => {
        track.style.animationPlayState = 'paused';
      });
      
      section.addEventListener('mouseleave', () => {
        track.style.animationPlayState = 'running';
      });
    }

    // Handle visibility change (pause when tab is not visible)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        track.style.animationPlayState = 'paused';
      } else {
        track.style.animationPlayState = 'running';
      }
    });
    
    // Handle resize events to recalculate on orientation change
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.setupContinuousMarquee(track, content, section);
      }, 250);
    });
  }

  setupScrollableMarquee(track, content) {
    // For users who prefer reduced motion, make it horizontally scrollable
    track.style.animation = 'none';
    track.style.overflowX = 'auto';
    track.style.scrollbarWidth = 'none';
    track.style.msOverflowStyle = 'none';
    
    // Hide scrollbar
    const style = document.createElement('style');
    style.textContent = `
      .logos-marquee__track::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }


  // Method to refresh marquee (useful for dynamic content)
  refresh() {
    this.sections.forEach(section => {
      const track = section.querySelector('[data-marquee-track]');
      if (track) {
        track.style.animation = 'none';
        track.offsetHeight; // Trigger reflow
        track.style.animation = null;
      }
    });
  }

  // Method to pause all marquees
  pause() {
    this.sections.forEach(section => {
      const track = section.querySelector('[data-marquee-track]');
      if (track) {
        track.style.animationPlayState = 'paused';
      }
    });
  }

  // Method to resume all marquees
  resume() {
    this.sections.forEach(section => {
      const track = section.querySelector('[data-marquee-track]');
      if (track) {
        track.style.animationPlayState = 'running';
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new LogosMarquee();
  });
} else {
  new LogosMarquee();
}

// Export for potential external use
window.LogosMarquee = LogosMarquee;

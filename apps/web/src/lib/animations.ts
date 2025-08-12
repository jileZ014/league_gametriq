// Animation utilities for Gametriq Basketball League Platform
// NBA 2K × ESPN fusion design system

export const animations = {
  // Entrance animations
  slideIn: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  
  scaleUp: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { 
      duration: 0.3, 
      ease: [0.68, -0.55, 0.265, 1.55] // Overshoot easing
    }
  },
  
  // State change animations
  pulseGlow: {
    animate: {
      boxShadow: [
        '0 0 16px var(--glow-color)',
        '0 0 32px var(--glow-color)',
        '0 0 16px var(--glow-color)'
      ]
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  
  countUp: {
    initial: { y: 10, opacity: 0 },
    animate: { 
      y: [10, -2, 0],
      opacity: 1 
    },
    transition: { 
      duration: 0.6, 
      ease: 'easeOut',
      times: [0, 0.5, 1]
    }
  },
  
  // Sport-specific animations
  scoreCelebration: {
    animate: {
      scale: [1, 1.2, 1.1, 1.15, 1],
      rotate: [0, 5, -5, 3, 0]
    },
    transition: {
      duration: 0.8,
      ease: 'easeInOut',
      times: [0, 0.25, 0.5, 0.75, 1]
    }
  },
  
  gameStart: {
    initial: { scale: 0, rotate: 180, opacity: 0 },
    animate: { 
      scale: [0, 1.1, 1],
      rotate: [180, 90, 0],
      opacity: 1
    },
    transition: {
      duration: 0.6,
      ease: 'easeOut',
      times: [0, 0.5, 1]
    }
  },
  
  victory: {
    animate: {
      y: [0, -20, 0, -10, 0]
    },
    transition: {
      duration: 1,
      repeat: 3,
      ease: 'easeInOut',
      times: [0, 0.25, 0.5, 0.75, 1]
    }
  },
  
  // Loading animations
  shimmer: {
    animate: {
      backgroundPosition: ['-1000px 0', '1000px 0']
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear'
    }
  },
  
  spin: {
    animate: {
      rotate: 360
    },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// Timing functions
export const easings = {
  linear: 'linear',
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  overshoot: [0.68, -0.55, 0.265, 1.55],
  spring: [0.175, 0.885, 0.32, 1.275],
  sharp: [0.4, 0, 0.6, 1]
};

// Duration scale
export const durations = {
  instant: 0.1,   // 100ms - Immediate feedback
  fast: 0.2,      // 200ms - Quick transitions
  normal: 0.3,    // 300ms - Standard animations
  slow: 0.5,      // 500ms - Deliberate movements
  slower: 0.7,    // 700ms - Complex sequences
  slowest: 1.0    // 1000ms - Major transitions
};

// Animation variants for common patterns
export const variants = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  },
  
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: durations.normal,
        ease: easings.easeOut
      }
    }
  },
  
  hover: {
    rest: { scale: 1 },
    hover: { 
      scale: 1.02,
      transition: {
        duration: durations.fast,
        ease: easings.easeOut
      }
    },
    tap: { 
      scale: 0.98,
      transition: {
        duration: durations.instant,
        ease: easings.easeIn
      }
    }
  }
};

// Performance optimization utilities
export const willChange = {
  transform: 'transform',
  opacity: 'opacity',
  auto: 'auto'
};

// Reduced motion utilities
export const reducedMotion = {
  instant: {
    duration: 0.01,
    delay: 0
  },
  essential: {
    duration: 0.2,
    delay: 0
  }
};

// Animation helper functions
export const getReducedMotion = (animation: any) => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return {
      ...animation,
      transition: reducedMotion.instant
    };
  }
  return animation;
};

export const staggerChildren = (delay: number = 0.05, count: number = 10) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: delay,
      staggerDirection: 1,
      delayChildren: delay * 2
    }
  }
});

export const createPulse = (color: string = 'var(--primary)') => ({
  animate: {
    boxShadow: [
      `0 0 0 0 ${color}`,
      `0 0 0 10px transparent`
    ]
  },
  transition: {
    duration: 1,
    repeat: Infinity
  }
});

// Export all for convenience
export default {
  animations,
  easings,
  durations,
  variants,
  willChange,
  reducedMotion,
  getReducedMotion,
  staggerChildren,
  createPulse
};
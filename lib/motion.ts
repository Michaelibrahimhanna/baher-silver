import { Variants } from 'framer-motion';

// Standardized easing curve for the luxury aesthetic
// A slow, elegant ease-out that feels weighty but fluid.
export const luxuryEasing: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Standardized durations
export const duration = {
  fast: 0.3,
  base: 0.6,
  slow: 1.2,
  epic: 2.0,
};

// Reusable transition configuration
export const luxuryTransition = {
  duration: duration.base,
  ease: luxuryEasing,
};

// Standard Reveal Variants (Fade up)
export const revealVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: luxuryTransition
  },
};

// Staggered Container Variants
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

// Image Hover Variants for product cards
export const imageHoverVariants: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.05, 
    transition: { duration: duration.slow, ease: luxuryEasing } 
  },
};

'use client';

import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-sans tracking-[0.15em] uppercase transition-all duration-500 focus:outline-none overflow-hidden relative group';
    
    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-white',
      outline: 'border border-primary/30 text-primary hover:border-primary hover:bg-primary/5',
      ghost: 'bg-transparent text-foreground hover:text-primary',
    };

    const sizes = {
      sm: 'h-10 px-6 text-[10px]',
      md: 'h-12 px-8 text-[11px]',
      lg: 'h-14 px-12 text-[12px]',
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={classes}
        {...props}
      >
        <span className="relative z-10 transition-colors duration-500 group-hover:text-black">{props.children}</span>
        {variant === 'primary' && (
          <div className="absolute inset-0 bg-white translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-0" />
        )}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

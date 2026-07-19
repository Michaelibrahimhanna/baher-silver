'use client';

import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none';
    
    const variants = {
      primary: 'bg-brand-black text-brand-white hover:bg-brand-black/60',
      secondary: 'bg-brand-gray-soft text-brand-black hover:bg-brand-black/60 hover:text-brand-white',
      outline: 'border border-brand-black text-brand-black hover:bg-brand-black hover:text-brand-white',
      ghost: 'bg-transparent text-brand-black hover:text-brand-black/60 hover:bg-brand-gray-soft/50',
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-12 px-8 text-base',
      lg: 'h-14 px-10 text-lg',
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={classes}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

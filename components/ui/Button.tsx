import * as React from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'default' | 'lg';
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', loading = false, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    // Base luxury styling
    let classes = 'inline-flex items-center justify-center whitespace-nowrap text-xs tracking-widest uppercase transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.98] relative overflow-hidden ';
    
    // Variants
    if (variant === 'primary') {
      classes += 'bg-primary text-primary-foreground hover:bg-white hover:text-black shadow-[0_4px_20px_rgba(0,0,0,0.05)] ';
    } else if (variant === 'secondary' || variant === 'outline') {
      classes += 'bg-transparent border border-border text-foreground hover:border-primary hover:bg-primary/5 active:bg-primary/10 ';
    } else if (variant === 'ghost') {
      classes += 'bg-transparent text-foreground relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-primary after:transition-all after:duration-[400ms] hover:after:w-full ';
    }

    if (loading) {
      classes += 'text-transparent hover:text-transparent transition-none ';
    }

    // Sizes (Ghost doesn't use standard padding)
    if (variant !== 'ghost') {
      if (size === 'default') classes += 'h-12 px-8 ';
      if (size === 'lg') classes += 'h-14 px-10 text-sm ';
    } else {
      classes += 'py-2 px-0 '; // Ghost just needs minimal vertical padding for the underline effect
    }

    return (
      <Comp
        className={`${classes} ${className}`}
        ref={ref}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center text-primary-foreground pointer-events-none">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </span>
        )}
        <Slottable>{props.children}</Slottable>
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button };

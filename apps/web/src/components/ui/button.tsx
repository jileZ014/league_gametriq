import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles - accessibility and touch-friendly design
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 touch-target',
  {
    variants: {
      variant: {
        // Primary button - basketball orange theme
        default: 'bg-basketball-orange-500 text-white hover:bg-basketball-orange-600 shadow-elevation-2 hover:shadow-elevation-3',
        
        // Destructive actions (cancellations, deletions)
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-elevation-2 hover:shadow-elevation-3',
        
        // Outline button for secondary actions
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-elevation-1 hover:shadow-elevation-2',
        
        // Secondary button
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-elevation-1 hover:shadow-elevation-2',
        
        // Ghost button for subtle actions
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        
        // Link-style button
        link: 'text-primary underline-offset-4 hover:underline',

        // Basketball-specific variants
        'team-home': 'bg-team-home-primary text-white hover:bg-team-home-dark shadow-elevation-2 hover:shadow-elevation-3',
        'team-away': 'bg-team-away-primary text-white hover:bg-team-away-dark shadow-elevation-2 hover:shadow-elevation-3',
        'game-live': 'bg-game-live text-white hover:bg-game-live/90 shadow-live-glow animate-live-pulse',
        'emergency': 'bg-red-600 text-white hover:bg-red-700 shadow-emergency-glow touch-target-large font-semibold',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-md px-10 text-base',
        icon: 'h-10 w-10',
        
        // Basketball-specific sizes
        'touch-friendly': 'h-12 px-6 text-base', // For courtside use
        'emergency': 'h-16 px-8 text-lg', // Large emergency buttons
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : 'button'
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!loading && leftIcon && (
          <span className="mr-2 flex items-center" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        {children}
        
        {!loading && rightIcon && (
          <span className="ml-2 flex items-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
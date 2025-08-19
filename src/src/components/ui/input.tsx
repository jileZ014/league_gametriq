import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-green-500 focus-visible:ring-green-500',
      },
      size: {
        default: 'h-10',
        sm: 'h-9',
        lg: 'h-11',
        'touch-friendly': 'h-12 text-base', // For mobile/touch interfaces
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: boolean
  success?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, error, success, type, ...props }, ref) => {
    // Determine variant based on props
    const effectiveVariant = error ? 'error' : success ? 'success' : variant

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant: effectiveVariant, size, className }))}
        ref={ref}
        aria-invalid={error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input, inputVariants }
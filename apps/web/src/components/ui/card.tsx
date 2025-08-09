import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-elevation-1',
  {
    variants: {
      variant: {
        default: 'border-border',
        basketball: 'border-basketball-orange-200 bg-basketball-orange-50/50',
        team: 'border-team-home-light bg-team-home-light/10',
        game: 'border-game-live/30 bg-game-live/5',
        heat: 'border-heat-orange/30 bg-heat-orange/5',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
      },
      interactive: {
        false: '',
        true: 'cursor-pointer hover:shadow-elevation-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
      interactive: false,
    },
  }
)

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & 
  VariantProps<typeof cardVariants> & {
    interactive?: boolean
  }
>(({ className, variant, padding, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant, padding, interactive, className }))}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Basketball-specific variants
        'game-live': 'border-transparent bg-game-live text-white animate-live-pulse',
        'game-scheduled': 'border-transparent bg-game-scheduled text-white',
        'game-completed': 'border-transparent bg-game-completed text-white',
        'heat-green': 'border-transparent bg-heat-green text-white',
        'heat-yellow': 'border-transparent bg-heat-yellow text-yellow-900',
        'heat-orange': 'border-transparent bg-heat-orange text-white',
        'heat-red': 'border-transparent bg-heat-red text-white',
        'team-home': 'border-transparent bg-team-home-primary text-white',
        'team-away': 'border-transparent bg-team-away-primary text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
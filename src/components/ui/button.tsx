import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none'
    const variants = {
      default: 'bg-primary text-primary-foreground hover:opacity-90',
      outline: 'border bg-background hover:bg-muted',
      ghost: 'hover:bg-muted'
    }
    const sizes = {
      sm: 'h-8 px-2',
      md: 'h-9 px-3',
      lg: 'h-10 px-4'
    }
    return <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  }
)
Button.displayName = 'Button'

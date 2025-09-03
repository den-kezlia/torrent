import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'outline' }

export function Badge({ className, variant = 'default', ...props }: Props) {
  const variants = {
    default: 'bg-muted text-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border'
  }
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs', variants[variant], className)} {...props} />
  )
}

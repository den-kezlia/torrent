import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { normalizeStatus, prettyStatus } from '@/lib/utils'

type Props = HTMLAttributes<HTMLSpanElement> & {
  status: string | null | undefined
}

export function StatusBadge({ status, className, ...rest }: Props) {
  const norm = normalizeStatus(status)
  const base = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs'
  const color =
    norm === 'VISITED'
      ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
      : norm === 'IN_PROGRESS'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
        : norm === 'PLANNED'
          ? 'bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300'
          : 'bg-muted text-muted-foreground'
  return (
    <span className={cn(base, color, className)} {...rest}>
      {prettyStatus(status)}
    </span>
  )
}

export default StatusBadge

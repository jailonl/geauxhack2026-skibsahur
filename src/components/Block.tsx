// A side block, like the blocks down the sides of a Moodle page: a pixel-framed box with a title bar.
import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export default function Block({ id, title, action, children, className }: {
  id: string
  title: ReactNode
  action?: ReactNode // small link or control on the right of the title bar
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby={id} className={cn('border border-border bg-card', className)}>
      <div className="flex items-center justify-between gap-2 bg-secondary px-3 py-2">
        <h2 id={id} className="font-display flex items-center gap-2 text-xs uppercase tracking-wider text-primary">{title}</h2>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

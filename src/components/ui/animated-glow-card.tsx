import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface GlowCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function CardCanvas({ children, className, ...props }: GlowCardProps) {
  return (
    <div className={cn('card-canvas', className)} {...props}>
      <div className="card-backdrop" aria-hidden="true" />
      {children}
    </div>
  );
}

function Card({ children, className, ...props }: GlowCardProps) {
  return (
    <div className={cn('glow-card', className)} {...props}>
      <span className="border-element border-top" aria-hidden="true" />
      <span className="border-element border-right" aria-hidden="true" />
      <span className="border-element border-bottom" aria-hidden="true" />
      <span className="border-element border-left" aria-hidden="true" />
      <div className="card-content">{children}</div>
    </div>
  );
}

export { Card, CardCanvas };

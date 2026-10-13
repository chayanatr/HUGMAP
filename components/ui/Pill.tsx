import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type PillTone = 'success' | 'warning' | 'danger' | 'brand';

const tones: Record<PillTone, string> = {
  success: 'bg-success-soft text-success font-medium',
  warning: 'bg-warning-soft text-warning font-medium',
  danger: 'bg-danger-soft text-danger-text font-medium',
  brand: 'bg-brand-soft text-brand-hover font-semibold',
};

export function Pill({ tone = 'success', small, className, children }: { tone?: PillTone; small?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-block rounded-pill', small ? 'px-1.5 py-px text-[11px]' : 'px-2.5 py-[3px] text-[12px]', tones[tone], className)}>
      {children}
    </span>
  );
}

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = { selected?: boolean } & HTMLAttributes<HTMLDivElement>;

/** การ์ดขาว radius 16 · selected = ring 2px เขียว */
export function Card({ selected, className, ...rest }: CardProps) {
  return <div className={cn('rounded-card bg-surface shadow-card', selected && 'shadow-selected', className)} {...rest} />;
}

/** ป้าย 11px เหนือค่า 12–13px */
export function LabelValue({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-label">{label}</div>
      <div className="text-value text-ink tabular-nums">{children}</div>
    </div>
  );
}

/** การ์ดลอยพื้นเขียวเข้ม */
export function DarkCard({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card bg-dark p-3.5 text-white shadow-dark', className)} {...rest} />;
}

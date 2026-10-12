import Link from 'next/link';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Props = {
  icon: string;
  label: string; // aria-label (ภาษาไทย)
  variant?: 'outline' | 'primary';
  href?: string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

/** 40px บน tablet/desktop, 44px บน mobile */
export function IconButton({ icon, label, variant = 'outline', href, className, type = 'button', ...rest }: Props) {
  const cls = cn(
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-input transition-colors focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50 md:h-10 md:w-10',
    variant === 'primary' ? 'bg-brand text-white hover:bg-brand-hover' : 'border border-line-border bg-surface text-brand hover:bg-bg',
    className,
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={cls}>
        <Icon name={icon} className="text-[20px]" />
      </Link>
    );
  }
  return (
    <button type={type} aria-label={label} title={label} className={cls} {...rest}>
      <Icon name={icon} className="text-[20px]" />
    </button>
  );
}

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'outline' | 'soft' | 'danger' | 'dark-outline' | 'light';

const base =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'h-11 rounded-input bg-brand px-5 text-[14px] font-semibold text-white hover:bg-brand-hover',
  outline: 'h-11 rounded-input border border-line-border bg-surface px-4 text-[14px] text-ink hover:bg-bg',
  soft: 'h-11 rounded-[8px] bg-brand-soft px-3 text-[13px] font-semibold text-brand-hover hover:bg-brand-ring md:h-9',
  danger: 'h-11 rounded-input px-3 text-[14px] text-danger-text hover:bg-danger-soft',
  'dark-outline': 'h-11 rounded-input border border-dark-line px-4 text-[14px] text-white hover:bg-dark-field',
  light: 'h-11 rounded-input bg-surface px-4 text-[14px] font-semibold text-brand-deep hover:bg-brand-soft',
};

type Props = {
  variant?: ButtonVariant;
  icon?: string;
  iconAfter?: string;
  href?: string;
  className?: string;
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

export function Button({ variant = 'primary', icon, iconAfter, href, className, children, type = 'button', ...rest }: Props) {
  const cls = cn(base, variants[variant], className);
  const content = (
    <>
      {icon && <Icon name={icon} className="text-[18px]" />}
      {children}
      {iconAfter && <Icon name={iconAfter} className="text-[18px]" />}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} {...rest}>
      {content}
    </button>
  );
}

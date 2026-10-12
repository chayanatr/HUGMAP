import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Props = {
  label?: string;
  required?: boolean;
  /** field = ช่องกรอกในฟอร์ม (44px) · pill = ตัวกรองบนแผง (36px) */
  variant?: 'field' | 'pill';
  options: { value: string; label: string }[];
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>;

export function Select({ label, required, variant = 'field', options, id, ...rest }: Props) {
  const auto = useId();
  const fid = id ?? auto;
  const pill = variant === 'pill';
  return (
    <div className={cn('flex flex-col gap-1.5', pill && 'inline-flex')}>
      {label && (
        <label htmlFor={fid} className="text-[12px] font-medium text-muted">
          {label}
          {required && ' *'}
        </label>
      )}
      <div className="relative">
        <select
          id={fid}
          className={cn(
            'w-full cursor-pointer appearance-none rounded-input border border-line-border text-ink outline-none transition-shadow focus:border-brand focus:shadow-focus',
            pill ? 'h-11 bg-surface pl-2.5 pr-8 text-[13px] md:h-9' : 'h-11 bg-panel pl-3.5 pr-9 text-[15px] focus:bg-surface',
          )}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="expand_more" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-muted" />
      </div>
    </div>
  );
}

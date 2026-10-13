import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const field =
  'w-full rounded-input border bg-panel px-3.5 text-[15px] text-ink outline-none transition-shadow placeholder:text-placeholder focus:border-brand focus:bg-surface focus:shadow-focus';

/** invalid = ขอบแดงโดยไม่แสดงข้อความ (ใช้เมื่อหลายช่องแชร์ข้อความ error เดียว) */
type Common = { label?: string; error?: string; required?: boolean; invalid?: boolean };

export function Input({ label, error, invalid, required, className, id, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fid} className="text-[12px] font-medium text-muted">
          {label}
          {required && ' *'}
        </label>
      )}
      <input
        id={fid}
        aria-invalid={!!error || !!invalid}
        aria-describedby={error ? `${fid}-err` : undefined}
        className={cn(field, 'h-11', error || invalid ? 'border-danger' : 'border-line-border', className)}
        {...rest}
      />
      {error && (
        <span id={`${fid}-err`} role="alert" className="text-[12px] text-danger-text">
          {error}
        </span>
      )}
    </div>
  );
}

export function Textarea({ label, error, required, className, id, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fid} className="text-[12px] font-medium text-muted">
          {label}
          {required && ' *'}
        </label>
      )}
      <textarea
        id={fid}
        aria-invalid={!!error}
        className={cn(field, 'min-h-[96px] py-3 leading-[1.6]', error ? 'border-danger' : 'border-line-border', className)}
        {...rest}
      />
      {error && (
        <span role="alert" className="text-[12px] text-danger-text">
          {error}
        </span>
      )}
    </div>
  );
}

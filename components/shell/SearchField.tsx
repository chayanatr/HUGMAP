import type { InputHTMLAttributes } from 'react';
import { Icon } from '@/components/ui/Icon';

/** ช่องค้นหาไม่มีกรอบ ใช้ในแถบบนของ panel */
export function SearchField({ label, ...rest }: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Icon name="search" className="text-[22px] text-label" />
      <input
        type="search"
        aria-label={label}
        className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-placeholder"
        {...rest}
      />
    </div>
  );
}

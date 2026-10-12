import { cn } from '@/lib/cn';

/** Material Symbols Rounded — ขนาดกำหนดด้วย class เช่น text-[18px] */
export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn('icon select-none', className)}>
      {name}
    </span>
  );
}

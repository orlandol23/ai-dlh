import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  /** Wallet address or any string used to derive a deterministic gradient. */
  seed: string;
  size?: number;
  className?: string;
  label?: string;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const Avatar = ({ seed, size = 40, className, label }: AvatarProps) => {
  const gradient = useMemo(() => {
    const h = hashString(seed || 'aidlh');
    const a = h % 360;
    const b = (a + 60 + (h % 120)) % 360;
    const c = (a + 180 + (h % 80)) % 360;
    return `conic-gradient(from ${h % 360}deg, hsl(${a} 80% 60%), hsl(${b} 80% 55%), hsl(${c} 80% 60%), hsl(${a} 80% 60%))`;
  }, [seed]);

  return (
    <span
      role="img"
      aria-label={label ?? `Avatar for ${seed}`}
      className={cn(
        'inline-block rounded-full border border-border shadow-sm',
        className
      )}
      style={{
        width: size,
        height: size,
        background: gradient,
      }}
    />
  );
};

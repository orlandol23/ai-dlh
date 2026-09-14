import { cn } from '@/lib/utils';

interface AvatarProps {
  /** Wallet address or any string used to derive a deterministic mark. */
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
  const hash = hashString(seed || 'aidlh');
  const mark = (hash % 4) + 2;

  // When no explicit label is provided, the avatar is decorative — the wallet
  // address is rendered next to it, so announcing "Avatar for 0x…" is redundant.
  const isDecorative = !label;

  return (
    <span
      role={isDecorative ? 'presentation' : 'img'}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-sm border border-primary/40 bg-primary/10',
        className
      )}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className="block rounded-[1px] bg-primary"
        style={{ width: size * 0.32, height: size * (0.35 + mark * 0.05) }}
      />
    </span>
  );
};

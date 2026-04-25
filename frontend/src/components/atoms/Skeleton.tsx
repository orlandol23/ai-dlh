import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn('skeleton rounded-md bg-muted', className)}
      aria-hidden="true"
      {...props}
    />
  );
};

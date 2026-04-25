import type { ComponentPropsWithoutRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

interface TabsListProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.List> {}

export const TabsList = ({ className, ...props }: TabsListProps) => (
  <TabsPrimitive.List
    className={cn(
      'inline-flex items-center gap-1 border-b border-border',
      className
    )}
    {...props}
  />
);

interface TabsTriggerProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {}

export const TabsTrigger = ({ className, ...props }: TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      'relative px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
      'hover:text-foreground focus-visible:outline-none focus-visible:text-foreground',
      'data-[state=active]:text-foreground',
      'after:absolute after:left-0 after:right-0 after:-bottom-px after:h-0.5 after:bg-primary after:scale-x-0 after:transition-transform after:duration-200',
      'data-[state=active]:after:scale-x-100',
      className
    )}
    {...props}
  />
);

interface TabsContentProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {}

export const TabsContent = ({ className, ...props }: TabsContentProps) => (
  <TabsPrimitive.Content
    className={cn('mt-4 focus-visible:outline-none', className)}
    {...props}
  />
);

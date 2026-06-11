import { Toaster as SonnerToaster, toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

export const Toaster = () => {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'bg-card text-foreground border border-border rounded-lg shadow-md font-sans',
          description: 'text-muted-foreground',
          actionButton:
            'bg-primary text-primary-foreground rounded-md text-xs px-2 py-1',
          cancelButton: 'bg-muted text-foreground rounded-md text-xs px-2 py-1',
        },
      }}
    />
  );
};

// Re-exporting sonner's `toast` next to the component is intentional: every
// consumer imports both from this single module. The only cost is that Fast
// Refresh falls back to a full reload for this file, which is acceptable.
// eslint-disable-next-line react-refresh/only-export-components
export { toast };

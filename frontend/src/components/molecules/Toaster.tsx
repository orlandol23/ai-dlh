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

export { toast };

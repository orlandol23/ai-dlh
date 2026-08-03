import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { isLearningStyle } from '@/lib/vark';
import { Button } from '@/components/atoms/Button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/molecules/Dialog';
import { trpc } from '@/lib/trpc';
import { toast } from '@/components/molecules/Toaster';
import { useAuthStore } from '@/store/authStore';

/**
 * PreferencesPanel — gear-icon dialog letting the user toggle AI tier
 * (default Gemini Flash vs premium Claude Sonnet 4.6).
 *
 * Locale is already controlled via LanguageSelector in the header; this
 * panel only persists the *server-side* preference for AI generation, so
 * the next `generateModule` call routes to the correct provider.
 */
export function PreferencesPanel() {
  const { t } = useTranslation('auth');
  const { t: tVark } = useTranslation('vark');
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const rawLearningStyle = user?.learningStyle;
  const learningStyle = isLearningStyle(rawLearningStyle) ? rawLearningStyle : null;
  const [tier, setTier] = useState<'default' | 'premium'>(
    (user?.preferredTier as 'default' | 'premium') ?? 'default',
  );

  const updateMutation = trpc.auth.updatePreferences.useMutation({
    onSuccess: (updated) => {
      setUser(updated);
      toast.success(t('preferences.savedTitle'), {
        description: t('preferences.savedDescription'),
      });
    },
    onError: (error) => {
      toast.error(t('preferences.errorTitle'), { description: error.message });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t('preferences.open')}>
          <Settings className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('preferences.title')}</DialogTitle>
          <DialogDescription>{t('preferences.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <fieldset className="space-y-3">
            <legend className="font-semibold">{t('preferences.tier.legend')}</legend>
            <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-muted">
              <input
                type="radio"
                name="tier"
                value="default"
                checked={tier === 'default'}
                onChange={() => setTier('default')}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{t('preferences.tier.default.label')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('preferences.tier.default.description')}
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-muted">
              <input
                type="radio"
                name="tier"
                value="premium"
                checked={tier === 'premium'}
                onChange={() => setTier('premium')}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{t('preferences.tier.premium.label')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('preferences.tier.premium.description')}
                </div>
              </div>
            </label>
          </fieldset>

          {/* VARK learning style — quiz lives at /vark; here we only show
              the current style and offer to (re)take the questionnaire. */}
          <div className="space-y-2 border-t border-border pt-4">
            <p className="font-semibold">{tVark('preferences.legend')}</p>
            <p className="text-sm text-muted-foreground">
              {learningStyle
                ? tVark('preferences.current', {
                    style: tVark(`styles.${learningStyle}.name`),
                  })
                : tVark('preferences.notTaken')}
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/vark')}>
              {learningStyle ? tVark('preferences.retake') : tVark('preferences.take')}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">{t('preferences.cancel')}</Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate({ preferredTier: tier })}
            disabled={updateMutation.isLoading}
          >
            {updateMutation.isLoading ? t('preferences.saving') : t('preferences.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

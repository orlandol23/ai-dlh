import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Card, CardContent } from '@/components/atoms/Card';

const STORAGE_KEY = 'ai_dlh_onboarded';
const STEPS = ['generator', 'sparkline', 'onchain'] as const;
type StepId = (typeof STEPS)[number];

const PADDING = 8;
const TOOLTIP_WIDTH = 320;

export function OnboardingTour() {
  const { t } = useTranslation('dashboard');
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Trigger on first dashboard visit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    // delay so layout settles before measuring
    const id = window.setTimeout(() => setActive(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  // Measure target element for current step
  useEffect(() => {
    if (!active) return;
    const measure = () => {
      const stepId: StepId = STEPS[stepIndex];
      const target = document.querySelector<HTMLElement>(`[data-onboarding="${stepId}"]`);
      if (!target) {
        setRect(null);
        return;
      }
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      // wait one frame for scroll to settle, then measure
      requestAnimationFrame(() => setRect(target.getBoundingClientRect()));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [stepIndex, active, reduce]);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setActive(false);
  };

  const next = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
    else finish();
  };

  if (!active) return null;

  const stepId = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // Tooltip position: prefer below target, fall back to centered
  let tooltipStyle: React.CSSProperties;
  if (rect) {
    const top = Math.min(rect.bottom + 16, window.innerHeight - 220);
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2),
      window.innerWidth - TOOLTIP_WIDTH - 16,
    );
    tooltipStyle = { position: 'fixed', top, left, width: TOOLTIP_WIDTH, zIndex: 51 };
  } else {
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: TOOLTIP_WIDTH,
      zIndex: 51,
    };
  }

  return (
    <AnimatePresence>
      {/* Spotlight: 4 dimmed divs creating a hole around the target rect */}
      {rect ? (
        <>
          <motion.div
            key="ovr-top"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="fixed inset-x-0 top-0 z-50 bg-foreground/70"
            style={{ height: Math.max(0, rect.top - PADDING) }}
            aria-hidden="true"
          />
          <motion.div
            key="ovr-bottom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-foreground/70"
            style={{ top: rect.bottom + PADDING }}
            aria-hidden="true"
          />
          <motion.div
            key="ovr-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="fixed left-0 z-50 bg-foreground/70"
            style={{
              top: rect.top - PADDING,
              height: rect.height + PADDING * 2,
              width: Math.max(0, rect.left - PADDING),
            }}
            aria-hidden="true"
          />
          <motion.div
            key="ovr-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="fixed right-0 z-50 bg-foreground/70"
            style={{
              top: rect.top - PADDING,
              height: rect.height + PADDING * 2,
              left: rect.right + PADDING,
            }}
            aria-hidden="true"
          />
        </>
      ) : (
        <motion.div
          key="ovr-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          className="fixed inset-0 z-50 bg-foreground/70"
          aria-hidden="true"
        />
      )}

      {/* Tooltip card */}
      <motion.div
        key="tooltip"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
        style={tooltipStyle}
        role="dialog"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-body"
      >
        <Card className="shadow-lg border-primary/40">
          <CardContent className="pt-6 space-y-3">
            <p className="eyebrow font-mono text-xs">
              {stepIndex + 1} / {STEPS.length}
            </p>
            <h3 id="onboarding-title" className="font-display text-lg font-semibold tracking-tight">
              {t(`onboarding.${stepId}.title`)}
            </h3>
            <p id="onboarding-body" className="text-sm text-muted-foreground">
              {t(`onboarding.${stepId}.body`)}
            </p>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={finish}>
                {t('onboarding.skip')}
              </Button>
              <Button size="sm" onClick={next}>
                {isLast ? t('onboarding.start') : t('onboarding.next')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

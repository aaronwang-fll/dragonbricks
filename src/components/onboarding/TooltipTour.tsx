import { useEffect, useState, useCallback } from 'react';
import { useOnboardingStore, type TutorialStep } from '../../stores/onboardingStore';

interface TooltipProps {
  step: TutorialStep;
  onNext: () => void;
  onDismiss: () => void;
  isLast: boolean;
}

function Tooltip({ step, onNext, onDismiss, isLast }: TooltipProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    arrowPosition: 'top' | 'bottom' | 'left' | 'right';
  } | null>(null);

  useEffect(() => {
    if (!step.targetSelector) return;

    const calculatePosition = () => {
      const target = document.querySelector(step.targetSelector!);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const padding = 12;
      const tooltipWidth = 280;
      const tooltipHeight = 150;

      const pos = step.position || 'bottom';
      let top: number;
      let left: number;
      let arrowPosition: 'top' | 'bottom' | 'left' | 'right';

      switch (pos) {
        case 'top':
          top = rect.top - tooltipHeight - padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowPosition = 'bottom';
          break;
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowPosition = 'top';
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - padding;
          arrowPosition = 'right';
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + padding;
          arrowPosition = 'left';
          break;
        default:
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowPosition = 'top';
      }

      // Keep tooltip within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < 10) left = 10;
      if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10;
      if (top < 10) top = 10;
      if (top + tooltipHeight > viewportHeight - 10) top = viewportHeight - tooltipHeight - 10;

      setPosition({ top, left, arrowPosition });
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [step]);

  if (!position) return null;

  const arrowStyles: Record<string, string> = {
    top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-white',
    bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-t-white border-b-transparent',
    left: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-transparent border-b-transparent border-l-transparent border-r-white',
    right: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-transparent border-b-transparent border-l-white border-r-transparent',
  };

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4"
      style={{
        top: position.top,
        left: position.left,
        width: 280,
      }}
    >
      {/* Arrow */}
      <div
        className={`absolute w-0 h-0 border-8 ${arrowStyles[position.arrowPosition]}`}
      />

      <h4 className="font-semibold text-gray-900 mb-1">{step.title}</h4>
      <p className="text-sm text-gray-600 mb-3">{step.description}</p>

      <div className="flex justify-between items-center">
        <button
          onClick={onDismiss}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Don't show again
        </button>
        <button
          onClick={onNext}
          className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          {isLast ? 'Done' : 'Got it'}
        </button>
      </div>
    </div>
  );
}

export function TooltipTour() {
  const {
    showTooltipTour,
    currentTooltipStep,
    tutorialSteps,
    dismissedTooltips,
    nextTooltip,
    dismissTooltip,
    endTooltipTour,
  } = useOnboardingStore();

  // Filter steps with targets that haven't been dismissed
  const stepsWithTargets = tutorialSteps.filter(
    (s) => s.targetSelector && !dismissedTooltips.has(s.id)
  );

  const currentStep = stepsWithTargets[currentTooltipStep];

  const handleNext = useCallback(() => {
    if (currentStep) {
      dismissTooltip(currentStep.id);
    }
    nextTooltip();
  }, [currentStep, dismissTooltip, nextTooltip]);

  const handleDismiss = useCallback(() => {
    if (currentStep) {
      dismissTooltip(currentStep.id);
    }
    endTooltipTour();
  }, [currentStep, dismissTooltip, endTooltipTour]);

  if (!showTooltipTour || !currentStep) return null;

  return (
    <Tooltip
      step={currentStep}
      onNext={handleNext}
      onDismiss={handleDismiss}
      isLast={currentTooltipStep === stepsWithTargets.length - 1}
    />
  );
}

/**
 * Single contextual tooltip that appears on hover/focus
 */
interface ContextualTooltipProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function ContextualTooltip({
  id,
  title,
  description,
  children,
  position = 'bottom',
}: ContextualTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { dismissedTooltips, dismissTooltip } = useOnboardingStore();

  if (dismissedTooltips.has(id)) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          className={`
            absolute z-50 bg-gray-900 text-white rounded-lg p-3 shadow-lg
            ${position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : ''}
            ${position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : ''}
            ${position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : ''}
            ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''}
          `}
          style={{ width: 220 }}
        >
          <div className="font-medium mb-1">{title}</div>
          <div className="text-sm text-gray-300">{description}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissTooltip(id);
              setIsVisible(false);
            }}
            className="mt-2 text-xs text-gray-400 hover:text-white"
          >
            Don't show again
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hint badge that shows a number for new features
 */
interface HintBadgeProps {
  id: string;
  count?: number;
  children: React.ReactNode;
}

export function HintBadge({ id, count = 1, children }: HintBadgeProps) {
  const { dismissedTooltips, dismissTooltip } = useOnboardingStore();

  if (dismissedTooltips.has(id)) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      {children}
      <span
        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center cursor-pointer"
        onClick={() => dismissTooltip(id)}
        title="Click to dismiss"
      >
        {count}
      </span>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useOnboardingStore } from '../../stores/onboardingStore';

export function Tutorial() {
  const {
    showTutorial,
    currentTutorialStep,
    tutorialSteps,
    nextTutorialStep,
    previousTutorialStep,
    skipTutorial,
  } = useOnboardingStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const currentStep = tutorialSteps[currentTutorialStep];

  // Find and track target element
  useEffect(() => {
    if (!showTutorial || !currentStep?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const findTarget = () => {
      const target = document.querySelector(currentStep.targetSelector!);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    findTarget();

    // Re-find on resize
    window.addEventListener('resize', findTarget);
    return () => window.removeEventListener('resize', findTarget);
  }, [showTutorial, currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!showTutorial) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTutorial();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextTutorialStep();
      } else if (e.key === 'ArrowLeft') {
        previousTutorialStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTutorial, nextTutorialStep, previousTutorialStep, skipTutorial]);

  const getTooltipPosition = useCallback(() => {
    if (!targetRect) {
      // Center on screen
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const position = currentStep?.position || 'bottom';
    const padding = 16;

    switch (position) {
      case 'top':
        return {
          top: `${targetRect.top - padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translate(-50%, 0)',
        };
      case 'left':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - padding}px`,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: 'translate(0, -50%)',
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  }, [targetRect, currentStep]);

  if (!showTutorial) return null;

  const isFirstStep = currentTutorialStep === 0;
  const isLastStep = currentTutorialStep === tutorialSteps.length - 1;
  const progress = ((currentTutorialStep + 1) / tutorialSteps.length) * 100;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tutorial">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Spotlight highlight */}
      {targetRect && (
        <div
          className="absolute border-4 border-blue-400 rounded-lg shadow-lg pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-white rounded-lg shadow-xl max-w-sm p-4 z-10"
        style={getTooltipPosition()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="text-xs text-gray-500 mb-2">
          Step {currentTutorialStep + 1} of {tutorialSteps.length}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {currentStep?.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">{currentStep?.description}</p>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={skipTutorial}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip tutorial
          </button>

          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={previousTutorialStep}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Back
              </button>
            )}
            <button
              onClick={nextTutorialStep}
              className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
          Use arrow keys or Enter to navigate, Esc to skip
        </div>
      </div>
    </div>
  );
}

/**
 * Welcome dialog shown on first visit
 */
export function WelcomeDialog() {
  const { hasCompletedTutorial, startTutorial, skipTutorial } = useOnboardingStore();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Show welcome dialog on first visit
    if (!hasCompletedTutorial) {
      setShowWelcome(true);
    }
  }, [hasCompletedTutorial]);

  if (!showWelcome) return null;

  const handleStartTutorial = () => {
    setShowWelcome(false);
    startTutorial();
  };

  const handleSkip = () => {
    setShowWelcome(false);
    skipTutorial();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md p-6 mx-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🤖</div>
          <h2 id="welcome-title" className="text-2xl font-bold text-gray-900">
            Welcome to DragonBricks!
          </h2>
          <p className="text-gray-600 mt-2">
            Program LEGO SPIKE Prime robots using natural language. No coding experience required!
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-xl">💬</span>
            <div>
              <div className="font-medium text-gray-900">Natural Language</div>
              <div className="text-sm text-gray-600">
                Type commands like "move forward 100mm"
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <span className="text-xl">⚡</span>
            <div>
              <div className="font-medium text-gray-900">Instant Conversion</div>
              <div className="text-sm text-gray-600">
                Automatically converts to Python code
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <span className="text-xl">📱</span>
            <div>
              <div className="font-medium text-gray-900">Direct Upload</div>
              <div className="text-sm text-gray-600">
                Send programs to your robot via Bluetooth
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleStartTutorial}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            Take the Tour
          </button>
        </div>
      </div>
    </div>
  );
}

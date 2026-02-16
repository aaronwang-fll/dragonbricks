import { useEffect, useCallback, useState } from 'react';
import { useFirmwareStore } from '../../stores/firmwareStore';
import { installFirmware } from '../../lib/firmware/installer';
import type { InstallProgress } from '../../lib/firmware/installer';

export function FlashingStep() {
  const { selectedHub, hubName, installProgress, setInstallProgress, setError, setStep } = useFirmwareStore();
  const [isStarted, setIsStarted] = useState(false);

  const handleProgress = useCallback((progress: InstallProgress) => {
    setInstallProgress(progress);
    
    if (progress.step === 'complete') {
      setStep('complete');
    } else if (progress.step === 'error') {
      setError(progress.message);
    }
  }, [setInstallProgress, setError, setStep]);

  const startInstallation = useCallback(async () => {
    if (!selectedHub || isStarted) return;
    
    setIsStarted(true);
    setError(null);

    try {
      await installFirmware(selectedHub, hubName || undefined, handleProgress);
    } catch (error) {
      setError((error as Error).message);
    }
  }, [selectedHub, hubName, isStarted, handleProgress, setError]);

  useEffect(() => {
    // Auto-start installation when this step is shown
    const timer = setTimeout(() => {
      startInstallation();
    }, 500);

    return () => clearTimeout(timer);
  }, [startInstallation]);

  const getStepIcon = (step: InstallProgress['step']) => {
    switch (step) {
      case 'downloading':
        return (
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        );
      case 'extracting':
        return (
          <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
      case 'connecting':
        return (
          <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        );
      case 'flashing':
        return (
          <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'complete':
        return (
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const progress = installProgress;

  return (
    <div>
      <div className="text-center py-8">
        {/* Status icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-gray-800 rounded-full flex items-center justify-center text-blue-400">
            {progress ? getStepIcon(progress.step) : (
              <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
        </div>

        {/* Status message */}
        <h3 className="text-lg font-medium text-white mb-2">
          {progress?.message || 'Preparing installation...'}
        </h3>

        {/* Progress bar */}
        {progress && progress.step !== 'connecting' && (
          <div className="max-w-md mx-auto mt-6">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progress.step === 'error' ? 'bg-red-500' : 'bg-blue-600'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">
              {progress.percentage}%
            </p>
          </div>
        )}

        {/* Instructions for connecting */}
        {progress?.step === 'connecting' && (
          <div className="mt-6 max-w-md mx-auto">
            <p className="text-gray-400 text-sm mb-4">
              A browser popup should appear asking you to select your hub.
            </p>
            <p className="text-gray-400 text-sm">
              If you don't see a popup, make sure your hub is in update mode and connected via USB.
            </p>
          </div>
        )}
      </div>

      {/* Warning about not disconnecting */}
      {progress && progress.step === 'flashing' && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-red-300 text-sm font-medium">Do not disconnect the hub!</p>
              <p className="text-red-200/70 text-sm">
                Keep the USB cable connected until the installation is complete.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useFirmwareStore } from '../../stores/firmwareStore';
import { installFirmware } from '../../lib/firmware/installer';

export function FlashingStep() {
  const {
    selectedHub,
    hubName,
    prevStep,
    setStep,
    installProgress,
    setInstallProgress,
    setError,
  } = useFirmwareStore();

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!selectedHub) {
      setError('No hub selected');
      setStep('hub-select');
      return;
    }

    (async () => {
      try {
        setError(null);
        setInstallProgress(null);

        await installFirmware(selectedHub, hubName || undefined, (p) => {
          setInstallProgress(p);
        });

        setStep('complete');
      } catch (err) {
        setError((err as Error).message);
        // stay on flashing step so user can read the error and go back
      }
    })();
  }, [selectedHub, hubName, setError, setInstallProgress, setStep]);

  const pct = installProgress?.percentage ?? 0;
  const message = installProgress?.message ?? 'Preparing…';

  return (
    <div>
      <div className="text-center py-6">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-blue-900/30 rounded-full flex items-center justify-center text-blue-400">
            <svg className="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-medium text-white mb-2">Flashing Firmware</h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">{message}</p>

        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span className="capitalize">{installProgress?.step ?? 'starting'}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-left">
            <p className="text-yellow-200 text-sm">
              Keep the USB cable connected and do not close this window while flashing.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-start mt-6">
        <button
          onClick={prevStep}
          disabled={!!installProgress && installProgress.step === 'flashing'}
          className="px-6 py-2 rounded-lg font-medium text-gray-300 hover:text-white transition-colors disabled:opacity-50"
        >
          Back
        </button>
      </div>
    </div>
  );
}

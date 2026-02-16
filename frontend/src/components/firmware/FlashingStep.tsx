import { useCallback } from 'react';
import { useFirmwareStore } from '../../stores/firmwareStore';

export function FlashingStep() {
  const { selectedHub, prevStep, setStep } = useFirmwareStore();

  const openPybricksCode = useCallback(() => {
    // Open Pybricks Code in a new tab - they have the proper bootloader implementation
    window.open('https://code.pybricks.com/', '_blank');
    setStep('complete');
  }, [setStep]);

  return (
    <div>
      <div className="text-center py-6">
        {/* Info icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-blue-900/30 rounded-full flex items-center justify-center text-blue-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-medium text-white mb-4">
          Ready to Install Firmware
        </h3>

        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          You've selected <strong className="text-white">{selectedHub}</strong> hub.
          The actual firmware installation will be done through Pybricks Code, 
          which has the specialized bootloader protocol for LEGO hubs.
        </p>

        <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <p className="text-blue-300 text-sm">
            <strong>Note:</strong> Pybricks Code will open in a new tab. Follow their 
            installation wizard — your hub should still be in update mode (bootloader).
          </p>
        </div>

        <button
          onClick={openPybricksCode}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Pybricks Code
        </button>
      </div>

      <div className="flex justify-start mt-6">
        <button
          onClick={prevStep}
          className="px-6 py-2 rounded-lg font-medium text-gray-300 hover:text-white transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}

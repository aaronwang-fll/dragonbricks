import { useCallback } from 'react';
import { useFirmwareStore } from '../../stores/firmwareStore';
import { HubSelector } from './HubSelector';
import { LicenseStep } from './LicenseStep';
import { HubNamingStep } from './HubNamingStep';
import { UpdateModeStep } from './UpdateModeStep';
import { FlashingStep } from './FlashingStep';
import { isWebUSBSupported } from '../../lib/firmware/dfu';

export function FirmwareWizard() {
  const { isOpen, currentStep, closeWizard, error } = useFirmwareStore();

  const handleClose = useCallback(() => {
    closeWizard();
  }, [closeWizard]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Only close if we're not in the middle of flashing
      if (currentStep !== 'flashing') {
        handleClose();
      }
    }
  }, [currentStep, handleClose]);

  if (!isOpen) return null;

  const webUSBSupported = isWebUSBSupported();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Install Pybricks Firmware</h2>
          {currentStep !== 'flashing' && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!webUSBSupported ? (
            <div className="text-center py-8">
              <div className="text-yellow-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">WebUSB Not Supported</h3>
              <p className="text-gray-400 mb-4">
                Your browser doesn't support WebUSB, which is required for firmware installation.
              </p>
              <p className="text-gray-400">
                Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on a desktop computer.
              </p>
            </div>
          ) : (
            <>
              {currentStep === 'hub-select' && <HubSelector />}
              {currentStep === 'license' && <LicenseStep />}
              {currentStep === 'naming' && <HubNamingStep />}
              {currentStep === 'update-mode' && <UpdateModeStep />}
              {currentStep === 'flashing' && <FlashingStep />}
              {currentStep === 'complete' && (
                <div className="text-center py-8">
                  <div className="text-green-500 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Installation Complete!</h3>
                  <p className="text-gray-400 mb-6">
                    Pybricks firmware has been installed successfully. Your hub will restart automatically.
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {webUSBSupported && currentStep !== 'complete' && (
          <div className="px-6 py-3 border-t border-gray-700">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Step {['hub-select', 'license', 'naming', 'update-mode', 'flashing'].indexOf(currentStep) + 1} of 5</span>
              <span className="capitalize">{currentStep.replace('-', ' ')}</span>
            </div>
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{
                  width: `${((['hub-select', 'license', 'naming', 'update-mode', 'flashing'].indexOf(currentStep) + 1) / 5) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

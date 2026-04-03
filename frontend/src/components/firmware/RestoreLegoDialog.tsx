import { useState } from 'react';

interface RestoreLegoDialogProps {
  onClose: () => void;
}

export function RestoreLegoDialog({ onClose }: RestoreLegoDialogProps) {
  const [method, setMethod] = useState<'spike-app' | 'pybricks' | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Restore LEGO Firmware</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!method && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Choose how you want to restore the original LEGO firmware on your hub.
              </p>

              <button
                onClick={() => setMethod('spike-app')}
                className="w-full p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-medium">LEGO SPIKE App (Recommended)</div>
                    <div className="text-gray-400 text-sm">Connect via USB and let the SPIKE app restore it</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMethod('pybricks')}
                className="w-full p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-medium">Pybricks Code (Browser)</div>
                    <div className="text-gray-400 text-sm">Use the Pybricks web app to restore via USB</div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {method === 'spike-app' && (
            <div className="space-y-5">
              <button
                onClick={() => setMethod(null)}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <h3 className="text-lg font-medium text-white">Restore via LEGO SPIKE App</h3>

              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">1</span>
                  <div>
                    <div className="text-white font-medium">Download the LEGO Education SPIKE app</div>
                    <div className="text-gray-400 mt-1">
                      Available for{' '}
                      <a href="https://education.lego.com/en-us/downloads/spike-app/software/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        Windows, Mac, iPad, Chrome, and Android
                      </a>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">2</span>
                  <div>
                    <div className="text-white font-medium">Connect your hub via USB cable</div>
                    <div className="text-gray-400 mt-1">Use the micro-USB cable that came with your kit</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">3</span>
                  <div>
                    <div className="text-white font-medium">Open the SPIKE app and connect to the hub</div>
                    <div className="text-gray-400 mt-1">The app will detect non-LEGO firmware and offer to update it automatically</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">4</span>
                  <div>
                    <div className="text-white font-medium">Follow the on-screen instructions</div>
                    <div className="text-gray-400 mt-1">The app will download and install the official LEGO firmware. This takes about 2-3 minutes.</div>
                  </div>
                </li>
              </ol>

              <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  After restoring LEGO firmware, you'll need to reinstall Pybricks firmware to use DragonBricks again.
                </p>
              </div>
            </div>
          )}

          {method === 'pybricks' && (
            <div className="space-y-5">
              <button
                onClick={() => setMethod(null)}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <h3 className="text-lg font-medium text-white">Restore via Pybricks Code</h3>

              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">1</span>
                  <div>
                    <div className="text-white font-medium">
                      Open{' '}
                      <a href="https://code.pybricks.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        code.pybricks.com
                      </a>
                      {' '}in Chrome
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">2</span>
                  <div>
                    <div className="text-white font-medium">Put hub in bootloader mode</div>
                    <div className="text-gray-400 mt-1">Hold the hub button, then connect USB. The hub light will flash a pattern.</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">3</span>
                  <div>
                    <div className="text-white font-medium">Click the gear icon and select "Restore official LEGO firmware"</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">4</span>
                  <div>
                    <div className="text-white font-medium">Select your hub when prompted and wait for flashing to complete</div>
                  </div>
                </li>
              </ol>

              <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  After restoring LEGO firmware, you'll need to reinstall Pybricks firmware to use DragonBricks again.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

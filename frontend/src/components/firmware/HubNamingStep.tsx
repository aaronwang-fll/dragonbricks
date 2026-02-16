import { useFirmwareStore } from '../../stores/firmwareStore';

export function HubNamingStep() {
  const { hubName, setHubName, nextStep, prevStep } = useFirmwareStore();

  const handleNext = () => {
    nextStep();
  };

  return (
    <div>
      <p className="text-gray-300 mb-6">
        Give your hub a custom name to easily identify it. This is especially useful if you have multiple hubs.
        The name will appear when connecting via Bluetooth.
      </p>

      <div className="mb-6">
        <label htmlFor="hubName" className="block text-sm font-medium text-gray-300 mb-2">
          Hub Name (optional)
        </label>
        <input
          type="text"
          id="hubName"
          value={hubName}
          onChange={(e) => setHubName(e.target.value)}
          placeholder="e.g., Team Robot 1"
          maxLength={16}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-2 text-sm text-gray-500">
          Maximum 16 characters. Leave blank to use default name "Pybricks Hub".
        </p>
      </div>

      <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-blue-300 text-sm">
              <strong>Tip for classrooms:</strong> Use easy-to-remember names like animal names, 
              city names, or team numbers. Add matching stickers or labels to each hub for quick identification.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="px-6 py-2 rounded-lg font-medium text-gray-300 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

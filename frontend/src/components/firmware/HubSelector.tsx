import { useFirmwareStore } from '../../stores/firmwareStore';
import { getAllHubTypes } from '../../lib/firmware/hubTypes';
import type { HubType } from '../../lib/firmware/hubTypes';

export function HubSelector() {
  const { selectedHub, selectHub, nextStep } = useFirmwareStore();
  const hubs = getAllHubTypes();

  const handleSelect = (hubId: HubType) => {
    selectHub(hubId);
  };

  const handleNext = () => {
    if (selectedHub) {
      nextStep();
    }
  };

  return (
    <div>
      <p className="text-gray-300 mb-6">
        Select your LEGO hub to install Pybricks firmware. This will replace the original LEGO firmware
        with Pybricks, enabling Python programming with enhanced features.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {hubs.map((hub) => (
          <button
            key={hub.id}
            onClick={() => handleSelect(hub.id)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedHub === hub.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                {/* Hub icon placeholder */}
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">{hub.name}</h3>
                <p className="text-sm text-gray-400">{hub.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={!selectedHub}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            selectedHub
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

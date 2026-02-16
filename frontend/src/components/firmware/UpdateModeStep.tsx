import { useFirmwareStore } from '../../stores/firmwareStore';
import { getHubDefinition } from '../../lib/firmware/hubTypes';

export function UpdateModeStep() {
  const { selectedHub, nextStep, prevStep } = useFirmwareStore();
  const hub = selectedHub ? getHubDefinition(selectedHub) : null;

  const getInstructions = () => {
    switch (selectedHub) {
      case 'primehub':
        return {
          steps: [
            'Turn off the hub by holding the center button until the light turns off',
            'Connect the hub to your computer using a USB cable',
            'Hold down the Bluetooth button (small button next to USB port)',
            'While holding Bluetooth, press and release the center button',
            'Keep holding Bluetooth until the hub light turns pink/magenta',
            'Release the Bluetooth button - the hub is now in update mode',
          ],
          note: 'The hub light will pulse pink/magenta when in update mode.',
        };
      case 'essentialhub':
        return {
          steps: [
            'Turn off the hub by holding the button until the light turns off',
            'Connect the hub to your computer using a USB cable',
            'Hold down the button while connecting USB',
            'Keep holding until the light turns pink',
            'Release the button - the hub is now in update mode',
          ],
          note: 'The hub light will be solid pink when in update mode.',
        };
      case 'cityhub':
      case 'technichub':
        return {
          steps: [
            'Turn off the hub by holding the button until the light turns off',
            'Connect the hub to your computer using a USB cable',
            'Hold the green button while connecting USB',
            'Keep holding until the light starts blinking',
            'Release the button - the hub is now in update mode',
          ],
          note: 'The hub light will blink when in update mode.',
        };
      case 'movehub':
        return {
          steps: [
            'Turn off the hub by holding the button until the light turns off',
            'Hold down the green button',
            'While holding, connect USB cable to your computer',
            'Keep holding until the light turns purple',
            'Release the button - the hub is now in update mode',
          ],
          note: 'The hub light will be purple when in update mode.',
        };
      default:
        return {
          steps: [
            'Turn off the hub',
            'Connect USB cable while holding the power button',
            'Wait for the light to change color',
            'Release the button when in update mode',
          ],
          note: 'The light color indicates update mode.',
        };
    }
  };

  const instructions = getInstructions();

  return (
    <div>
      <p className="text-gray-300 mb-6">
        To install firmware, your {hub?.name || 'hub'} needs to be in <strong>update mode</strong> (bootloader mode).
        Follow these steps:
      </p>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <ol className="space-y-4">
          {instructions.steps.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {index + 1}
              </span>
              <span className="text-gray-300 pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-yellow-300 text-sm font-medium mb-1">Important</p>
            <p className="text-yellow-200/80 text-sm">{instructions.note}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <a
            href="https://pybricks.com/learn/getting-started/install-pybricks/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline text-sm"
          >
            Watch video tutorial on pybricks.com
          </a>
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
          onClick={nextStep}
          className="px-6 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Install Firmware
        </button>
      </div>
    </div>
  );
}

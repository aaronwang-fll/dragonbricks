import { useState } from 'react';
import { useFirmwareStore } from '../../stores/firmwareStore';

export function LicenseStep() {
  const { licenseAccepted, acceptLicense, nextStep, prevStep } = useFirmwareStore();
  const [accepted, setAccepted] = useState(licenseAccepted);

  const handleNext = () => {
    if (accepted) {
      nextStep();
    }
  };

  return (
    <div>
      <p className="text-gray-300 mb-4">
        Pybricks firmware is open source software. Please review and accept the license terms to continue.
      </p>

      <div className="bg-gray-800 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto text-sm">
        <h4 className="font-medium text-white mb-2">MIT License</h4>
        <pre className="text-gray-400 whitespace-pre-wrap font-mono text-xs">
{`Copyright (c) 2018-2024 The Pybricks Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
        </pre>

        <h4 className="font-medium text-white mt-4 mb-2">Additional Components</h4>
        <p className="text-gray-400 text-xs">
          Pybricks firmware includes MicroPython (MIT License), lwIP (BSD License), 
          and other open source components. Full license details are available at{' '}
          <a
            href="https://github.com/pybricks/pybricks-micropython/blob/master/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            github.com/pybricks/pybricks-micropython
          </a>
        </p>
      </div>

      <label className="flex items-center gap-3 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked);
            if (e.target.checked) acceptLicense();
          }}
          className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
        />
        <span className="text-gray-300">
          I have read and accept the license terms
        </span>
      </label>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="px-6 py-2 rounded-lg font-medium text-gray-300 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!accepted}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            accepted
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

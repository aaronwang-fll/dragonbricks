import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { parseRoutineDefinition } from '../../lib/parser/routines';

export function PythonPanel() {
  const { commands, defaults, currentProgram } = useEditorStore();
  const routines = currentProgram?.routines || [];
  const [copied, setCopied] = useState(false);

  // Generate the full Python code
  const generateFullCode = () => {
    const lines: string[] = [];

    // Pybricks imports
    lines.push('from pybricks.hubs import PrimeHub');
    lines.push('from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor');
    lines.push('from pybricks.parameters import Port, Direction, Stop, Color');
    lines.push('from pybricks.robotics import DriveBase');
    lines.push('from pybricks.tools import wait, StopWatch');
    lines.push('');

    // Hub initialization
    lines.push('# Initialize hub');
    lines.push('hub = PrimeHub()');
    lines.push('');

    // Motor setup (these would come from SetupSection config in real implementation)
    lines.push('# Motors');
    lines.push('left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)');
    lines.push('right_motor = Motor(Port.B)');
    lines.push('');

    // DriveBase
    lines.push('# DriveBase');
    lines.push(`robot = DriveBase(left_motor, right_motor, wheel_diameter=${defaults.wheelDiameter}, axle_track=${defaults.axleTrack})`);
    lines.push('');

    // Routines (if any)
    if (routines.length > 0) {
      lines.push('# Routines');
      routines.forEach((routine) => {
        // Parse the routine body into Python
        const routineLines = [`Define ${routine.name}${routine.parameters.length > 0 ? ` with ${routine.parameters.join(', ')}` : ''}:`, ...routine.body.split('\n').map(l => `  ${l}`)];
        const parsed = parseRoutineDefinition(routineLines, defaults);
        if (parsed) {
          lines.push(parsed.pythonCode);
          lines.push('');
        }
      });
    }

    // Main program
    lines.push('# Main program');
    commands.forEach((cmd) => {
      if (cmd.pythonCode && cmd.status === 'parsed') {
        lines.push(cmd.pythonCode);
      } else if (cmd.status === 'error' && cmd.error) {
        lines.push(`# Error: ${cmd.error}`);
        lines.push(`# Original: ${cmd.naturalLanguage}`);
      } else if (cmd.status === 'needs-clarification') {
        lines.push(`# Needs input: ${cmd.naturalLanguage}`);
      }
    });

    if (commands.length === 0 && routines.length === 0) {
      lines.push('# Add commands in the Main section');
      lines.push('# Example: "move forward 200mm"');
    }

    return lines.join('\n');
  };

  const code = generateFullCode();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Python</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Download as .py file"
          >
            Download
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto p-3 bg-gray-50 dark:bg-gray-900">
        <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {code.split('\n').map((line, i) => (
            <div key={i} className="flex leading-5">
              <span className="w-8 text-gray-400 dark:text-gray-600 select-none text-right pr-2">{i + 1}</span>
              <span className={
                line.startsWith('#') ? 'text-gray-400 dark:text-gray-500' :
                line.startsWith('from ') || line.startsWith('import ') ? 'text-purple-600 dark:text-purple-400' :
                line.includes('=') ? 'text-blue-600 dark:text-blue-300' :
                'text-gray-700 dark:text-gray-300'
              }>
                {line || ' '}
              </span>
            </div>
          ))}
        </pre>
      </div>

      {/* Footer status */}
      <div className="px-3 py-1 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {commands.filter(c => c.status === 'parsed').length} / {commands.length} commands parsed
      </div>
    </div>
  );
}

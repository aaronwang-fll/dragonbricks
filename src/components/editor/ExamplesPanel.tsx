import { useState } from 'react';

interface Example {
  category: string;
  commands: {
    input: string;
    description: string;
  }[];
}

const EXAMPLES: Example[] = [
  {
    category: 'Basic Movement',
    commands: [
      { input: 'move forward 200mm', description: 'Move straight forward' },
      { input: 'move backward 100mm at speed 300', description: 'Move back with custom speed' },
      { input: 'turn right 90 degrees', description: 'Turn in place' },
      { input: 'turn left 45 degrees precisely', description: 'Gyro-based precise turn' },
    ],
  },
  {
    category: 'Attachment Motors',
    commands: [
      { input: 'run arm motor 180 degrees', description: 'Rotate attachment' },
      { input: 'rotate grabber -360 degrees at speed 500', description: 'Fast motor spin' },
      { input: 'stop arm', description: 'Stop specific motor' },
    ],
  },
  {
    category: 'Timing & Waiting',
    commands: [
      { input: 'wait 2 seconds', description: 'Pause execution' },
      { input: 'wait 500ms', description: 'Short delay' },
      { input: 'set speed to 350', description: 'Change default speed' },
    ],
  },
  {
    category: 'Sensors (Advanced)',
    commands: [
      { input: 'wait until color sensor sees black', description: 'Wait for color detection' },
      { input: 'while light sensor > 50 move forward', description: 'Sensor-based movement' },
      { input: 'if distance sensor < 100mm then stop', description: 'Conditional stop' },
    ],
  },
  {
    category: 'Line Following',
    commands: [
      { input: 'follow line until color sees red', description: 'Line follow to color' },
      { input: 'follow line for 500mm', description: 'Line follow for distance' },
    ],
  },
  {
    category: 'Loops & Patterns',
    commands: [
      { input: 'repeat 4 times: move forward 100mm, turn right 90', description: 'Draw a square' },
      { input: 'repeat 3 times: rotate spinner 360 degrees', description: 'Repeated action' },
    ],
  },
  {
    category: 'FLL Mission Patterns',
    commands: [
      { input: 'move forward 520mm at speed 350, turn right 30, move forward 135mm', description: 'Multi-step approach' },
      { input: 'simultaneously move forward 200mm and rotate arm 180 degrees', description: 'Parallel actions' },
      { input: 'run left attachment 200 degrees, wait 100ms, run left attachment -200 degrees', description: 'Grab and release' },
    ],
  },
];

interface ExamplesPanelProps {
  onSelectExample: (input: string) => void;
}

export function ExamplesPanel({ onSelectExample }: ExamplesPanelProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Basic Movement');

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="p-2">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">
          Example Commands
        </h3>
        <div className="space-y-1">
          {EXAMPLES.map((category) => (
            <div key={category.category}>
              <button
                onClick={() => setExpandedCategory(
                  expandedCategory === category.category ? null : category.category
                )}
                className="w-full px-2 py-1.5 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <span className="font-medium">{category.category}</span>
                <span className="text-xs text-gray-400">
                  {expandedCategory === category.category ? '▼' : '▶'}
                </span>
              </button>

              {expandedCategory === category.category && (
                <div className="ml-2 mt-1 space-y-1">
                  {category.commands.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectExample(cmd.input)}
                      className="w-full text-left px-2 py-1.5 text-xs bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 group"
                    >
                      <div className="font-mono text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                        {cmd.input}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                        {cmd.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

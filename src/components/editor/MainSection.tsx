import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';

export function MainSection() {
  const [input, setInput] = useState('');
  const { commands, expandedCommands, toggleCommandExpanded } = useEditorStore();

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 p-3 overflow-y-auto">
        {commands.length === 0 ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Type natural language commands here...\n\nExamples:\n  move forward 200mm\n  turn right 90 degrees\n  wait 1 second`}
            className="w-full h-full resize-none border-0 outline-none text-sm font-mono"
          />
        ) : (
          <div className="space-y-1">
            {commands.map((cmd) => (
              <div key={cmd.id} className="group">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCommandExpanded(cmd.id)}
                    className="text-gray-400 hover:text-gray-600 w-4"
                  >
                    {expandedCommands.has(cmd.id) ? '▼' : '▶'}
                  </button>
                  <span className="text-sm font-mono">{cmd.naturalLanguage}</span>
                </div>
                {expandedCommands.has(cmd.id) && cmd.pythonCode && (
                  <pre className="ml-6 mt-1 p-2 bg-gray-50 text-xs text-gray-600 rounded">
                    {cmd.pythonCode}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-200 flex justify-between">
        <button className="text-sm text-blue-600 hover:text-blue-800">
          Expand Python
        </button>
      </div>
    </div>
  );
}

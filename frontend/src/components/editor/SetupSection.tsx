import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';

const PORTS = ['A', 'B', 'C', 'D', 'E', 'F'];
const NONE_OPTION = 'None';

function PortSelect({
  value,
  onChange,
  allowNone = false,
}: {
  value: string;
  onChange: (v: string) => void;
  allowNone?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white min-w-[60px]"
    >
      {allowNone && <option value="None">{NONE_OPTION}</option>}
      {PORTS.map((p) => (
        <option key={p} value={p}>
          Port {p}
        </option>
      ))}
    </select>
  );
}

export function SetupSection() {
  const { defaults, updateDefaults } = useEditorStore();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [attachment1Name, setAttachment1Name] = useState('Attachment Motor 1');
  const [attachment2Name, setAttachment2Name] = useState('Attachment Motor 2');

  return (
    <div className="p-3 bg-white dark:bg-gray-800 h-full overflow-y-auto">
      {/* Drive Motors */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
          Drive Motors
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Left Motor</span>
            <PortSelect
              value={defaults.leftMotorPort}
              onChange={(v) => updateDefaults({ leftMotorPort: v })}
            />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
              Right Motor
            </span>
            <PortSelect
              value={defaults.rightMotorPort}
              onChange={(v) => updateDefaults({ rightMotorPort: v })}
            />
          </div>
        </div>
      </div>

      {/* Attachment Motors */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
          Attachment Motors
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
            {editingName === 'attachment1' ? (
              <input
                type="text"
                value={attachment1Name}
                onChange={(e) => setAttachment1Name(e.target.value)}
                onBlur={() => setEditingName(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(null)}
                className="flex-1 px-2 py-0.5 text-xs border border-blue-500 rounded bg-white dark:bg-gray-600 text-gray-800 dark:text-white"
                autoFocus
              />
            ) : (
              <div className="flex-1 flex items-center gap-1 group/name">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                  {attachment1Name}
                </span>
                <button
                  onClick={() => setEditingName('attachment1')}
                  className="opacity-0 group-hover/name:opacity-100 p-0.5 hover:bg-gray-600 rounded transition-opacity"
                  title="Rename"
                >
                  <svg
                    className="w-3 h-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            )}
            <PortSelect
              value={defaults.attachment1Port}
              onChange={(v) => updateDefaults({ attachment1Port: v })}
              allowNone
            />
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
            {editingName === 'attachment2' ? (
              <input
                type="text"
                value={attachment2Name}
                onChange={(e) => setAttachment2Name(e.target.value)}
                onBlur={() => setEditingName(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(null)}
                className="flex-1 px-2 py-0.5 text-xs border border-blue-500 rounded bg-white dark:bg-gray-600 text-gray-800 dark:text-white"
                autoFocus
              />
            ) : (
              <div className="flex-1 flex items-center gap-1 group/name">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                  {attachment2Name}
                </span>
                <button
                  onClick={() => setEditingName('attachment2')}
                  className="opacity-0 group-hover/name:opacity-100 p-0.5 hover:bg-gray-600 rounded transition-opacity"
                  title="Rename"
                >
                  <svg
                    className="w-3 h-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            )}
            <PortSelect
              value={defaults.attachment2Port}
              onChange={(v) => updateDefaults({ attachment2Port: v })}
              allowNone
            />
          </div>
        </div>
      </div>

      {/* Sensors */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
          Sensors
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Color</span>
            <PortSelect
              value={defaults.colorSensorPort}
              onChange={(v) => updateDefaults({ colorSensorPort: v })}
              allowNone
            />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Ultrasonic</span>
            <PortSelect
              value={defaults.ultrasonicPort}
              onChange={(v) => updateDefaults({ ultrasonicPort: v })}
              allowNone
            />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Force</span>
            <PortSelect
              value={defaults.forcePort}
              onChange={(v) => updateDefaults({ forcePort: v })}
              allowNone
            />
          </div>
        </div>
      </div>
    </div>
  );
}

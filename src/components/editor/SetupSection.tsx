import { useState } from 'react';

const PORTS = ['A', 'B', 'C', 'D', 'E', 'F'];
const NONE_OPTION = 'None';

export function SetupSection() {
  const [config, setConfig] = useState({
    leftMotor: 'A',
    rightMotor: 'B',
    attachment1: 'None',
    attachment1Name: 'Attachment Motor 1',
    attachment2: 'None',
    attachment2Name: 'Attachment Motor 2',
    colorSensor: 'C',
    ultrasonicSensor: 'D',
    forceSensor: 'None',
  });

  const [editingName, setEditingName] = useState<string | null>(null);

  const updateConfig = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const PortSelect = ({ value, onChange, allowNone = false }: { value: string; onChange: (v: string) => void; allowNone?: boolean }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono bg-white dark:bg-gray-700 dark:text-white min-w-[60px]"
    >
      {allowNone && <option value="None">{NONE_OPTION}</option>}
      {PORTS.map(p => (
        <option key={p} value={p}>Port {p}</option>
      ))}
    </select>
  );

  const NameablePort = ({ portKey, nameKey, allowNone = true }: { portKey: string; nameKey: string; allowNone?: boolean }) => {
    const isEditing = editingName === nameKey;
    const port = config[portKey as keyof typeof config];
    const name = config[nameKey as keyof typeof config];

    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
        {isEditing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => updateConfig(nameKey, e.target.value)}
            onBlur={() => setEditingName(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingName(null)}
            className="flex-1 px-2 py-0.5 text-xs border border-blue-300 dark:border-blue-500 rounded bg-white dark:bg-gray-600 dark:text-white"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-xs font-medium cursor-pointer hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400"
            onClick={() => setEditingName(nameKey)}
            title="Click to rename"
          >
            {name}
          </span>
        )}
        <PortSelect
          value={port}
          onChange={(v) => updateConfig(portKey, v)}
          allowNone={allowNone}
        />
      </div>
    );
  };

  return (
    <div className="p-3 bg-white dark:bg-gray-800 h-full overflow-y-auto">
      {/* Drive Motors */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Drive Motors</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium dark:text-gray-200">Left Motor</span>
            <PortSelect value={config.leftMotor} onChange={(v) => updateConfig('leftMotor', v)} />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium dark:text-gray-200">Right Motor</span>
            <PortSelect value={config.rightMotor} onChange={(v) => updateConfig('rightMotor', v)} />
          </div>
        </div>
      </div>

      {/* Attachment Motors */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Attachment Motors</h4>
        <div className="grid grid-cols-2 gap-2">
          <NameablePort portKey="attachment1" nameKey="attachment1Name" />
          <NameablePort portKey="attachment2" nameKey="attachment2Name" />
        </div>
      </div>

      {/* Sensors */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Sensors</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium dark:text-gray-200">Color</span>
            <PortSelect value={config.colorSensor} onChange={(v) => updateConfig('colorSensor', v)} allowNone />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium dark:text-gray-200">Ultrasonic</span>
            <PortSelect value={config.ultrasonicSensor} onChange={(v) => updateConfig('ultrasonicSensor', v)} allowNone />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium dark:text-gray-200">Force</span>
            <PortSelect value={config.forceSensor} onChange={(v) => updateConfig('forceSensor', v)} allowNone />
          </div>
        </div>
      </div>
    </div>
  );
}

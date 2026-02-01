import { useThemeStore } from '../../stores/themeStore';
import { useEditorStore } from '../../stores/editorStore';

interface SettingsPageProps {
  onBack: () => void;
}

const PORTS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { mode, setMode } = useThemeStore();
  const { defaults, setDefaults } = useEditorStore();

  const PortSelect = ({ value, onChange, allowNone = false }: { value: string; onChange: (v: string) => void; allowNone?: boolean }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
    >
      {allowNone && <option value="None">None</option>}
      {PORTS.map(p => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h1>
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Close settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Appearance */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Appearance</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-gray-700 dark:text-gray-300 font-medium">Theme</label>
                  <p className="text-sm text-gray-500">Choose your preferred color scheme</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('light')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      mode === 'light'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setMode('dark')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      mode === 'dark'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setMode('system')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      mode === 'system'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    System
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Robot Configuration */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Robot Configuration</h2>

            <div className="space-y-6">
              {/* Drive Motors */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Drive Motors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Left Motor</span>
                    <PortSelect
                      value={defaults.leftMotorPort || 'A'}
                      onChange={(v) => setDefaults({ ...defaults, leftMotorPort: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Right Motor</span>
                    <PortSelect
                      value={defaults.rightMotorPort || 'B'}
                      onChange={(v) => setDefaults({ ...defaults, rightMotorPort: v })}
                    />
                  </div>
                </div>
              </div>

              {/* Attachment Motors */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Attachment Motors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Attachment Motor 1</span>
                    <PortSelect
                      value={defaults.attachment1Port || 'None'}
                      onChange={(v) => setDefaults({ ...defaults, attachment1Port: v })}
                      allowNone
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Attachment Motor 2</span>
                    <PortSelect
                      value={defaults.attachment2Port || 'None'}
                      onChange={(v) => setDefaults({ ...defaults, attachment2Port: v })}
                      allowNone
                    />
                  </div>
                </div>
              </div>

              {/* Sensors */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Sensors</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Color</span>
                    <PortSelect
                      value={defaults.colorSensorPort || 'None'}
                      onChange={(v) => setDefaults({ ...defaults, colorSensorPort: v })}
                      allowNone
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Ultrasonic</span>
                    <PortSelect
                      value={defaults.ultrasonicPort || 'None'}
                      onChange={(v) => setDefaults({ ...defaults, ultrasonicPort: v })}
                      allowNone
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Force</span>
                    <PortSelect
                      value={defaults.forcePort || 'None'}
                      onChange={(v) => setDefaults({ ...defaults, forcePort: v })}
                      allowNone
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Movement Defaults */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Movement Defaults</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Default Speed (millimeters/s)</label>
                <input
                  type="number"
                  value={defaults.speed}
                  onChange={(e) => setDefaults({ ...defaults, speed: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Default Turn Rate (°/s)</label>
                <input
                  type="number"
                  value={defaults.turnRate}
                  onChange={(e) => setDefaults({ ...defaults, turnRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Wheel Diameter (millimeters)</label>
                <input
                  type="number"
                  value={defaults.wheelDiameter}
                  onChange={(e) => setDefaults({ ...defaults, wheelDiameter: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Axle Track (millimeters)</label>
                <input
                  type="number"
                  value={defaults.axleTrack}
                  onChange={(e) => setDefaults({ ...defaults, axleTrack: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>
            </div>
          </section>

          {/* AI Assistant info */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">AI Assistant</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI-powered parsing is enabled and managed by the server.
              Complex commands that can't be parsed by rules will automatically use AI assistance.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}

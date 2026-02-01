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
      className="px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white min-w-[100px]"
    >
      {allowNone && <option value="None">None</option>}
      {PORTS.map(p => (
        <option key={p} value={p}>Port {p}</option>
      ))}
    </select>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Appearance */}
          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-gray-300 font-medium">Theme</label>
                  <p className="text-sm text-gray-500">Choose your preferred color scheme</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('light')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      mode === 'light'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setMode('dark')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      mode === 'dark'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setMode('system')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      mode === 'system'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    System
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Robot Configuration */}
          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Robot Configuration</h2>

            <div className="space-y-6">
              {/* Drive Motors */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Drive Motors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">Left Motor</span>
                    <PortSelect
                      value={defaults.leftMotorPort || 'A'}
                      onChange={(v) => setDefaults({ ...defaults, leftMotorPort: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">Right Motor</span>
                    <PortSelect
                      value={defaults.rightMotorPort || 'B'}
                      onChange={(v) => setDefaults({ ...defaults, rightMotorPort: v })}
                    />
                  </div>
                </div>
              </div>

              {/* Attachment Motors */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Attachment Motors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">Attachment 1</span>
                    <PortSelect
                      value={defaults.attachment1Port || 'None'}
                      onChange={(v) => setDefaults({ ...defaults, attachment1Port: v })}
                      allowNone
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">Attachment 2</span>
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
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Sensors</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">Color</span>
                    <PortSelect
                      value={defaults.colorSensorPort || 'None'}
                      onChange={(v) => setDefaults({ ...defaults, colorSensorPort: v })}
                      allowNone
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">Ultrasonic</span>
                    <PortSelect
                      value={defaults.ultrasonicPort || 'None'}
                      onChange={(v) => setDefaults({ ...defaults, ultrasonicPort: v })}
                      allowNone
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">Force</span>
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
          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Movement Defaults</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2">Default Speed (mm/s)</label>
                <input
                  type="number"
                  value={defaults.speed}
                  onChange={(e) => setDefaults({ ...defaults, speed: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Default Turn Rate (deg/s)</label>
                <input
                  type="number"
                  value={defaults.turnRate}
                  onChange={(e) => setDefaults({ ...defaults, turnRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Wheel Diameter (mm)</label>
                <input
                  type="number"
                  value={defaults.wheelDiameter}
                  onChange={(e) => setDefaults({ ...defaults, wheelDiameter: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Axle Track (mm)</label>
                <input
                  type="number"
                  value={defaults.axleTrack}
                  onChange={(e) => setDefaults({ ...defaults, axleTrack: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
                />
              </div>
            </div>
          </section>

          {/* More settings coming soon */}
          <section className="bg-gray-800/50 rounded-lg p-6 border border-dashed border-gray-700">
            <p className="text-gray-500 text-center">More configuration options coming soon...</p>
          </section>

        </div>
      </div>
    </div>
  );
}

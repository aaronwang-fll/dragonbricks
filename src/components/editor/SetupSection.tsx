import { useProfileStore } from '../../stores/profileStore';

export function SetupSection() {
  const { profiles, currentProfileId, useProfile, setCurrentProfileId, setUseProfile } =
    useProfileStore();

  return (
    <div className="p-3 bg-white h-full">
      <div className="flex items-center gap-4 mb-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useProfile}
            onChange={(e) => setUseProfile(e.target.checked)}
            className="rounded"
          />
          Use Robot Profile
        </label>

        {useProfile && (
          <select
            value={currentProfileId || ''}
            onChange={(e) => setCurrentProfileId(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} {profile.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {!useProfile && (
        <div className="grid grid-cols-4 gap-2 text-sm">
          <label className="flex items-center gap-1">
            Left: <select className="px-1 py-0.5 border rounded text-xs"><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option><option>F</option></select>
          </label>
          <label className="flex items-center gap-1">
            Right: <select className="px-1 py-0.5 border rounded text-xs"><option>B</option><option>A</option><option>C</option><option>D</option><option>E</option><option>F</option></select>
          </label>
          <label className="flex items-center gap-1">
            Color: <select className="px-1 py-0.5 border rounded text-xs"><option>C</option><option>A</option><option>B</option><option>D</option><option>E</option><option>F</option><option>None</option></select>
          </label>
          <label className="flex items-center gap-1">
            Dist: <select className="px-1 py-0.5 border rounded text-xs"><option>D</option><option>A</option><option>B</option><option>C</option><option>E</option><option>F</option><option>None</option></select>
          </label>
        </div>
      )}
    </div>
  );
}

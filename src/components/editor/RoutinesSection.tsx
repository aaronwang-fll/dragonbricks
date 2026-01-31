import { useEditorStore } from '../../stores/editorStore';

export function RoutinesSection() {
  const { currentProgram, showRoutines, setShowRoutines } = useEditorStore();
  const routines = currentProgram?.routines || [];

  return (
    <div className="bg-white border-t border-gray-200 h-full overflow-hidden flex flex-col">
      <button
        onClick={() => setShowRoutines(!showRoutines)}
        className="w-full px-3 py-2 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>{showRoutines ? '▼' : '▶'}</span>
        Defined Routines ({routines.length})
      </button>

      {showRoutines && (
        <div className="p-3 pt-0 overflow-y-auto flex-1">
          {routines.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No routines defined. Create one by typing "Define [name]:"
            </p>
          ) : (
            <div className="space-y-2">
              {routines.map((routine) => (
                <div key={routine.id} className="p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">{routine.name}</span>
                  {routine.parameters.length > 0 && (
                    <span className="text-gray-500">
                      ({routine.parameters.join(', ')})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

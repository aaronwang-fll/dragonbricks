import { useEditorStore } from '../../stores/editorStore';
import type { Program } from '../../types';

export function Sidebar() {
  const { programs, currentProgram, setCurrentProgram, addProgram } = useEditorStore();

  const handleNewFile = () => {
    const newProgram: Program = {
      id: `program-${Date.now()}`,
      name: `Untitled ${programs.length + 1}`,
      setupSection: '',
      mainSection: '',
      routines: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      profileId: null,
    };
    addProgram(newProgram);
    setCurrentProgram(newProgram);
  };

  return (
    <aside className="w-48 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase">Files</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {programs.map((program) => (
          <button
            key={program.id}
            onClick={() => setCurrentProgram(program)}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
              currentProgram?.id === program.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            <span>📄</span>
            {program.name}
          </button>
        ))}
      </div>

      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleNewFile}
          className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded flex items-center gap-2"
        >
          <span>+</span> New
        </button>
      </div>
    </aside>
  );
}

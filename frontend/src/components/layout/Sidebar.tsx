import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import type { Program } from '../../types';

// FLL Tutorial Examples organized by category
const TUTORIAL_EXAMPLES = {
  'Basic Movement': [
    { name: 'Move forward', command: 'move forward 200mm' },
    { name: 'Move backward', command: 'move backward 100mm' },
    { name: 'Turn left', command: 'turn left 90 degrees' },
    { name: 'Turn right', command: 'turn right 45 degrees' },
  ],
  'Sensors': [
    { name: 'Drive to black line', command: 'go forward until the light sensor detects black' },
    { name: 'Drive to white', command: 'go forward until the color sensor detects white' },
    { name: 'Wait for color', command: 'wait until color sensor detects red' },
    { name: 'Distance trigger', command: 'go forward until distance sensor < 100' },
  ],
  'Motors & Control': [
    { name: 'Run motor', command: 'run motor 180 degrees' },
    { name: 'Set speed', command: 'set speed to 300' },
    { name: 'Wait', command: 'wait 2 seconds' },
    { name: 'Stop', command: 'stop' },
  ],
  'Advanced': [
    { name: 'Repeat', command: 'repeat 3 times' },
    { name: 'Precise turn', command: 'turn left precisely 90 degrees' },
    { name: 'Follow line', command: 'follow line for 500mm' },
    { name: 'Parallel task', command: 'move forward 200mm while running motor 180 degrees' },
  ],
  'Routines': [
    { name: 'Call routine', command: 'run grab_object' },
    { name: 'Call routine 3 times', command: 'repeat 3 times: run grab_object' },
  ],
};

export function Sidebar() {
  const { programs, currentProgram, setCurrentProgram, addProgram, updateProgram, deleteProgram } = useEditorStore();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleNewFile = () => {
    setNewFileName('');
    setShowNewDialog(true);
  };

  const handleCreateFile = () => {
    const name = newFileName.trim() || `Untitled ${programs.length + 1}`;
    const newProgram: Program = {
      id: `program-${Date.now()}`,
      name,
      setupSection: '',
      mainSection: '',
      routines: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      profileId: null,
    };
    addProgram(newProgram);
    setCurrentProgram(newProgram);
    setShowNewDialog(false);
    setNewFileName('');
  };

  const handleRename = (id: string) => {
    const program = programs.find(p => p.id === id);
    if (program) {
      setEditingId(id);
      setEditingName(program.name);
    }
    setContextMenu(null);
  };

  const handleSaveRename = () => {
    if (editingId && editingName.trim()) {
      updateProgram(editingId, { name: editingName.trim() });
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleExport = (id: string) => {
    const program = programs.find(p => p.id === id);
    if (program) {
      const data = JSON.stringify(program, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${program.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setContextMenu(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this program?')) {
      deleteProgram(id);
    }
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  const handleInsertExample = (command: string) => {
    if (!currentProgram) return;

    // Append the command to the mainSection (on a new line if there's existing content)
    const currentContent = currentProgram.mainSection || '';
    const newContent = currentContent
      ? `${currentContent}\n${command}`
      : command;

    updateProgram(currentProgram.id, { mainSection: newContent });
  };

  return (
    <aside className="w-48 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-visible z-10">
      {/* New button at top */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          onClick={handleNewFile}
          className="w-full px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span> New Program
        </button>
      </div>

      {/* Files header */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Programs ({programs.length})</span>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {programs.length === 0 ? (
          <div className="p-3 text-sm text-gray-400 text-center">
            No programs yet
          </div>
        ) : (
          programs.map((program) => (
            <div
              key={program.id}
              onContextMenu={(e) => handleContextMenu(e, program.id)}
              className={`group relative ${
                currentProgram?.id === program.id ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {editingId === program.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="w-full px-3 py-2 text-sm border-0 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <div className="flex items-center">
                  <button
                    onClick={() => setCurrentProgram(program)}
                    className={`flex-1 px-3 py-2 text-left text-sm truncate ${
                      currentProgram?.id === program.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {program.name}
                  </button>
                  <div className="flex items-center gap-0.5 pr-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRename(program.id); }}
                      className="p-1 hover:bg-gray-600 rounded group/rename relative"
                    >
                      <svg className="w-3 h-3 text-gray-500 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span className="absolute right-full top-1/2 -translate-y-1/2 mr-1 px-2 py-1 bg-gray-600 text-white text-xs rounded opacity-0 group-hover/rename:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Rename
                      </span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExport(program.id); }}
                      className="p-1 hover:bg-gray-600 rounded group/export relative"
                    >
                      <svg className="w-3 h-3 text-gray-500 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="absolute right-full top-1/2 -translate-y-1/2 mr-1 px-2 py-1 bg-gray-600 text-white text-xs rounded opacity-0 group-hover/export:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Export
                      </span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(program.id); }}
                      className="p-1 hover:bg-red-900/30 rounded group/delete relative"
                    >
                      <svg className="w-3 h-3 text-gray-500 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="absolute right-full top-1/2 -translate-y-1/2 mr-1 px-2 py-1 bg-gray-600 text-white text-xs rounded opacity-0 group-hover/delete:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Delete
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Examples section */}
      <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Examples
          </span>
          <span className={`text-xs text-gray-400 transition-transform ${showExamples ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showExamples && (
          <div className="max-h-64 overflow-y-auto bg-white dark:bg-gray-800">
            {Object.entries(TUTORIAL_EXAMPLES).map(([category, examples]) => (
              <div key={category}>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"
                >
                  <span className={`text-[10px] transition-transform ${expandedCategory === category ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  {category}
                </button>
                {expandedCategory === category && (
                  <div className="py-1">
                    {examples.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleInsertExample(example.command)}
                        className="w-full px-4 py-1 text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                        title={`Click to insert: ${example.command}`}
                      >
                        {example.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="px-3 py-2 text-[10px] text-gray-400 dark:text-gray-500 text-center">
              Click to insert into editor
            </div>
          </div>
        )}
      </div>

      {/* New file dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-80 shadow-xl">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">New Program</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Program name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded mb-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
                if (e.key === 'Escape') setShowNewDialog(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewDialog(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-32"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleRename(contextMenu.id)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Rename
            </button>
            <button
              onClick={() => handleExport(contextMenu.id)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export
            </button>
            <hr className="my-1 border-gray-700" />
            <button
              onClick={() => handleDelete(contextMenu.id)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-900/30 text-red-400 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

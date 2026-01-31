import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import type { Program } from '../../types';

export function Sidebar() {
  const { programs, currentProgram, setCurrentProgram, addProgram, updateProgram, deleteProgram } = useEditorStore();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

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

  return (
    <aside className="w-48 bg-white border-r border-gray-200 flex flex-col">
      {/* New button at top */}
      <div className="p-2 border-b border-gray-200">
        <button
          onClick={handleNewFile}
          className="w-full px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span> New Program
        </button>
      </div>

      {/* Files header */}
      <div className="px-3 py-2 bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase">Programs ({programs.length})</span>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
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
                currentProgram?.id === program.id ? 'bg-blue-50' : 'hover:bg-gray-50'
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
                  className="w-full px-3 py-2 text-sm border-0 bg-white focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setCurrentProgram(program)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                    currentProgram?.id === program.id ? 'text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span>📄</span>
                  <span className="truncate flex-1">{program.name}</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* New file dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-80 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">New Program</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Program name"
              className="w-full px-3 py-2 border border-gray-300 rounded mb-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
                if (e.key === 'Escape') setShowNewDialog(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewDialog(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
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
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-32"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleRename(contextMenu.id)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              ✏️ Rename
            </button>
            <button
              onClick={() => handleExport(contextMenu.id)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              📤 Export
            </button>
            <hr className="my-1" />
            <button
              onClick={() => handleDelete(contextMenu.id)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              🗑️ Delete
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

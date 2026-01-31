import { useState, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useParser } from '../../hooks/useParser';
import { ResizeHandle } from '../shared/ResizeHandle';
import { SetupSection } from './SetupSection';
import { MainSection } from './MainSection';
import { RoutinesSection } from './RoutinesSection';
import { ClarificationDialog } from './ClarificationDialog';
import { PythonPanel } from './PythonPanel';


interface ClarificationState {
  isOpen: boolean;
  commandId: string;
  field: string;
  message: string;
  type: 'distance' | 'angle' | 'duration';
}

export function EditorPanel() {
  const { routinesHeight, setRoutinesHeight, showPythonPanel, setShowPythonPanel, pythonPanelWidth, setPythonPanelWidth } =
    useEditorStore();
  const { resolveClarification } = useParser();

  const [clarification, setClarification] = useState<ClarificationState>({
    isOpen: false,
    commandId: '',
    field: '',
    message: '',
    type: 'distance',
  });

  const handleRoutinesResize = (delta: number) => {
    setRoutinesHeight(Math.max(50, Math.min(400, routinesHeight - delta)));
  };

  const handlePythonPanelResize = (delta: number) => {
    setPythonPanelWidth(Math.max(200, Math.min(600, pythonPanelWidth - delta)));
  };

  const handleClarificationNeeded = useCallback((
    commandId: string,
    clarificationData: { field: string; message: string; type: 'distance' | 'angle' | 'duration' }
  ) => {
    setClarification({
      isOpen: true,
      commandId,
      ...clarificationData,
    });
  }, []);

  const handleClarificationSubmit = useCallback((
    commandId: string,
    field: string,
    value: string
  ) => {
    resolveClarification(commandId, field, value);
    setClarification(prev => ({ ...prev, isOpen: false }));
  }, [resolveClarification]);

  const handleClarificationCancel = useCallback(() => {
    setClarification(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <div className="flex-1 flex border-r border-gray-200">
      {/* Left side: Setup + Main + Routines */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Setup Section - collapsible header */}
        <details open className="group">
          <summary className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 list-none flex items-center gap-2">
            <span className="text-[10px] group-open:rotate-90 transition-transform">▶</span>
            Setup
          </summary>
          <div className="max-h-48 overflow-y-auto">
            <SetupSection />
          </div>
        </details>

        {/* Main Section - no resize handle, just border */}
        <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span>Main</span>
          <button
            onClick={() => setShowPythonPanel(!showPythonPanel)}
            className={`text-[10px] px-2 py-0.5 rounded ${showPythonPanel ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'} hover:opacity-80`}
            title={showPythonPanel ? 'Hide Python' : 'Show Python'}
          >
            {showPythonPanel ? '< Python' : 'Python >'}
          </button>
        </div>
        <MainSection onClarificationNeeded={handleClarificationNeeded} />

        <ResizeHandle direction="vertical" onResize={handleRoutinesResize} />

        <div style={{ height: routinesHeight, minHeight: 50 }}>
          <RoutinesSection />
        </div>
      </div>

      {/* Right side: Python Panel */}
      {showPythonPanel && (
        <>
          <ResizeHandle direction="horizontal" onResize={handlePythonPanelResize} />
          <div style={{ width: pythonPanelWidth }} className="flex flex-col border-l border-gray-200">
            <PythonPanel />
          </div>
        </>
      )}

      <ClarificationDialog
        isOpen={clarification.isOpen}
        commandId={clarification.commandId}
        field={clarification.field}
        message={clarification.message}
        type={clarification.type}
        onSubmit={handleClarificationSubmit}
        onCancel={handleClarificationCancel}
      />
    </div>
  );
}

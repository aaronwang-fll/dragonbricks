import { useState, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useParser } from '../../hooks/useParser';
import { ResizeHandle } from '../shared/ResizeHandle';
import { SetupSection } from './SetupSection';
import { MainSection } from './MainSection';
import { RoutinesSection } from './RoutinesSection';
import { ClarificationDialog } from './ClarificationDialog';


interface ClarificationState {
  isOpen: boolean;
  commandId: string;
  field: string;
  message: string;
  type: 'distance' | 'angle' | 'duration';
}

export function EditorPanel() {
  const { routinesHeight, setRoutinesHeight, showRoutines } = useEditorStore();
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
    <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-green-100 dark:bg-green-900">
      {/* Setup Section - collapsible header */}
      <details open className="group">
        <summary className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 list-none flex items-center gap-2">
          <span className="text-[10px] group-open:rotate-90 transition-transform">▶</span>
          Setup
        </summary>
        <div className="max-h-48 overflow-y-auto">
          <SetupSection />
        </div>
      </details>

      {/* Main Section - inline Python per line */}
      <div
        data-main-section
        className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      >
        Main
      </div>
      <MainSection onClarificationNeeded={handleClarificationNeeded} />

      <ResizeHandle direction="vertical" onResize={handleRoutinesResize} />

      <div
        className="transition-all duration-300 ease-in-out"
        style={{ minHeight: showRoutines ? 200 : 50, maxHeight: showRoutines ? 400 : 50 }}
      >
        <RoutinesSection />
      </div>

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

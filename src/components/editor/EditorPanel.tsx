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
  const { setupHeight, routinesHeight, setSetupHeight, setRoutinesHeight } =
    useEditorStore();
  const { resolveClarification } = useParser();

  const [clarification, setClarification] = useState<ClarificationState>({
    isOpen: false,
    commandId: '',
    field: '',
    message: '',
    type: 'distance',
  });

  const handleSetupResize = (delta: number) => {
    setSetupHeight(Math.max(80, Math.min(300, setupHeight + delta)));
  };

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
    <div className="flex-1 flex flex-col border-r border-gray-200">
      <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b border-gray-200">
        Setup
      </div>
      <div style={{ height: setupHeight }}>
        <SetupSection />
      </div>

      <ResizeHandle direction="vertical" onResize={handleSetupResize} />

      <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b border-gray-200">
        Main
      </div>
      <MainSection onClarificationNeeded={handleClarificationNeeded} />

      <ResizeHandle direction="vertical" onResize={handleRoutinesResize} />

      <div style={{ height: routinesHeight, minHeight: 50 }}>
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

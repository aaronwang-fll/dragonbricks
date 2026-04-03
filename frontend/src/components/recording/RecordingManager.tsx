import { useRecording } from '../../hooks/useRecording';
import { SaveRecordingDialog } from './SaveRecordingDialog';

export function RecordingManager() {
  const {
    showSaveDialog,
    commands,
    replayCode,
    routineName,
    setRoutineName,
    saveRecording,
    discardRecording,
    error,
    clearError,
  } = useRecording();

  return (
    <>
      {showSaveDialog && (
        <SaveRecordingDialog
          summary={commands}
          replayCode={replayCode}
          routineName={routineName}
          onNameChange={setRoutineName}
          onSave={saveRecording}
          onDiscard={discardRecording}
        />
      )}

      {error && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-white/80 hover:text-white font-bold"
            >
              x
            </button>
          </div>
        </div>
      )}
    </>
  );
}

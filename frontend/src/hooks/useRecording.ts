import { useEffect } from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import { useConnectionStore } from '../stores/connectionStore';
import {
  startRecording,
  stopRecording,
  saveRecording,
  discardRecording,
  handleDisconnect,
} from '../lib/recording/recordingService';

/**
 * Thin wrapper around the recording store + service.
 * Safe to call from multiple components -- the actual recording state
 * lives in module-level singletons inside recordingService.ts.
 */
export function useRecording() {
  const store = useRecordingStore();
  const connectionStatus = useConnectionStore((s) => s.status);
  const isConnected = connectionStatus === 'connected';

  // Auto-stop if hub disconnects during recording
  useEffect(() => {
    if (!isConnected) {
      handleDisconnect();
    }
  }, [isConnected]);

  return {
    phase: store.phase,
    sampleCount: store.sampleCount,
    commands: store.commands,
    replayCode: store.replayCode,
    elapsedMs: store.elapsedMs,
    error: store.error,
    showSaveDialog: store.showSaveDialog,
    routineName: store.routineName,
    isConnected,
    startRecording,
    stopRecording,
    saveRecording,
    discardRecording,
    setRoutineName: store.setRoutineName,
    clearError: () => store.setError(null),
  };
}

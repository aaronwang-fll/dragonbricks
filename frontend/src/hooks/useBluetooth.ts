import { useCallback } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useConsoleStore } from '../stores/consoleStore';
import { useParser } from './useParser';
import {
  connectToHub,
  disconnectFromHub,
  uploadProgram,
  startProgram,
  stopProgram,
  isBluetoothSupported,
} from '../lib/bluetooth/pybricks';

function classifyOutput(text: string): 'stdout' | 'stderr' {
  // Pybricks sends a single stdout stream over BLE, but in practice runtime
  // errors show up as tracebacks. We classify these as "stderr" for UI.
  if (/\bTraceback\b/.test(text)) return 'stderr';
  if (/\b(Error|Exception)\b/.test(text)) return 'stderr';
  return 'stdout';
}

export function useBluetooth() {
  const { addStdout, addStderr, addStatus, clear: clearConsole } = useConsoleStore();

  const {
    status,
    setStatus,
    setProgramStatus,
    setError,
    disconnect: disconnectStore,
  } = useConnectionStore();

  const { generatedCode } = useParser();

  const isSupported = isBluetoothSupported();

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setStatus('connecting');
    setError(null);

    await connectToHub(
      (connectionStatus, error) => {
        if (connectionStatus === 'connected') {
          setStatus('connected');
          setError(null);
          addStatus('Hub connected.');
        } else if (connectionStatus === 'disconnected') {
          setStatus('disconnected');
          setProgramStatus('idle');
          addStatus('Hub disconnected.');
        } else if (connectionStatus === 'error') {
          setStatus('error');
          setError(error || 'Connection failed');
          addStatus(`Connection error: ${error || 'Connection failed'}`);
        }
      },
      (outputText) => {
        const kind = classifyOutput(outputText);
        if (kind === 'stderr') addStderr(outputText);
        else addStdout(outputText);
      },
      (hubStatus) => {
        if (hubStatus.programRunning) {
          setProgramStatus('running');
        } else {
          setProgramStatus('idle');
        }
      }
    );
  }, [isSupported, setStatus, setError, setProgramStatus, addStatus, addStdout, addStderr]);

  const disconnect = useCallback(async () => {
    await disconnectFromHub();
    disconnectStore();
    addStatus('Disconnected.');
  }, [disconnectStore, addStatus]);

  const run = useCallback(async () => {
    if (status !== 'connected') {
      setError('Not connected to hub');
      return false;
    }

    if (!generatedCode) {
      setError('No program to run. Enter some commands first.');
      return false;
    }

    // New run: clear old logs (matches Pybricks Code's terminal behavior)
    clearConsole();
    addStatus('Uploading program…');

    // Upload and run the backend-generated code
    const uploaded = await uploadProgram(generatedCode);
    if (!uploaded) {
      setError('Failed to upload program');
      addStatus('Upload failed.');
      return false;
    }

    addStatus('Starting program…');
    const started = await startProgram();
    if (!started) {
      setError('Failed to start program');
      addStatus('Start failed.');
      return false;
    }

    addStatus('Program running.');
    setProgramStatus('running');
    return true;
  }, [status, generatedCode, setError, setProgramStatus, clearConsole, addStatus]);

  const stop = useCallback(async () => {
    addStatus('Stopping program…');
    const stopped = await stopProgram();
    if (stopped) {
      addStatus('Program stopped.');
      setProgramStatus('stopped');
    } else {
      addStatus('Stop failed.');
    }
    return stopped;
  }, [setProgramStatus, addStatus]);

  const clearOutput = useCallback(() => {
    clearConsole();
  }, [clearConsole]);

  return {
    isSupported,
    status,
    connect,
    disconnect,
    run,
    stop,
    clearOutput,
  };
}

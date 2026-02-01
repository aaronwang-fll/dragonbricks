import { useCallback, useState } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useParser } from './useParser';
import {
  connectToHub,
  disconnectFromHub,
  uploadProgram,
  startProgram,
  stopProgram,
  isBluetoothSupported,
} from '../lib/bluetooth/pybricks';

export function useBluetooth() {
  const [output, setOutput] = useState<string[]>([]);

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
        } else if (connectionStatus === 'disconnected') {
          setStatus('disconnected');
          setProgramStatus('idle');
        } else if (connectionStatus === 'error') {
          setStatus('error');
          setError(error || 'Connection failed');
        }
      },
      (outputText) => {
        setOutput(prev => [...prev, outputText]);
      },
      (hubStatus) => {
        if (hubStatus.programRunning) {
          setProgramStatus('running');
        } else {
          setProgramStatus('idle');
        }
      }
    );
  }, [isSupported, setStatus, setError, setProgramStatus]);

  const disconnect = useCallback(async () => {
    await disconnectFromHub();
    disconnectStore();
    setOutput([]);
  }, [disconnectStore]);

  const run = useCallback(async () => {
    if (status !== 'connected') {
      setError('Not connected to hub');
      return false;
    }

    if (!generatedCode) {
      setError('No program to run. Enter some commands first.');
      return false;
    }

    // Upload and run the backend-generated code
    const uploaded = await uploadProgram(generatedCode);
    if (!uploaded) {
      setError('Failed to upload program');
      return false;
    }

    const started = await startProgram();
    if (!started) {
      setError('Failed to start program');
      return false;
    }

    setProgramStatus('running');
    return true;
  }, [status, generatedCode, setError, setProgramStatus]);

  const stop = useCallback(async () => {
    const stopped = await stopProgram();
    if (stopped) {
      setProgramStatus('stopped');
    }
    return stopped;
  }, [setProgramStatus]);

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  return {
    isSupported,
    status,
    output,
    connect,
    disconnect,
    run,
    stop,
    clearOutput,
  };
}

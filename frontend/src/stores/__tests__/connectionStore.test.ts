import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '../connectionStore';

describe('connectionStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useConnectionStore.setState({
      status: 'disconnected',
      programStatus: 'idle',
      device: null,
      error: null,
    });
  });

  describe('connection status', () => {
    it('has initial disconnected status', () => {
      expect(useConnectionStore.getState().status).toBe('disconnected');
    });

    it('sets status to connecting', () => {
      useConnectionStore.getState().setStatus('connecting');
      expect(useConnectionStore.getState().status).toBe('connecting');
    });

    it('sets status to connected', () => {
      useConnectionStore.getState().setStatus('connected');
      expect(useConnectionStore.getState().status).toBe('connected');
    });

    it('sets status to error', () => {
      useConnectionStore.getState().setStatus('error');
      expect(useConnectionStore.getState().status).toBe('error');
    });
  });

  describe('program status', () => {
    it('has initial idle status', () => {
      expect(useConnectionStore.getState().programStatus).toBe('idle');
    });

    it('sets program status to running', () => {
      useConnectionStore.getState().setProgramStatus('running');
      expect(useConnectionStore.getState().programStatus).toBe('running');
    });

    it('sets program status to paused', () => {
      useConnectionStore.getState().setProgramStatus('paused');
      expect(useConnectionStore.getState().programStatus).toBe('paused');
    });

    it('sets program status to stopped', () => {
      useConnectionStore.getState().setProgramStatus('stopped');
      expect(useConnectionStore.getState().programStatus).toBe('stopped');
    });
  });

  describe('device management', () => {
    it('has no device initially', () => {
      expect(useConnectionStore.getState().device).toBeNull();
    });

    it('sets device', () => {
      const device = { id: 'hub-1', name: 'SPIKE Hub' };
      useConnectionStore.getState().setDevice(device);
      expect(useConnectionStore.getState().device).toEqual(device);
    });

    it('clears device', () => {
      const device = { id: 'hub-1', name: 'SPIKE Hub' };
      useConnectionStore.getState().setDevice(device);
      useConnectionStore.getState().setDevice(null);
      expect(useConnectionStore.getState().device).toBeNull();
    });
  });

  describe('error handling', () => {
    it('has no error initially', () => {
      expect(useConnectionStore.getState().error).toBeNull();
    });

    it('sets error message', () => {
      useConnectionStore.getState().setError('Connection failed');
      expect(useConnectionStore.getState().error).toBe('Connection failed');
    });

    it('clears error', () => {
      useConnectionStore.getState().setError('Connection failed');
      useConnectionStore.getState().setError(null);
      expect(useConnectionStore.getState().error).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('resets all state on disconnect', () => {
      // Set some state
      useConnectionStore.getState().setStatus('connected');
      useConnectionStore.getState().setProgramStatus('running');
      useConnectionStore.getState().setDevice({ id: 'hub-1', name: 'SPIKE Hub' });
      useConnectionStore.getState().setError('Some error');

      // Disconnect
      useConnectionStore.getState().disconnect();

      // Verify all reset
      const state = useConnectionStore.getState();
      expect(state.status).toBe('disconnected');
      expect(state.programStatus).toBe('idle');
      expect(state.device).toBeNull();
      expect(state.error).toBeNull();
    });
  });
});

import { useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { parseCommand } from '../lib/parser';
import type { ParsedCommand } from '../types';

export function useParser() {
  const { defaults, setCommands, updateCommand } = useEditorStore();

  const parseInput = useCallback((input: string): ParsedCommand[] => {
    // Split input into lines, each line is a command
    const lines = input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#')); // Skip empty lines and comments

    const commands: ParsedCommand[] = lines.map((line, index) => {
      const result = parseCommand(line, defaults);

      return {
        id: `cmd-${index}-${Date.now()}`,
        naturalLanguage: line,
        pythonCode: result.pythonCode || null,
        status: result.success
          ? 'parsed'
          : result.needsClarification
            ? 'needs-clarification'
            : 'error',
        clarification: result.needsClarification,
        error: result.error,
      };
    });

    setCommands(commands);
    return commands;
  }, [defaults, setCommands]);

  const parseSingleCommand = useCallback((input: string): ParsedCommand => {
    const result = parseCommand(input, defaults);

    return {
      id: `cmd-${Date.now()}`,
      naturalLanguage: input,
      pythonCode: result.pythonCode || null,
      status: result.success
        ? 'parsed'
        : result.needsClarification
          ? 'needs-clarification'
          : 'error',
      clarification: result.needsClarification,
      error: result.error,
    };
  }, [defaults]);

  const resolveClarification = useCallback((
    commandId: string,
    field: string,
    value: string
  ) => {
    const { commands } = useEditorStore.getState();
    const command = commands.find(c => c.id === commandId);

    if (!command) return;

    // Append the clarified value to the original command and re-parse
    let updatedInput = command.naturalLanguage;

    if (field === 'distance') {
      updatedInput = `${updatedInput} ${value}mm`;
    } else if (field === 'angle') {
      updatedInput = `${updatedInput} ${value} degrees`;
    } else if (field === 'duration') {
      updatedInput = `${updatedInput} ${value} seconds`;
    }

    const result = parseCommand(updatedInput, defaults);

    updateCommand(commandId, {
      naturalLanguage: updatedInput,
      pythonCode: result.pythonCode || null,
      status: result.success ? 'parsed' : 'error',
      clarification: undefined,
      error: result.error,
    });
  }, [defaults, updateCommand]);

  const generateFullProgram = useCallback((): string => {
    const { commands } = useEditorStore.getState();

    const pythonLines = commands
      .filter(cmd => cmd.status === 'parsed' && cmd.pythonCode)
      .map(cmd => cmd.pythonCode);

    return pythonLines.join('\n');
  }, []);

  return {
    parseInput,
    parseSingleCommand,
    resolveClarification,
    generateFullProgram,
  };
}

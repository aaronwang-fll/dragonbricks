import { useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { parseCommand } from '../lib/parser';
import { extractRoutines, isRoutineCall, generateRoutineCall } from '../lib/parser/routines';
import { parsewithLLM } from '../lib/parser/llmParser';
import type { ParsedCommand, Routine } from '../types';

export function useParser() {
  const { defaults, setCommands, updateCommand, currentProgram, updateProgram, llmConfig } = useEditorStore();

  const parseInput = useCallback((input: string): ParsedCommand[] => {
    // First, extract routine definitions from the input
    const { routines: parsedRoutines, mainCode } = extractRoutines(input, defaults);

    // Get existing routine names for routine call detection
    const existingRoutines = currentProgram?.routines || [];
    const routineNames = [
      ...existingRoutines.map(r => r.name),
      ...parsedRoutines.map(r => r.routine.name),
    ];

    // If we found new routine definitions, save them
    if (parsedRoutines.length > 0 && currentProgram) {
      const newRoutines: Routine[] = parsedRoutines.map(pr => pr.routine);
      // Merge with existing, avoiding duplicates by name
      const mergedRoutines = [...existingRoutines];
      for (const newRoutine of newRoutines) {
        const existingIdx = mergedRoutines.findIndex(r => r.name === newRoutine.name);
        if (existingIdx >= 0) {
          mergedRoutines[existingIdx] = newRoutine;
        } else {
          mergedRoutines.push(newRoutine);
        }
      }
      updateProgram(currentProgram.id, { routines: mergedRoutines });
    }

    // Parse the main code (non-routine lines)
    const commands: ParsedCommand[] = mainCode.map((line, index) => {
      // First check if this is a routine call
      const routineCheck = isRoutineCall(line, routineNames);
      if (routineCheck.isCall && routineCheck.routineName) {
        const args: Record<string, string | number> = {};
        if (routineCheck.args) {
          routineCheck.args.forEach((arg, i) => {
            args[`arg${i}`] = arg;
          });
        }
        const pythonCode = generateRoutineCall(routineCheck.routineName, args);
        return {
          id: `cmd-${index}-${Date.now()}`,
          naturalLanguage: line,
          pythonCode,
          status: 'parsed' as const,
        };
      }

      // Otherwise parse as regular command
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
  }, [defaults, setCommands, currentProgram, updateProgram]);

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

  // Parse with LLM fallback for complex commands
  const parseWithLLMFallback = useCallback(async (
    commandId: string,
    input: string
  ): Promise<void> => {
    if (!llmConfig.enabled || !llmConfig.apiKey) {
      return;
    }

    // Update status to show we're processing
    updateCommand(commandId, {
      status: 'pending',
      error: 'Processing with AI...',
    });

    try {
      const result = await parsewithLLM(input, {
        provider: llmConfig.provider === 'none' ? 'openai' : llmConfig.provider,
        apiKey: llmConfig.apiKey,
        model: llmConfig.model,
      });

      if (result.success && result.pythonCode) {
        updateCommand(commandId, {
          pythonCode: result.pythonCode,
          status: 'parsed',
          error: undefined,
        });
      } else {
        updateCommand(commandId, {
          status: 'error',
          error: result.error || 'AI parsing failed',
        });
      }
    } catch (error) {
      updateCommand(commandId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'AI parsing failed',
      });
    }
  }, [llmConfig, updateCommand]);

  // Check if a command can benefit from LLM parsing
  const canUseLLM = useCallback((): boolean => {
    return llmConfig.enabled && !!llmConfig.apiKey && llmConfig.provider !== 'none';
  }, [llmConfig]);

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
    parseWithLLMFallback,
    canUseLLM,
  };
}

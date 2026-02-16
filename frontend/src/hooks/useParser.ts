import { useCallback, useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { api } from '../lib/api';
import type { RobotConfig } from '../lib/api';
import type { ParsedCommand } from '../types';

export function useParser() {
  const {
    defaults,
    setCommands,
    updateCommand,
    currentProgram,
    setIsAiProcessing,
    generatedCode,
    setGeneratedCode,
  } = useEditorStore();
  const [isLoading, setIsLoading] = useState(false);

  // Convert frontend defaults to backend RobotConfig
  const getConfig = useCallback((): RobotConfig => ({
    left_motor_port: defaults.leftMotorPort || 'A',
    right_motor_port: defaults.rightMotorPort || 'B',
    wheel_diameter: defaults.wheelDiameter || 56,
    axle_track: defaults.axleTrack || 112,
    speed: defaults.speed || 200,
    acceleration: defaults.acceleration || 700,
    turn_rate: defaults.turnRate || 150,
    turn_acceleration: defaults.turnAcceleration || 300,
    motor_speed: defaults.motorSpeed || 200,
    attachment1_port: defaults.attachment1Port !== 'None' ? defaults.attachment1Port : undefined,
    attachment2_port: defaults.attachment2Port !== 'None' ? defaults.attachment2Port : undefined,
    color_sensor_port: defaults.colorSensorPort !== 'None' ? defaults.colorSensorPort : undefined,
    ultrasonic_port: defaults.ultrasonicPort !== 'None' ? defaults.ultrasonicPort : undefined,
    force_port: defaults.forcePort !== 'None' ? defaults.forcePort : undefined,
  }), [defaults]);

  // Process commands that need LLM parsing
  const processLlmCommands = useCallback(async (
    commands: ParsedCommand[],
    needsLlmIds: Set<string>,
    config: RobotConfig
  ): Promise<void> => {
    if (needsLlmIds.size === 0) return;

    // Check authentication
    const token = api.getToken();
    if (!token) {
      // Mark all needs_llm commands as errors
      needsLlmIds.forEach(id => {
        updateCommand(id, {
          status: 'error',
          error: 'Sign in to use AI',
        });
      });
      return;
    }

    setIsAiProcessing(true);

    try {
      const routines = currentProgram?.routines?.map(r => ({
        name: r.name,
        parameters: r.parameters,
        body: r.body,
      })) || [];

      // Batch process all needs_llm commands with Promise.all
      const llmPromises = commands
        .filter(cmd => needsLlmIds.has(cmd.id))
        .map(async (cmd) => {
          try {
            const response = await api.llmParse(cmd.naturalLanguage, {
              config,
              routines,
              previous_commands: commands
                .filter(c => c.status === 'parsed' && c.pythonCode)
                .map(c => c.naturalLanguage),
            });

            if (response.success && response.python_code) {
              updateCommand(cmd.id, {
                pythonCode: response.python_code,
                status: 'parsed',
                error: undefined,
              });
            } else {
              updateCommand(cmd.id, {
                status: 'error',
                error: response.error || 'AI parsing failed',
              });
            }
          } catch (error) {
            updateCommand(cmd.id, {
              status: 'error',
              error: error instanceof Error ? error.message : 'AI parsing failed',
            });
          }
        });

      await Promise.all(llmPromises);
    } finally {
      setIsAiProcessing(false);
    }
  }, [updateCommand, setIsAiProcessing, currentProgram]);

  const parseInput = useCallback(async (input: string): Promise<ParsedCommand[]> => {
    const lines = input.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      setCommands([]);
      setGeneratedCode('');
      return [];
    }

    setIsLoading(true);

    try {
      const config = getConfig();
      const routines = currentProgram?.routines?.map(r => ({
        name: r.name,
        parameters: r.parameters,
        body: r.body,
      })) || [];

      const response = await api.parseCommands(lines, config, routines);

      // Track which commands need LLM processing
      const needsLlmIds = new Set<string>();

      const commands: ParsedCommand[] = response.results.map((result, index) => {
        const id = `cmd-${index}-${Date.now()}`;
        const needsLlm = result.status === 'needs_llm';
        
        if (needsLlm) {
          needsLlmIds.add(id);
        }

        return {
          id,
          naturalLanguage: result.original,
          pythonCode: result.python_code || null,
          status: result.status === 'parsed' ? 'parsed' :
                  result.status === 'needs_clarification' ? 'needs-clarification' :
                  result.status === 'needs_llm' ? 'pending' : 'error',
          clarification: result.clarification,
          error: result.error,
        };
      });

      setCommands(commands);
      setGeneratedCode(response.generated_code);

      // Process LLM commands asynchronously (don't block return)
      if (needsLlmIds.size > 0) {
        // Use setTimeout to avoid blocking and prevent infinite loops
        setTimeout(() => {
          processLlmCommands(commands, needsLlmIds, config);
        }, 0);
      }

      return commands;
    } catch (error) {
      // Fallback: mark all commands as errors
      const commands: ParsedCommand[] = lines.map((line, index) => ({
        id: `cmd-${index}-${Date.now()}`,
        naturalLanguage: line,
        pythonCode: null,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Parsing failed',
      }));
      setCommands(commands);
      setGeneratedCode('');
      return commands;
    } finally {
      setIsLoading(false);
    }
  }, [getConfig, setCommands, currentProgram, processLlmCommands, setGeneratedCode]);

  // Synchronous version for compatibility - preserves existing results while parsing
  const parseInputSync = useCallback((input: string): ParsedCommand[] => {
    const lines = input.split('\n').filter(line => line.trim());
    const { commands: existingCommands } = useEditorStore.getState();

    // Preserve existing command data for lines that haven't changed
    const commands: ParsedCommand[] = lines.map((line, index) => {
      const existing = existingCommands[index];
      // If line text matches, keep existing parsed result
      if (existing && existing.naturalLanguage === line && existing.pythonCode) {
        return existing;
      }
      // Otherwise create new pending command
      return {
        id: `cmd-${index}-${Date.now()}`,
        naturalLanguage: line,
        pythonCode: null,
        status: 'pending' as const,
      };
    });

    setCommands(commands);

    // Trigger async parse
    parseInput(input);

    return commands;
  }, [setCommands, parseInput]);

  const resolveClarification = useCallback(async (
    commandId: string,
    field: string,
    value: string
  ) => {
    const { commands } = useEditorStore.getState();
    const command = commands.find(c => c.id === commandId);

    if (!command) return;

    // Append the clarified value to the original command
    let updatedInput = command.naturalLanguage;

    if (field === 'distance') {
      updatedInput = `${updatedInput} ${value}mm`;
    } else if (field === 'angle') {
      updatedInput = `${updatedInput} ${value} degrees`;
    } else if (field === 'duration') {
      updatedInput = `${updatedInput} ${value} seconds`;
    }

    // Re-parse with updated input
    try {
      const config = getConfig();
      const response = await api.parseCommands([updatedInput], config, []);
      const result = response.results[0];

      if (result) {
        updateCommand(commandId, {
          naturalLanguage: updatedInput,
          pythonCode: result.python_code || null,
          status: result.status === 'parsed' ? 'parsed' : 'error',
          clarification: undefined,
          error: result.error,
        });
      }
    } catch (error) {
      updateCommand(commandId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Parsing failed',
      });
    }
  }, [getConfig, updateCommand]);

  const generateFullProgram = useCallback((): string => {
    return generatedCode;
  }, [generatedCode]);

  return {
    parseInput: parseInputSync, // Use sync version for backward compatibility
    parseInputAsync: parseInput,
    resolveClarification,
    generateFullProgram,
    isLoading,
    generatedCode,
  };
}

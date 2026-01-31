import type { Routine } from '../../types';
import { parseCommand } from './index';
import type { Defaults } from '../../types';

export interface ParsedRoutine {
  routine: Routine;
  pythonCode: string;
  errors: string[];
}

/**
 * Parse a routine definition from natural language
 *
 * Format:
 *   Define [name]:
 *   Define [name] with [param1], [param2]:
 *
 * Example:
 *   Define turn_around:
 *     turn right 180 degrees
 *
 *   Define move_and_turn with distance, angle:
 *     move forward distance
 *     turn right angle
 */
export function parseRoutineDefinition(
  lines: string[],
  defaults: Defaults
): ParsedRoutine | null {
  if (lines.length === 0) return null;

  const firstLine = lines[0].trim();

  // Check for "Define [name]:" pattern
  const defineMatch = firstLine.match(/^define\s+(\w+)(?:\s+with\s+(.+))?:$/i);
  if (!defineMatch) return null;

  const name = defineMatch[1];
  const paramsStr = defineMatch[2];
  const parameters = paramsStr
    ? paramsStr.split(',').map(p => p.trim()).filter(Boolean)
    : [];

  // Parse the body (remaining lines)
  const bodyLines = lines.slice(1).filter(line => line.trim().length > 0);
  const errors: string[] = [];
  const pythonLines: string[] = [];

  for (const line of bodyLines) {
    const trimmed = line.trim();

    // Check if line contains a parameter reference
    let processedLine = trimmed;
    for (const param of parameters) {
      // Replace parameter names with Python variable syntax
      const paramRegex = new RegExp(`\\b${param}\\b`, 'gi');
      processedLine = processedLine.replace(paramRegex, `{${param}}`);
    }

    // Try to parse the command
    const result = parseCommand(processedLine, defaults);
    if (result.success && result.pythonCode) {
      // Replace parameter placeholders with f-string format
      let pythonCode = result.pythonCode;
      for (const param of parameters) {
        pythonCode = pythonCode.replace(`{${param}}`, `{${param}}`);
      }
      pythonLines.push(pythonCode);
    } else if (result.error) {
      errors.push(`Line "${trimmed}": ${result.error}`);
    }
  }

  // Generate Python function
  const pythonParams = parameters.join(', ');
  const pythonBody = pythonLines.length > 0
    ? pythonLines.map(line => `    ${line}`).join('\n')
    : '    pass';

  const pythonCode = `def ${name}(${pythonParams}):\n${pythonBody}`;

  const routine: Routine = {
    id: `routine-${name}-${Date.now()}`,
    name,
    parameters,
    body: bodyLines.join('\n'),
  };

  return { routine, pythonCode, errors };
}

/**
 * Extract routine definitions from input text
 */
export function extractRoutines(
  input: string,
  defaults: Defaults
): { routines: ParsedRoutine[]; mainCode: string[] } {
  // Split on newlines, then also split each line on semicolons (for multiple commands per line)
  const rawLines = input.split('\n');
  const lines: string[] = [];
  for (const rawLine of rawLines) {
    // Don't split routine definitions on semicolons
    if (rawLine.trim().toLowerCase().startsWith('define ')) {
      lines.push(rawLine);
    } else {
      // Split on semicolons for regular commands
      const parts = rawLine.split(';').map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        lines.push(...parts);
      } else if (rawLine.trim() === '') {
        lines.push(''); // preserve empty lines
      }
    }
  }
  const routines: ParsedRoutine[] = [];
  const mainCode: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Check if this starts a routine definition
    if (line.toLowerCase().startsWith('define ') && line.endsWith(':')) {
      // Collect all indented lines as the routine body
      const routineLines = [line];
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        // Check if line is indented (part of routine body)
        if (nextLine.match(/^\s+/) && nextLine.trim().length > 0) {
          routineLines.push(nextLine);
          i++;
        } else if (nextLine.trim().length === 0) {
          // Empty line - might be end of routine or just spacing
          i++;
          // Peek at next line to see if routine continues
          if (i < lines.length && lines[i].match(/^\s+/)) {
            routineLines.push(nextLine);
          } else {
            break;
          }
        } else {
          break;
        }
      }

      const parsed = parseRoutineDefinition(routineLines, defaults);
      if (parsed) {
        routines.push(parsed);
      }
    } else if (line.length > 0 && !line.startsWith('#')) {
      mainCode.push(line);
      i++;
    } else {
      i++;
    }
  }

  return { routines, mainCode };
}

/**
 * Generate Python code for calling a routine
 */
export function generateRoutineCall(
  routineName: string,
  args: Record<string, string | number>
): string {
  const argsList = Object.values(args).join(', ');
  return `${routineName}(${argsList})`;
}

/**
 * Check if a command is a routine call
 */
export function isRoutineCall(
  input: string,
  routineNames: string[]
): { isCall: boolean; routineName?: string; args?: string[] } {
  const trimmed = input.trim().toLowerCase();

  for (const name of routineNames) {
    // Check for "run [routine_name]" or "call [routine_name]" or just "[routine_name]"
    const patterns = [
      new RegExp(`^run\\s+${name}(?:\\s+with\\s+(.+))?$`, 'i'),
      new RegExp(`^call\\s+${name}(?:\\s+with\\s+(.+))?$`, 'i'),
      new RegExp(`^${name}(?:\\s+with\\s+(.+))?$`, 'i'),
      new RegExp(`^${name}\\s*\\((.*)\\)$`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const argsStr = match[1];
        const args = argsStr
          ? argsStr.split(',').map(a => a.trim()).filter(Boolean)
          : [];
        return { isCall: true, routineName: name, args };
      }
    }
  }

  return { isCall: false };
}

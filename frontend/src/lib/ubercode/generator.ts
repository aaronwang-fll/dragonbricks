import type { ButtonMapping, HubButton } from '../../types/ubercode';
import { PYBRICKS_BUTTON_MAP } from '../../types/ubercode';

export interface SharedSetup {
  imports: string;
  setup: string;
}

export interface RunCode {
  name: string;
  mainCode: string;
}

/**
 * Generates a combined "UberCode" program from multiple runs.
 *
 * Structure:
 *   1. Imports (merged, with Button added)
 *   2. Shared setup (motors, sensors, drivebase)
 *   3. Run functions (def run_1, def run_2, ...)
 *   4. Menu loop (hub buttons to navigate & execute runs)
 */
export function generateUberCode(
  shared: SharedSetup,
  runs: RunCode[],
  buttonMapping: ButtonMapping,
): string {
  const lines: string[] = [];

  // --- 1. Imports ---
  let imports = shared.imports;
  if (!imports.includes('from pybricks.parameters import')) {
    imports += '\nfrom pybricks.parameters import Button';
  } else if (!imports.includes('Button')) {
    imports = imports.replace(
      /from pybricks\.parameters import (.+)/,
      'from pybricks.parameters import $1, Button',
    );
  }
  if (!imports.includes('from pybricks.tools import')) {
    imports += '\nfrom pybricks.tools import wait';
  }
  lines.push(imports);
  lines.push('');

  // --- 2. Setup ---
  lines.push(shared.setup);
  lines.push('');

  // --- 3. Run functions ---
  runs.forEach((run, i) => {
    const num = i + 1;
    lines.push(`# Run ${num}: ${run.name}`);
    lines.push(`def run_${num}():`);
    const body = run.mainCode.trim();
    if (!body) {
      lines.push('    pass');
    } else {
      for (const bodyLine of body.split('\n')) {
        lines.push(`    ${bodyLine}`);
      }
    }
    lines.push('');
  });

  // --- 4. Menu loop ---
  const runList = runs.map((_, i) => `run_${i + 1}`).join(', ');
  lines.push(`runs = [${runList}]`);
  lines.push('current = 0');
  lines.push('');
  lines.push('while True:');
  lines.push('    hub.display.number(current + 1)');
  lines.push('    while not hub.buttons.pressed():');
  lines.push('        wait(50)');
  lines.push('    pressed = hub.buttons.pressed()');
  lines.push('    while hub.buttons.pressed():');
  lines.push('        wait(50)');

  const actionMap = buildActionMap(buttonMapping);
  let first = true;
  for (const [action, pybricksButton] of actionMap) {
    const keyword = first ? '    if' : '    elif';
    first = false;

    if (action === 'run') {
      lines.push(`${keyword} ${pybricksButton} in pressed:`);
      lines.push('        runs[current]()');
      lines.push('        current = (current + 1) % len(runs)');
    } else if (action === 'next') {
      lines.push(`${keyword} ${pybricksButton} in pressed:`);
      lines.push('        current = (current + 1) % len(runs)');
    } else if (action === 'previous') {
      lines.push(`${keyword} ${pybricksButton} in pressed:`);
      lines.push('        current = (current - 1) % len(runs)');
    } else if (action === 'stop') {
      lines.push(`${keyword} ${pybricksButton} in pressed:`);
      lines.push('        raise SystemExit');
    }
  }

  lines.push('');
  return lines.join('\n');
}

function buildActionMap(mapping: ButtonMapping): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  const priorityOrder: Array<{ action: string; button: HubButton }> = [];

  for (const button of ['center', 'left', 'right', 'bluetooth'] as HubButton[]) {
    const action = mapping[button];
    if (action !== 'unused') {
      priorityOrder.push({ action, button });
    }
  }

  const actionPriority: Record<string, number> = { run: 0, next: 1, previous: 2, stop: 3 };
  priorityOrder.sort((a, b) => (actionPriority[a.action] ?? 9) - (actionPriority[b.action] ?? 9));

  for (const { action, button } of priorityOrder) {
    result.push([action, PYBRICKS_BUTTON_MAP[button]]);
  }

  return result;
}

/**
 * MicroPython compilation using mpy-cross WebAssembly.
 *
 * Pybricks hubs require compiled .mpy bytecode, not raw Python source.
 * Different firmware versions require different MPY ABI versions:
 * - v6: Pybricks firmware 3.3+ (newer)
 * - v5: Older Pybricks firmware
 */

import { compile as mpyCrossCompileV6 } from '@pybricks/mpy-cross-v6';
import { compile as mpyCrossCompileV5 } from '@pybricks/mpy-cross-v5';

export interface CompileResult {
  success: boolean;
  mpy?: Uint8Array;
  errors: string[];
  abiVersion?: number;
}

// Paths to wasm files in public directory
const WASM_PATH_V6 = '/wasm/mpy-cross-v6.wasm';
const WASM_PATH_V5 = '/wasm/mpy-cross-v5.wasm';

/**
 * Compile Python source code to MPY bytecode for Pybricks.
 * Tries MPY ABI v5 first (more compatible with current Pybricks firmware),
 * then falls back to v6 if needed.
 *
 * @param source Python source code
 * @param preferV6 If true, try v6 first (for newer firmware)
 * @returns Compiled MPY bytecode or error
 */
export async function compilePython(source: string, preferV6 = false): Promise<CompileResult> {
  // Try v5 first (works with most current Pybricks firmware)
  const compilers = preferV6
    ? [
        { compile: mpyCrossCompileV6, path: WASM_PATH_V6, version: 6 },
        { compile: mpyCrossCompileV5, path: WASM_PATH_V5, version: 5 },
      ]
    : [
        { compile: mpyCrossCompileV5, path: WASM_PATH_V5, version: 5 },
        { compile: mpyCrossCompileV6, path: WASM_PATH_V6, version: 6 },
      ];

  const allErrors: string[] = [];

  for (const { compile, path, version } of compilers) {
    try {
      console.log(`[Compile] Trying MPY ABI v${version}...`);
      const result = await compile('__main__.py', source, [], path);

      if (result.status !== 0 || !result.mpy) {
        // Compilation failed with this version
        const errors = [...result.err, ...result.out].filter(Boolean);
        console.warn(`[Compile] v${version} failed:`, errors);
        allErrors.push(`v${version}: ${errors.join(', ') || 'Unknown error'}`);
        continue; // Try next version
      }

      console.log(`[Compile] Success with v${version}: ${source.length} bytes source → ${result.mpy.length} bytes mpy`);
      return {
        success: true,
        mpy: result.mpy,
        errors: [],
        abiVersion: version,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Compile] v${version} exception:`, message);
      allErrors.push(`v${version}: ${message}`);
      continue; // Try next version
    }
  }

  // All versions failed
  console.error('[Compile] All MPY versions failed:', allErrors);
  return {
    success: false,
    errors: allErrors.length > 0 ? allErrors : ['Compilation failed with all MPY versions'],
  };
}

/**
 * MicroPython compilation using mpy-cross WebAssembly.
 *
 * Pybricks hubs require compiled .mpy bytecode, not raw Python source.
 */

import { compile as mpyCrossCompile } from '@pybricks/mpy-cross-v6';

export interface CompileResult {
  success: boolean;
  mpy?: Uint8Array;
  errors: string[];
}

// Path to the wasm file in public directory
const WASM_PATH = '/wasm/mpy-cross-v6.wasm';

/**
 * Compile Python source code to MPY bytecode for Pybricks.
 *
 * @param source Python source code
 * @returns Compiled MPY bytecode or error
 */
export async function compilePython(source: string): Promise<CompileResult> {
  try {
    // mpy-cross requires a filename and path to wasm file
    const result = await mpyCrossCompile('__main__.py', source, [], WASM_PATH);

    if (result.status !== 0 || !result.mpy) {
      // Compilation failed
      const errors = [...result.err];
      if (result.out.length > 0) {
        errors.push(...result.out);
      }
      console.error('[Compile] mpy-cross failed:', errors);
      return {
        success: false,
        errors: errors.length > 0 ? errors : ['Unknown compilation error'],
      };
    }

    console.log(`[Compile] Success: ${source.length} bytes source → ${result.mpy.length} bytes mpy`);
    return {
      success: true,
      mpy: result.mpy,
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Compile] Exception:', message);
    return {
      success: false,
      errors: [message],
    };
  }
}

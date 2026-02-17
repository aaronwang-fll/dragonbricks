/**
 * MicroPython compilation using mpy-cross WebAssembly.
 *
 * Pybricks hubs require compiled .mpy bytecode in a specific multi-mpy format:
 * [4 bytes: size][module name + \0][mpy bytes]
 *
 * Different firmware versions require different MPY ABI versions:
 * - v6: Pybricks firmware 3.3+
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

const encoder = new TextEncoder();

/**
 * Converts string to null-terminated C string.
 */
function cString(str: string): Uint8Array {
  return encoder.encode(str + '\x00');
}

/**
 * Encodes value as 32-bit unsigned integer in little endian order.
 */
function encodeUInt32LE(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, value, true);
  return buf;
}

/**
 * Wraps MPY bytecode in Pybricks multi-mpy format.
 * Format: [4 bytes: size][module name + \0][mpy bytes]
 */
function wrapInMultiMpy(mpy: Uint8Array, moduleName = '__main__'): Uint8Array {
  const sizeBytes = encodeUInt32LE(mpy.length);
  const nameBytes = cString(moduleName);
  
  // Combine: size + name + mpy
  const result = new Uint8Array(sizeBytes.length + nameBytes.length + mpy.length);
  result.set(sizeBytes, 0);
  result.set(nameBytes, sizeBytes.length);
  result.set(mpy, sizeBytes.length + nameBytes.length);
  
  return result;
}

/**
 * Compile Python source code to MPY bytecode for Pybricks.
 * Tries MPY ABI v5 first (more compatible with current Pybricks firmware),
 * then falls back to v6 if needed.
 *
 * @param source Python source code
 * @param preferV6 If true, try v6 first (for newer firmware)
 * @returns Compiled MPY bytecode wrapped in multi-mpy format
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
      // Use 'main.py' as filename (matches Pybricks Code)
      const result = await compile('main.py', source, [], path);

      if (result.status !== 0 || !result.mpy) {
        // Compilation failed with this version
        const errors = [...result.err, ...result.out].filter(Boolean);
        console.warn(`[Compile] v${version} failed:`, errors);
        allErrors.push(`v${version}: ${errors.join(', ') || 'Unknown error'}`);
        continue; // Try next version
      }

      // Wrap in multi-mpy format with __main__ module name
      const wrappedMpy = wrapInMultiMpy(result.mpy, '__main__');
      
      console.log(`[Compile] Success with v${version}: ${source.length} bytes source → ${result.mpy.length} bytes mpy → ${wrappedMpy.length} bytes wrapped`);
      return {
        success: true,
        mpy: wrappedMpy,
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

/**
 * LLM Parser - Uses an AI model to parse complex natural language commands
 * that can't be handled by the rule-based parser.
 */

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface LLMParseResult {
  success: boolean;
  pythonCode?: string;
  error?: string;
  explanation?: string;
}

const SYSTEM_PROMPT = `You are a Pybricks code generator for LEGO SPIKE Prime robots.
Convert natural language commands into Python code that uses the Pybricks library.

Available devices:
- hub: PrimeHub with imu (gyro), buttons, speaker
- left, right: Drive motors
- robot: DriveBase for coordinated movement
- left_attachment, right_attachment: Attachment motors
- left_light, right_light: Color sensors
- distance_sensor: Ultrasonic sensor (if configured)

Common Pybricks functions:
- robot.straight(distance_mm) - Move straight
- robot.turn(angle_degrees) - Turn in place
- robot.curve(radius, angle) - Arc movement
- motor.run_angle(speed, angle) - Run motor to angle
- motor.run_time(speed, time_ms) - Run motor for time
- wait(ms) - Wait in milliseconds
- hub.imu.heading() - Get gyro heading
- sensor.reflection() - Get light reflection (0-100)
- sensor.color() - Get detected color
- sensor.distance() - Get ultrasonic distance

For loops: for i in range(n):
For parallel: async def and multitask()
For conditions: if/while with sensor readings

Output ONLY the Python code, no explanations. Use proper indentation.`;

export async function parsewithLLM(
  input: string,
  config: LLMConfig
): Promise<LLMParseResult> {
  if (!config.apiKey && config.provider !== 'local') {
    return {
      success: false,
      error: 'API key required for LLM parsing',
    };
  }

  try {
    if (config.provider === 'openai') {
      return await parseWithOpenAI(input, config);
    } else if (config.provider === 'anthropic') {
      return await parseWithAnthropic(input, config);
    } else {
      return {
        success: false,
        error: 'Unsupported LLM provider',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'LLM parsing failed',
    };
  }
}

async function parseWithOpenAI(
  input: string,
  config: LLMConfig
): Promise<LLMParseResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Convert this to Pybricks Python code:\n\n${input}` },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `OpenAI API error: ${error}` };
  }

  const data = await response.json();
  const code = data.choices?.[0]?.message?.content?.trim();

  if (!code) {
    return { success: false, error: 'No code generated' };
  }

  // Clean up code - remove markdown code blocks if present
  const cleanCode = code
    .replace(/^```python\n?/gm, '')
    .replace(/^```\n?/gm, '')
    .trim();

  return {
    success: true,
    pythonCode: cleanCode,
  };
}

async function parseWithAnthropic(
  input: string,
  config: LLMConfig
): Promise<LLMParseResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Convert this to Pybricks Python code:\n\n${input}` },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Anthropic API error: ${error}` };
  }

  const data = await response.json();
  const code = data.content?.[0]?.text?.trim();

  if (!code) {
    return { success: false, error: 'No code generated' };
  }

  // Clean up code - remove markdown code blocks if present
  const cleanCode = code
    .replace(/^```python\n?/gm, '')
    .replace(/^```\n?/gm, '')
    .trim();

  return {
    success: true,
    pythonCode: cleanCode,
  };
}

// Helper to check if LLM is configured
export function isLLMConfigured(config: LLMConfig | null): boolean {
  if (!config) return false;
  if (config.provider === 'local') return true;
  return !!config.apiKey;
}

// Sample prompts for common FLL patterns
export const EXAMPLE_PROMPTS = [
  {
    input: 'repeat 3 times: move forward 100mm then turn right 90 degrees',
    description: 'Loop with multiple actions',
  },
  {
    input: 'follow the line until the color sensor sees red',
    description: 'Line following with sensor condition',
  },
  {
    input: 'simultaneously move forward 200mm and rotate the arm 180 degrees',
    description: 'Parallel execution',
  },
  {
    input: 'if distance sensor reads less than 50mm then stop otherwise continue forward',
    description: 'Conditional with sensor',
  },
  {
    input: 'turn right 45 degrees precisely using the gyro',
    description: 'Precise gyro-based turn',
  },
  {
    input: 'run the grabber motor 360 degrees at speed 500',
    description: 'Attachment motor control',
  },
];

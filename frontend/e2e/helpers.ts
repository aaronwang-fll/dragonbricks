import { Page } from '@playwright/test';

/**
 * Mock the parser API to return successful parse results.
 * This allows e2e tests to run without the backend.
 */
export async function mockParserApi(page: Page) {
  await page.route('**/api/v1/parser/parse', async (route) => {
    const request = route.request();
    const body = JSON.parse(request.postData() || '{}');
    const commands: string[] = body.commands || [];

    const results = commands.map((cmd: string) => {
      const lower = cmd.toLowerCase().trim();

      // Movement
      const moveMatch = lower.match(/move\s+(forward|backward)\s+(\d+)/);
      if (moveMatch) {
        const dir = moveMatch[1] === 'backward' ? -1 : 1;
        const dist = parseInt(moveMatch[2]) * dir;
        return {
          original: cmd,
          python_code: `robot.straight(${dist})`,
          status: 'parsed',
          command_type: 'movement',
          confidence: 1.0,
        };
      }

      // Turn
      const turnMatch = lower.match(/turn\s+(left|right)\s+(\d+)/);
      if (turnMatch) {
        const angle = parseInt(turnMatch[2]) * (turnMatch[1] === 'left' ? -1 : 1);
        return {
          original: cmd,
          python_code: `robot.turn(${angle})`,
          status: 'parsed',
          command_type: 'turn',
          confidence: 1.0,
        };
      }

      // Wait
      const waitMatch = lower.match(/wait\s+(\d+)\s*second/);
      if (waitMatch) {
        return {
          original: cmd,
          python_code: `wait(${parseInt(waitMatch[1]) * 1000})`,
          status: 'parsed',
          command_type: 'wait',
          confidence: 1.0,
        };
      }

      // Stop
      if (lower.includes('stop')) {
        return {
          original: cmd,
          python_code: 'robot.stop()',
          status: 'parsed',
          command_type: 'stop',
          confidence: 1.0,
        };
      }

      // Unrecognized
      return {
        original: cmd,
        python_code: null,
        status: 'error',
        error: `Could not parse: ${cmd}`,
        command_type: null,
        confidence: 0,
      };
    });

    const codeLines = results
      .filter((r: { python_code: string | null }) => r.python_code)
      .map((r: { python_code: string }) => r.python_code);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results,
        generated_code: codeLines.join('\n'),
        imports: '',
        setup: '',
      }),
    });
  });
}

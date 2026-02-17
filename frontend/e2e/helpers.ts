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

  await page.route('**/api/v1/parser/preview', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const commands: string[] = body.commands || [];
    const start = body.start_position || { x: 100, y: 100, angle: 0, timestamp: 0 };
    const speed = Math.max(body.defaults?.speed || 200, 1);
    const turnRate = Math.max(body.defaults?.turn_rate || 150, 1);
    const pointsPerSegment = Math.max(body.points_per_segment || 20, 2);

    const segments: Array<{
      type: 'straight' | 'turn' | 'wait';
      start_point: { x: number; y: number; angle: number; timestamp: number };
      end_point: { x: number; y: number; angle: number; timestamp: number };
      command: string;
    }> = [];

    let current = { ...start, timestamp: 0 };
    let total = 0;

    for (const command of commands) {
      const straight = command.match(/robot\.straight\((-?\d+(?:\.\d+)?)\)/);
      if (straight) {
        const distance = Number(straight[1]);
        const radians = ((current.angle - 90) * Math.PI) / 180;
        const dx = distance * 0.5 * Math.cos(radians);
        const dy = distance * 0.5 * Math.sin(radians);
        const duration = (Math.abs(distance) / speed) * 1000;
        const startPoint = { ...current, timestamp: total };
        total += duration;
        current = { ...current, x: current.x + dx, y: current.y + dy, timestamp: total };
        segments.push({
          type: 'straight',
          start_point: startPoint,
          end_point: { ...current },
          command,
        });
        continue;
      }

      const turn = command.match(/robot\.turn\((-?\d+(?:\.\d+)?)\)/);
      if (turn) {
        const angle = Number(turn[1]);
        const duration = (Math.abs(angle) / turnRate) * 1000;
        const startPoint = { ...current, timestamp: total };
        total += duration;
        current = {
          ...current,
          angle: (((current.angle + angle) % 360) + 360) % 360,
          timestamp: total,
        };
        segments.push({
          type: 'turn',
          start_point: startPoint,
          end_point: { ...current },
          command,
        });
        continue;
      }

      const wait = command.match(/wait\((\d+(?:\.\d+)?)\)/);
      if (wait) {
        const duration = Number(wait[1]);
        const startPoint = { ...current, timestamp: total };
        total += duration;
        current = { ...current, timestamp: total };
        segments.push({
          type: 'wait',
          start_point: startPoint,
          end_point: { ...current },
          command,
        });
      }
    }

    const points: Array<{ x: number; y: number; angle: number; timestamp: number }> = [];
    for (const segment of segments) {
      const duration = segment.end_point.timestamp - segment.start_point.timestamp;
      for (let i = 0; i <= pointsPerSegment; i += 1) {
        const progress = i / pointsPerSegment;
        points.push({
          x: segment.start_point.x + (segment.end_point.x - segment.start_point.x) * progress,
          y: segment.start_point.y + (segment.end_point.y - segment.start_point.y) * progress,
          angle:
            segment.start_point.angle +
            (segment.end_point.angle - segment.start_point.angle) * progress,
          timestamp: segment.start_point.timestamp + duration * progress,
        });
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        path: {
          segments,
          total_time: total,
          end_position: current,
        },
        points,
      }),
    });
  });
}

/**
 * Open the app and continue in guest mode when auth is required.
 */
export async function openAppAsGuest(page: Page) {
  await mockParserApi(page);
  await page.goto('/');

  const continueAsGuest = page.getByText('Continue as Guest');
  if (await continueAsGuest.isVisible()) {
    await continueAsGuest.click();
  }

  // Ensure the main editor shell is visible before test assertions run.
  await page.getByRole('button', { name: 'Settings' }).waitFor({ state: 'visible' });
}

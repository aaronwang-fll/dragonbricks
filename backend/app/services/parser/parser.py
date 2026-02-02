"""
Main parser for natural language commands.
"""

from dataclasses import dataclass, field
from typing import List, Literal, Optional

from . import patterns
from .tokenizer import Token, tokenize


@dataclass
class ClarificationRequest:
    field: str
    message: str
    type: Literal['distance', 'angle', 'duration']


@dataclass
class ParseResult:
    success: bool
    python_code: Optional[str] = None
    needs_clarification: Optional[ClarificationRequest] = None
    error: Optional[str] = None
    confidence: float = 0.0
    command_type: Optional[str] = None
    needs_llm: bool = False


@dataclass
class RobotConfig:
    """Robot configuration for parsing context."""
    left_motor_port: str = 'A'
    right_motor_port: str = 'B'
    wheel_diameter: float = 56
    axle_track: float = 112
    speed: float = 200
    acceleration: float = 700
    turn_rate: float = 150
    turn_acceleration: float = 300
    motor_speed: float = 200
    attachment1_port: Optional[str] = None
    attachment2_port: Optional[str] = None
    color_sensor_port: Optional[str] = None
    ultrasonic_port: Optional[str] = None
    force_port: Optional[str] = None


def parse_command(
    input_str: str,
    config: Optional[RobotConfig] = None,
    motor_names: Optional[List[str]] = None,
    routine_names: Optional[List[str]] = None
) -> ParseResult:
    """Parse a single natural language command."""
    if config is None:
        config = RobotConfig()
    if motor_names is None:
        motor_names = []
    if routine_names is None:
        routine_names = []

    tokens = tokenize(input_str)

    if not tokens:
        return ParseResult(success=False, error='Empty command', confidence=0)

    # Try to match different command patterns
    # Order matters: more specific/complex patterns first

    # Check for routine calls first (highest priority)
    result = try_parse_routine_call(tokens, input_str, routine_names)
    if result:
        return result

    # Multitask patterns (e.g., "while driving, run motor")
    result = try_parse_multitask(tokens, input_str, config, motor_names)
    if result:
        return result

    # Advanced FLL patterns
    result = try_parse_repeat(tokens, input_str)
    if result:
        return result

    result = try_parse_sensor_wait(tokens)
    if result:
        return result

    result = try_parse_line_follow(tokens)
    if result:
        return result

    result = try_parse_parallel(tokens, input_str)
    if result:
        return result

    # Basic patterns
    result = try_parse_stop(tokens, motor_names)
    if result:
        return result

    result = try_parse_set_speed(tokens)
    if result:
        return result

    result = try_parse_motor(tokens, config, motor_names)
    if result:
        return result

    result = try_parse_precise_turn(tokens, config)
    if result:
        return result

    result = try_parse_turn(tokens, config)
    if result:
        return result

    result = try_parse_move(tokens, config)
    if result:
        return result

    result = try_parse_wait(tokens)
    if result:
        return result

    # No pattern matched - flag for LLM
    return ParseResult(
        success=False,
        error='Could not parse command',
        confidence=0,
        needs_llm=True
    )


def parse_commands(
    commands: List[str],
    config: Optional[RobotConfig] = None,
    motor_names: Optional[List[str]] = None
) -> List[ParseResult]:
    """Parse multiple commands."""
    return [parse_command(cmd, config, motor_names) for cmd in commands]


# Helper functions

def find_token_by_type(tokens: List[Token], token_type: str) -> Optional[Token]:
    """Find first token of given type."""
    for t in tokens:
        if t.type == token_type:
            return t
    return None


def has_token_type(tokens: List[Token], token_type: str) -> bool:
    """Check if any token has given type."""
    return any(t.type == token_type for t in tokens)


def has_verb(tokens: List[Token], verbs: List[str]) -> bool:
    """Check if any token is a verb in the given list."""
    return any(
        t.type == 'verb' and (t.normalized or t.value) in verbs
        for t in tokens
    )


def get_numbers(tokens: List[Token]) -> List[Token]:
    """Get all number tokens."""
    return [t for t in tokens if t.type == 'number']


# Parse functions

def try_parse_move(tokens: List[Token], config: RobotConfig) -> Optional[ParseResult]:
    """Parse move commands like 'move forward 200mm'."""
    has_move = has_verb(tokens, patterns.MOVE_VERBS)
    direction = find_token_by_type(tokens, 'direction')
    unit = find_token_by_type(tokens, 'unit')

    # Check if this looks like a move command
    if not has_move and not direction:
        return None
    if direction and (direction.normalized or '') not in ['forward', 'backward']:
        return None

    numbers = get_numbers(tokens)
    has_speed_word = has_token_type(tokens, 'speed')

    # First number (or number with distance unit) is distance
    distance_token = numbers[0] if numbers else None
    speed_value: Optional[float] = None

    # If there's a unit, the number before it is distance
    if unit:
        unit_index = tokens.index(unit)
        for i in range(unit_index - 1, -1, -1):
            if tokens[i].type == 'number':
                distance_token = tokens[i]
                break

    if len(numbers) >= 2 and has_speed_word:
        # Find speed value - it's the number after the speed word
        speed_word_index = next(i for i, t in enumerate(tokens) if t.type == 'speed')
        for t in tokens[speed_word_index:]:
            if t.type == 'number':
                speed_value = t.numeric_value
                break
    elif len(numbers) >= 2:
        # Second number might be speed even without explicit "speed" word
        at_index = next((i for i, t in enumerate(tokens) if t.value == 'at'), -1)
        if at_index > -1:
            for t in tokens[at_index:]:
                if t.type == 'number' and t != distance_token:
                    speed_value = t.numeric_value
                    break

    # Need distance - require clarification if missing
    if not distance_token:
        return ParseResult(
            success=False,
            needs_clarification=ClarificationRequest(
                field='distance',
                message='How far should the robot move?',
                type='distance'
            ),
            confidence=0.7
        )

    # Calculate distance in mm
    distance = distance_token.numeric_value or 0
    if unit:
        conversion = patterns.UNIT_CONVERSIONS.get(unit.normalized or unit.value, 1)
        distance *= conversion

    # Negative for backward
    if direction and direction.normalized == 'backward':
        distance = -distance

    # Generate code with optional speed setting
    straight_speed = speed_value or config.speed
    if speed_value:
        return ParseResult(
            success=True,
            python_code=f'robot.settings(straight_speed={int(straight_speed)})\nrobot.straight({int(distance)})',
            confidence=0.95,
            command_type='move'
        )

    return ParseResult(
        success=True,
        python_code=f'robot.straight({int(distance)})',
        confidence=0.95,
        command_type='move'
    )


def try_parse_turn(tokens: List[Token], config: RobotConfig) -> Optional[ParseResult]:
    """Parse turn commands like 'turn left 90 degrees'."""
    has_turn = has_verb(tokens, patterns.TURN_VERBS)
    direction = find_token_by_type(tokens, 'direction')

    if not has_turn and not direction:
        return None
    if direction and (direction.normalized or '') not in ['left', 'right']:
        return None

    numbers = get_numbers(tokens)
    has_speed_word = has_token_type(tokens, 'speed')

    angle_token = numbers[0] if numbers else None
    speed_value: Optional[float] = None

    if len(numbers) >= 2 and has_speed_word:
        speed_word_index = next(i for i, t in enumerate(tokens) if t.type == 'speed')
        for t in tokens[speed_word_index:]:
            if t.type == 'number':
                speed_value = t.numeric_value
                break
    elif len(numbers) >= 2:
        at_index = next((i for i, t in enumerate(tokens) if t.value == 'at'), -1)
        if at_index > -1:
            for t in tokens[at_index:]:
                if t.type == 'number' and t != angle_token:
                    speed_value = t.numeric_value
                    break

    if not angle_token:
        return ParseResult(
            success=False,
            needs_clarification=ClarificationRequest(
                field='angle',
                message='What angle should the robot turn?',
                type='angle'
            ),
            confidence=0.7
        )

    angle = angle_token.numeric_value or 0

    # Negative for left turn
    if direction and direction.normalized == 'left':
        angle = -angle

    turn_rate = speed_value or config.turn_rate
    if speed_value:
        return ParseResult(
            success=True,
            python_code=f'robot.settings(turn_rate={int(turn_rate)})\nrobot.turn({int(angle)})',
            confidence=0.95,
            command_type='turn'
        )

    return ParseResult(
        success=True,
        python_code=f'robot.turn({int(angle)})',
        confidence=0.95,
        command_type='turn'
    )


def try_parse_wait(tokens: List[Token]) -> Optional[ParseResult]:
    """Parse wait commands like 'wait 2 seconds'."""
    if not has_verb(tokens, patterns.WAIT_VERBS):
        return None

    number = find_token_by_type(tokens, 'number')
    unit = find_token_by_type(tokens, 'unit')

    if not number:
        return ParseResult(
            success=False,
            needs_clarification=ClarificationRequest(
                field='duration',
                message='How long should the robot wait?',
                type='duration'
            ),
            confidence=0.7
        )

    duration = number.numeric_value or 0
    if unit:
        conversion = patterns.TIME_CONVERSIONS.get(unit.normalized or unit.value, 1000)
        duration *= conversion
    else:
        # Default to seconds if no unit
        duration *= 1000

    return ParseResult(
        success=True,
        python_code=f'wait({int(duration)})',
        confidence=0.9,
        command_type='wait'
    )


def try_parse_motor(
    tokens: List[Token],
    config: RobotConfig,
    motor_names: List[str]
) -> Optional[ParseResult]:
    """Parse motor commands like 'run arm motor 180 degrees'."""
    if not has_verb(tokens, patterns.RUN_VERBS):
        return None
    if not has_token_type(tokens, 'motor'):
        return None

    motor_token = find_token_by_type(tokens, 'motor')
    motor_name = motor_token.value if motor_token else 'motor'

    number = find_token_by_type(tokens, 'number')

    if not number:
        return ParseResult(
            success=False,
            needs_clarification=ClarificationRequest(
                field='angle',
                message=f'How many degrees should the {motor_name} motor run?',
                type='angle'
            ),
            confidence=0.7
        )

    angle = number.numeric_value or 0
    speed = int(config.motor_speed)

    return ParseResult(
        success=True,
        python_code=f'{motor_name}.run_angle({speed}, {int(angle)})',
        confidence=0.85,
        command_type='motor'
    )


def try_parse_stop(tokens: List[Token], motor_names: List[str]) -> Optional[ParseResult]:
    """Parse stop commands."""
    if not has_verb(tokens, patterns.STOP_VERBS):
        return None

    motor_token = find_token_by_type(tokens, 'motor')

    if motor_token:
        return ParseResult(
            success=True,
            python_code=f'{motor_token.value}.stop()',
            confidence=0.9,
            command_type='stop'
        )

    return ParseResult(
        success=True,
        python_code='robot.stop()',
        confidence=0.85,
        command_type='stop'
    )


def try_parse_set_speed(tokens: List[Token]) -> Optional[ParseResult]:
    """Parse speed setting commands."""
    has_set = has_verb(tokens, patterns.SET_VERBS)
    has_speed = has_token_type(tokens, 'speed')

    if not has_speed:
        return None

    # If there's a move verb, this isn't a set speed command
    if has_verb(tokens, patterns.MOVE_VERBS):
        return None

    # If there's turn + direction, it's a turn command, not set speed
    has_turn = has_verb(tokens, patterns.TURN_VERBS)
    has_direction = has_token_type(tokens, 'direction')
    if has_turn and has_direction and not has_set:
        return None

    number = find_token_by_type(tokens, 'number')

    if not number:
        return ParseResult(
            success=False,
            needs_clarification=ClarificationRequest(
                field='speed',
                message='What speed should be set? (mm/s)',
                type='distance'
            ),
            confidence=0.7
        )

    speed_value = number.numeric_value or 100

    # Check if this is for turn rate or straight speed
    has_turn_word = any(t.value in ['turn', 'turning', 'rotation'] for t in tokens)

    if has_turn_word:
        return ParseResult(
            success=True,
            python_code=f'robot.settings(turn_rate={int(speed_value)})',
            confidence=0.9,
            command_type='set_speed'
        )

    return ParseResult(
        success=True,
        python_code=f'robot.settings(straight_speed={int(speed_value)})',
        confidence=0.9,
        command_type='set_speed'
    )


def try_parse_repeat(tokens: List[Token], input_str: str) -> Optional[ParseResult]:
    """Parse repeat/loop commands."""
    if not has_token_type(tokens, 'repeat'):
        return None

    number = find_token_by_type(tokens, 'number')

    if not number:
        return ParseResult(
            success=False,
            needs_clarification=ClarificationRequest(
                field='count',
                message='How many times should the action repeat?',
                type='distance'
            ),
            confidence=0.7,
            command_type='loop'
        )

    count = int(number.numeric_value or 1)

    # Find the action after "times" or ":"
    input_lower = input_str.lower()
    action_str = ''

    # Try to find action after "times:" or "times :"
    if 'times:' in input_lower:
        action_str = input_str[input_lower.index('times:') + 6:].strip()
    elif 'times :' in input_lower:
        action_str = input_str[input_lower.index('times :') + 7:].strip()
    elif ': ' in input_str:
        action_str = input_str[input_str.index(': ') + 2:].strip()
    elif ':' in input_str:
        action_str = input_str[input_str.index(':') + 1:].strip()

    if not action_str:
        return ParseResult(
            success=True,
            python_code=f'for i in range({count}):\n    # Add commands here\n    pass',
            confidence=0.7,
            command_type='loop'
        )

    # Parse the action recursively (without routine_names to avoid infinite recursion)
    action_result = parse_command(action_str, None, [], [])

    if action_result.success and action_result.python_code:
        # Indent the action code
        action_code = action_result.python_code
        indented_action = '\n    '.join(action_code.split('\n'))
        return ParseResult(
            success=True,
            python_code=f'for i in range({count}):\n    {indented_action}',
            confidence=0.9,
            command_type='loop'
        )

    # Action couldn't be parsed, include as comment
    return ParseResult(
        success=True,
        python_code=f'for i in range({count}):\n    # {action_str}\n    pass',
        confidence=0.75,
        command_type='loop'
    )


def try_parse_sensor_wait(tokens: List[Token]) -> Optional[ParseResult]:
    """Parse sensor wait commands.

    Handles patterns like:
    - "go forward until the light sensor detects black"
    - "move until color sensor sees white"
    - "wait until distance sensor < 100"

    Pybricks Color reference: https://docs.pybricks.com/en/latest/parameters/color.html
    Available colors: RED, ORANGE, YELLOW, GREEN, CYAN, BLUE, VIOLET, MAGENTA, WHITE, GRAY, BLACK, NONE
    """
    has_until = has_token_type(tokens, 'until')
    has_while = has_token_type(tokens, 'while')
    has_sensor = has_token_type(tokens, 'sensor')
    has_color = has_token_type(tokens, 'color')

    if (not has_until and not has_while) or (not has_sensor and not has_color):
        return None

    # Check if there's a movement command before "until" (go forward until, move until, etc.)
    has_move = has_verb(tokens, patterns.MOVE_VERBS)
    direction = find_token_by_type(tokens, 'direction')
    is_moving_command = has_move or (direction and direction.normalized in ['forward', 'backward'])

    sensor_token = find_token_by_type(tokens, 'sensor')
    color_token = find_token_by_type(tokens, 'color')
    comparison_token = find_token_by_type(tokens, 'comparison')
    number_token = find_token_by_type(tokens, 'number')

    # "go forward until color sensor sees black" or "wait until color sensor detects white"
    if color_token:
        color_name = (color_token.normalized or '').upper()

        # For black detection, using reflection() is more reliable (black reflects less light)
        # But Color.BLACK is valid in Pybricks, so we use .color() for consistency
        if is_moving_command:
            # Robot should move while checking for the condition
            speed = 200  # Default speed, could be configurable
            if direction and direction.normalized == 'backward':
                speed = -speed

            code = f'''# Drive until color detected
robot.drive({speed}, 0)
while color_sensor.color() != Color.{color_name}:
    wait(10)
robot.stop()'''
            return ParseResult(
                success=True,
                python_code=code,
                confidence=0.9,
                command_type='sensor_move'
            )
        else:
            # Just wait in place for the condition
            return ParseResult(
                success=True,
                python_code=f'''while color_sensor.color() != Color.{color_name}:
    wait(10)''',
                confidence=0.85,
                command_type='sensor'
            )

    # "go forward until distance sensor < 100" or "wait until light sensor > 50"
    if sensor_token and number_token:
        sensor_name = sensor_token.normalized or 'sensor'
        comparison = comparison_token.normalized if comparison_token else '>'
        value = int(number_token.numeric_value or 50)

        # Determine sensor method and variable name based on type
        # Pybricks sensors: https://docs.pybricks.com/en/latest/pupdevices.html
        sensor_var = 'sensor'
        sensor_method = 'reflection()'

        if sensor_name in ['light', 'color']:
            sensor_var = 'color_sensor'
            sensor_method = 'reflection()'
        elif sensor_name in ['distance', 'ultrasonic']:
            sensor_var = 'distance_sensor'
            sensor_method = 'distance()'
        elif sensor_name == 'force':
            sensor_var = 'force_sensor'
            sensor_method = 'force()'
        elif sensor_name == 'gyro':
            sensor_var = 'hub.imu'
            sensor_method = 'heading()'

        # For "until", we wait while the opposite is true
        # "until > 50" means "while <= 50"
        condition = comparison if has_while else ('<=' if comparison == '>' else '>=')

        if is_moving_command:
            speed = 200
            if direction and direction.normalized == 'backward':
                speed = -speed

            code = f'''# Drive until sensor condition met
robot.drive({speed}, 0)
while {sensor_var}.{sensor_method} {condition} {value}:
    wait(10)
robot.stop()'''
            return ParseResult(
                success=True,
                python_code=code,
                confidence=0.9,
                command_type='sensor_move'
            )
        else:
            return ParseResult(
                success=True,
                python_code=f'''while {sensor_var}.{sensor_method} {condition} {value}:
    wait(10)''',
                confidence=0.85,
                command_type='sensor'
            )

    return None


def try_parse_line_follow(tokens: List[Token]) -> Optional[ParseResult]:
    """Parse line following commands."""
    has_follow = has_token_type(tokens, 'follow')
    has_line = has_token_type(tokens, 'line')

    if not has_follow or not has_line:
        return None

    has_until = has_token_type(tokens, 'until')
    number_token = find_token_by_type(tokens, 'number')
    unit_token = find_token_by_type(tokens, 'unit')

    # Calculate distance if provided
    distance = 0
    if number_token:
        distance = number_token.numeric_value or 0
        if unit_token:
            conversion = patterns.UNIT_CONVERSIONS.get(unit_token.normalized or unit_token.value, 1)
            distance *= conversion

    stop_condition = ''
    if distance > 0:
        stop_condition = f'if robot.distance() >= {int(distance)}:\n        break'
    elif has_until:
        stop_condition = '# Add stop condition'

    line_follow_code = f'''# Line following - adjust threshold and speed as needed
threshold = 50
while True:
    error = left_light.reflection() - threshold
    correction = error * 1.0  # Adjust gain as needed
    left.run(200 - correction)
    right.run(200 + correction)
    {stop_condition}
    wait(10)
robot.stop()'''

    return ParseResult(
        success=True,
        python_code=line_follow_code,
        confidence=0.75,
        command_type='line_follow'
    )


def try_parse_parallel(tokens: List[Token], input_str: str) -> Optional[ParseResult]:
    """Parse parallel execution commands."""
    has_parallel = has_token_type(tokens, 'parallel')
    has_and = ' and ' in input_str.lower()

    if not has_parallel and not has_and:
        return None

    if has_parallel:
        return ParseResult(
            success=True,
            python_code='''async def task1():
    # First action
    pass

async def task2():
    # Second action
    pass

await multitask(task1(), task2())''',
            confidence=0.7,
            command_type='parallel',
            needs_llm=True  # Complex parallel needs LLM
        )

    return None


def try_parse_precise_turn(tokens: List[Token], config: RobotConfig) -> Optional[ParseResult]:
    """Parse precise gyro-based turn commands."""
    has_turn = has_verb(tokens, patterns.TURN_VERBS)
    has_precise = has_token_type(tokens, 'precise')
    direction = find_token_by_type(tokens, 'direction')

    if not has_turn or not has_precise:
        return None
    if direction and (direction.normalized or '') not in ['left', 'right']:
        return None

    angle_token = find_token_by_type(tokens, 'number')

    if not angle_token:
        return ParseResult(
            success=False,
            needs_clarification=ClarificationRequest(
                field='angle',
                message='What angle should the robot turn precisely?',
                type='angle'
            ),
            confidence=0.7
        )

    angle = int(angle_token.numeric_value or 0)

    # Negative for left turn
    if direction and direction.normalized == 'left':
        angle = -angle

    return ParseResult(
        success=True,
        python_code=f'''# Precise turn using gyro feedback
target_angle = hub.imu.heading() + {angle}
while abs(hub.imu.heading() - target_angle) > 1:
    error = target_angle - hub.imu.heading()
    speed = max(30, min(200, abs(error) * 2))
    if error > 0:
        left.run(-speed)
        right.run(speed)
    else:
        left.run(speed)
        right.run(-speed)
    wait(10)
robot.stop()''',
        confidence=0.9,
        command_type='precise_turn'
    )


def try_parse_routine_call(
    tokens: List[Token],
    input_str: str,
    routine_names: List[str]
) -> Optional[ParseResult]:
    """Parse routine/function call commands.

    Handles patterns like:
    - "run mission1"
    - "call grab_object"
    - "execute turn_around"
    - "mission1" (direct name reference)
    - "square with 200" (with parameters)
    """
    import re

    input_lower = input_str.lower().strip()
    matched_routine = None
    params_str = ''

    # First, check for known routine names
    for routine_name in routine_names:
        # Check if input starts with routine name
        if input_lower.startswith(routine_name):
            matched_routine = routine_name
            # Extract parameters after routine name
            rest = input_lower[len(routine_name):].strip()
            if rest.startswith('with '):
                params_str = rest[5:].strip()
            elif rest:
                params_str = rest
            break

        # Check for "call/run/execute routine_name"
        for prefix in ['run ', 'call ', 'execute ', 'start ']:
            if input_lower.startswith(prefix + routine_name):
                matched_routine = routine_name
                rest = input_lower[len(prefix + routine_name):].strip()
                if rest.startswith('with '):
                    params_str = rest[5:].strip()
                elif rest:
                    params_str = rest
                break

        if matched_routine:
            break

    # If no known routine matched, check for generic "run/call <identifier>" pattern
    if not matched_routine:
        for prefix in ['run ', 'call ', 'execute ', 'start ']:
            if input_lower.startswith(prefix):
                rest = input_lower[len(prefix):].strip()
                # Extract identifier (word with underscores/numbers, not a reserved word)
                match = re.match(r'^([a-z][a-z0-9_]*)', rest)
                if match:
                    potential_name = match.group(1)
                    # Skip if it looks like a motor command (has 'motor' token)
                    if has_token_type(tokens, 'motor'):
                        return None
                    # Skip reserved words that are other commands
                    reserved = ['forward', 'backward', 'left', 'right', 'motor', 'speed', 'arm', 'grabber']
                    if potential_name not in reserved:
                        matched_routine = potential_name
                        rest_after = rest[len(potential_name):].strip()
                        if rest_after.startswith('with '):
                            params_str = rest_after[5:].strip()
                        elif rest_after:
                            params_str = rest_after
                        break

    if not matched_routine:
        return None

    # Parse parameters
    params = []
    if params_str:
        # Extract numbers from params string
        numbers = re.findall(r'-?\d+(?:\.\d+)?', params_str)
        params = numbers

    # Generate function call
    if params:
        python_code = f'{matched_routine}({", ".join(params)})'
    else:
        python_code = f'{matched_routine}()'

    return ParseResult(
        success=True,
        python_code=python_code,
        confidence=0.95,
        command_type='routine_call'
    )


def try_parse_multitask(
    tokens: List[Token],
    input_str: str,
    config: RobotConfig,
    motor_names: List[str]
) -> Optional[ParseResult]:
    """Parse multitask/parallel execution commands.

    Handles patterns like:
    - "while driving forward, run arm motor 180 degrees"
    - "move forward 200mm while running grabber"
    - "simultaneously move forward and turn motor"

    Pybricks multitask reference: https://docs.pybricks.com/en/latest/tools/index.html#pybricks.tools.multitask
    """
    input_lower = input_str.lower()

    # Check for parallel indicators
    has_while = ' while ' in input_lower
    has_simultaneously = 'simultaneously' in input_lower
    has_at_same_time = 'at the same time' in input_lower
    has_parallel_and = ' and ' in input_lower and any(
        w in input_lower for w in ['move', 'drive', 'turn', 'run', 'motor']
    )

    if not (has_while or has_simultaneously or has_at_same_time or has_parallel_and):
        return None

    # Split into two tasks
    task1_desc = ''
    task2_desc = ''

    if has_while:
        parts = input_lower.split(' while ')
        if len(parts) == 2:
            task1_desc = parts[0].strip()
            task2_desc = parts[1].strip()
    elif has_simultaneously:
        # "simultaneously A and B"
        rest = input_lower.replace('simultaneously', '').strip()
        if ' and ' in rest:
            parts = rest.split(' and ', 1)
            task1_desc = parts[0].strip()
            task2_desc = parts[1].strip()
    elif has_at_same_time:
        rest = input_lower.replace('at the same time', '').strip()
        if ' and ' in rest:
            parts = rest.split(' and ', 1)
            task1_desc = parts[0].strip()
            task2_desc = parts[1].strip()
    elif has_parallel_and:
        parts = input_lower.split(' and ', 1)
        task1_desc = parts[0].strip()
        task2_desc = parts[1].strip() if len(parts) > 1 else ''

    if not task1_desc or not task2_desc:
        return None

    # Parse each task independently
    task1_result = parse_command(task1_desc, config, motor_names, [])
    task2_result = parse_command(task2_desc, config, motor_names, [])

    # Generate multitask code
    task1_code = task1_result.python_code if task1_result.success else f'# TODO: {task1_desc}'
    task2_code = task2_result.python_code if task2_result.success else f'# TODO: {task2_desc}'

    # Indent task code
    task1_indented = '\n    '.join(task1_code.split('\n'))
    task2_indented = '\n    '.join(task2_code.split('\n'))

    multitask_code = f'''# Parallel execution: {task1_desc} AND {task2_desc}
async def task1():
    {task1_indented}

async def task2():
    {task2_indented}

await multitask(task1(), task2())'''

    return ParseResult(
        success=True,
        python_code=multitask_code,
        confidence=0.85,
        command_type='multitask'
    )

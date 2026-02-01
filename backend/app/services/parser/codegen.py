"""
Code generation for Pybricks Python programs.
"""

from dataclasses import dataclass
from typing import List, Optional

from .parser import RobotConfig


@dataclass
class GeneratedProgram:
    imports: str
    setup: str
    main: str
    full: str


def generate_full_program(
    config: RobotConfig,
    commands: List[str]
) -> GeneratedProgram:
    """Generate a complete Pybricks Python program."""
    imports = generate_imports(config)
    setup = generate_setup_code(config)
    main = generate_main_code(commands)

    full = f"""{imports}

{setup}

# Main program
{main}
"""

    return GeneratedProgram(imports=imports, setup=setup, main=main, full=full)


def generate_imports(config: RobotConfig) -> str:
    """Generate import statements."""
    imports = [
        'from pybricks.hubs import PrimeHub',
        'from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor',
        'from pybricks.parameters import Port, Direction, Stop, Color',
        'from pybricks.robotics import DriveBase',
        'from pybricks.tools import wait',
    ]

    return '\n'.join(imports)


def generate_setup_code(config: RobotConfig) -> str:
    """Generate hardware initialization code."""
    lines: List[str] = []

    # Hub initialization
    lines.append('# Initialize hub')
    lines.append('hub = PrimeHub()')
    lines.append('')

    # Motor setup
    lines.append('# Motor setup')
    lines.append(f'left_motor = Motor(Port.{config.left_motor_port}, Direction.COUNTERCLOCKWISE)')
    lines.append(f'right_motor = Motor(Port.{config.right_motor_port}, Direction.CLOCKWISE)')
    lines.append('')

    # DriveBase setup
    lines.append('# DriveBase setup')
    lines.append(
        f'robot = DriveBase(left_motor, right_motor, '
        f'wheel_diameter={config.wheel_diameter}, '
        f'axle_track={config.axle_track})'
    )
    lines.append(
        f'robot.settings('
        f'straight_speed={int(config.speed)}, '
        f'straight_acceleration={int(config.acceleration)}, '
        f'turn_rate={int(config.turn_rate)}, '
        f'turn_acceleration={int(config.turn_acceleration)})'
    )
    lines.append('')

    # Attachment motors
    if config.attachment1_port and config.attachment1_port not in ['None', '']:
        lines.append('# Attachment motors')
        lines.append(f'attachment1 = Motor(Port.{config.attachment1_port})')
        if config.attachment2_port and config.attachment2_port not in ['None', '']:
            lines.append(f'attachment2 = Motor(Port.{config.attachment2_port})')
        lines.append('')

    # Sensors
    sensors_added = False
    if config.color_sensor_port and config.color_sensor_port not in ['None', '']:
        if not sensors_added:
            lines.append('# Sensors')
            sensors_added = True
        lines.append(f'color_sensor = ColorSensor(Port.{config.color_sensor_port})')

    if config.ultrasonic_port and config.ultrasonic_port not in ['None', '']:
        if not sensors_added:
            lines.append('# Sensors')
            sensors_added = True
        lines.append(f'distance_sensor = UltrasonicSensor(Port.{config.ultrasonic_port})')

    if config.force_port and config.force_port not in ['None', '']:
        if not sensors_added:
            lines.append('# Sensors')
            sensors_added = True
        lines.append(f'force_sensor = ForceSensor(Port.{config.force_port})')

    if sensors_added:
        lines.append('')

    return '\n'.join(lines)


def generate_main_code(commands: List[str]) -> str:
    """Generate main program code from parsed commands."""
    if not commands:
        return '# Add your commands here\npass'

    return '\n'.join(commands)

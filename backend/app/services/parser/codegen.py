"""
Code generation for Pybricks Python programs.

Pybricks Reference: https://docs.pybricks.com/en/latest/
"""

from dataclasses import dataclass
from typing import TYPE_CHECKING, List, Optional

if TYPE_CHECKING:
    from .parser import RobotConfig


@dataclass
class RoutineDefinition:
    """Definition of a reusable routine/function."""

    name: str
    parameters: List[str]
    body: str


@dataclass
class GeneratedProgram:
    imports: str
    setup: str
    routines: str
    main: str
    full: str


def generate_full_program(
    config,  # RobotConfig
    commands: List[str],
    routines: Optional[List[RoutineDefinition]] = None,
    uses_multitask: bool = False,
) -> GeneratedProgram:
    """Generate a complete Pybricks Python program."""
    # Check if any commands use DriveBase (robot.straight, robot.turn, etc.)
    # or drive motors (left_motor, right_motor)
    needs_drivebase = any(
        cmd.strip().startswith("robot.") or
        "left_motor" in cmd or
        "right_motor" in cmd
        for cmd in commands
    )
    
    imports = generate_imports(config, uses_multitask, needs_drivebase)
    setup = generate_setup_code(config, needs_drivebase)
    routines_code = generate_routines_code(routines or [])
    main = generate_main_code(commands)

    # Build full program
    parts = [imports, "", setup]

    if routines_code:
        parts.extend(["", routines_code])

    parts.extend(["", "# Main program", main])

    full = "\n".join(parts)

    return GeneratedProgram(
        imports=imports, setup=setup, routines=routines_code, main=main, full=full
    )


def generate_imports(config, uses_multitask: bool = False, needs_drivebase: bool = True) -> str:
    """Generate import statements."""
    imports = [
        "from pybricks.hubs import PrimeHub",
        "from pybricks.pupdevices import Motor",
        "from pybricks.parameters import Port, Direction, Stop",
    ]
    
    # Only import DriveBase if needed
    if needs_drivebase:
        imports.append("from pybricks.robotics import DriveBase")

    # Add wait and optionally multitask
    if uses_multitask:
        imports.append("from pybricks.tools import wait, multitask, run_task")
    else:
        imports.append("from pybricks.tools import wait")

    return "\n".join(imports)


def generate_routines_code(routines: List[RoutineDefinition]) -> str:
    """Generate Python function definitions from routines."""
    if not routines:
        return ""

    lines = ["# Routines/Functions"]

    for routine in routines:
        # Function signature
        params = ", ".join(routine.parameters) if routine.parameters else ""
        lines.append(f"def {routine.name}({params}):")

        # Parse routine body and indent
        body_lines = routine.body.strip().split("\n")
        if not body_lines or (len(body_lines) == 1 and not body_lines[0].strip()):
            lines.append("    pass")
        else:
            for body_line in body_lines:
                body_line = body_line.strip()
                if body_line:
                    # If body contains natural language, add as comment
                    if body_line.startswith("#"):
                        lines.append(f"    {body_line}")
                    else:
                        # Assume it's already Python or will be parsed
                        lines.append(f"    {body_line}")

        lines.append("")  # Blank line between functions

    return "\n".join(lines)


def generate_setup_code(config: "RobotConfig", needs_drivebase: bool = True) -> str:
    """Generate hardware initialization code."""
    lines: List[str] = []

    # Hub initialization
    lines.append("# Initialize hub")
    lines.append("hub = PrimeHub()")
    lines.append("")

    # Motor setup - only if DriveBase is needed or commands use left/right motor
    if needs_drivebase:
        lines.append("# Motor setup")
        lines.append(f"left_motor = Motor(Port.{config.left_motor_port}, Direction.COUNTERCLOCKWISE)")
        lines.append(f"right_motor = Motor(Port.{config.right_motor_port}, Direction.CLOCKWISE)")
        lines.append("")

        # DriveBase setup
        lines.append("# DriveBase setup")
        lines.append(
            f"robot = DriveBase(left_motor, right_motor, "
            f"wheel_diameter={config.wheel_diameter}, "
            f"axle_track={config.axle_track})"
        )
        lines.append(
            f"robot.settings("
            f"straight_speed={int(config.speed)}, "
            f"straight_acceleration={int(config.acceleration)}, "
            f"turn_rate={int(config.turn_rate)}, "
            f"turn_acceleration={int(config.turn_acceleration)})"
        )
        lines.append("")

    # Attachment motors
    if config.attachment1_port and config.attachment1_port not in ["None", ""]:
        lines.append("# Attachment motors")
        lines.append(f"attachment1 = Motor(Port.{config.attachment1_port})")
        if config.attachment2_port and config.attachment2_port not in ["None", ""]:
            lines.append(f"attachment2 = Motor(Port.{config.attachment2_port})")
        lines.append("")

    # Sensors
    sensors_added = False
    if config.color_sensor_port and config.color_sensor_port not in ["None", ""]:
        if not sensors_added:
            lines.append("# Sensors")
            sensors_added = True
        lines.append(f"color_sensor = ColorSensor(Port.{config.color_sensor_port})")

    if config.ultrasonic_port and config.ultrasonic_port not in ["None", ""]:
        if not sensors_added:
            lines.append("# Sensors")
            sensors_added = True
        lines.append(f"distance_sensor = UltrasonicSensor(Port.{config.ultrasonic_port})")

    if config.force_port and config.force_port not in ["None", ""]:
        if not sensors_added:
            lines.append("# Sensors")
            sensors_added = True
        lines.append(f"force_sensor = ForceSensor(Port.{config.force_port})")

    if sensors_added:
        lines.append("")

    return "\n".join(lines)


def generate_main_code(commands: List[str]) -> str:
    """Generate main program code from parsed commands."""
    if not commands:
        return "# Add your commands here\npass"

    return "\n".join(commands)

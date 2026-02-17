"""
Preview path calculation service.
"""

import math
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

SCALE_MM_TO_PX = 0.5

STRAIGHT_PATTERN = re.compile(r"robot\.straight\((-?\d+(?:\.\d+)?)\)")
TURN_PATTERN = re.compile(r"robot\.turn\((-?\d+(?:\.\d+)?)\)")
WAIT_PATTERN = re.compile(r"wait\((\d+(?:\.\d+)?)\)")


@dataclass
class PreviewPoint:
    x: float
    y: float
    angle: float
    timestamp: float


@dataclass
class PreviewSegment:
    type: str
    start_point: PreviewPoint
    end_point: PreviewPoint
    command: str


@dataclass
class CalculatedPreviewPath:
    segments: List[PreviewSegment]
    total_time: float
    end_position: PreviewPoint


def normalize_angle(angle: float) -> float:
    """Normalize angle to 0-360 range."""
    normalized = angle % 360
    if normalized < 0:
        return normalized + 360
    return normalized


def interpolate_angle(start: float, end: float, progress: float) -> float:
    """Interpolate angle while handling wraparound."""
    diff = end - start
    if diff > 180:
        diff -= 360
    if diff < -180:
        diff += 360
    return normalize_angle(start + diff * progress)


def calculate_path(
    commands: List[str], start_position: PreviewPoint, speed: float, turn_rate: float
) -> CalculatedPreviewPath:
    """Calculate path segments from generated Python commands."""
    segments: List[PreviewSegment] = []
    current_position = PreviewPoint(
        x=start_position.x,
        y=start_position.y,
        angle=start_position.angle,
        timestamp=start_position.timestamp,
    )
    total_time = 0.0

    for command in commands:
        segment = parse_command_to_segment(command, current_position, speed, turn_rate)
        if segment is None:
            continue

        duration = segment.end_point.timestamp - segment.start_point.timestamp
        segment.start_point.timestamp = total_time
        total_time += duration
        segment.end_point.timestamp = total_time

        segments.append(segment)
        current_position = PreviewPoint(
            x=segment.end_point.x,
            y=segment.end_point.y,
            angle=segment.end_point.angle,
            timestamp=segment.end_point.timestamp,
        )

    return CalculatedPreviewPath(
        segments=segments,
        total_time=total_time,
        end_position=current_position,
    )


def parse_command_to_segment(
    command: str, start_point: PreviewPoint, speed: float, turn_rate: float
) -> Optional[PreviewSegment]:
    """Parse command into a preview segment."""
    straight_match = STRAIGHT_PATTERN.search(command)
    if straight_match:
        distance = float(straight_match.group(1))
        return calculate_straight_segment(start_point, distance, speed, command)

    turn_match = TURN_PATTERN.search(command)
    if turn_match:
        angle = float(turn_match.group(1))
        return calculate_turn_segment(start_point, angle, turn_rate, command)

    wait_match = WAIT_PATTERN.search(command)
    if wait_match:
        duration = float(wait_match.group(1))
        return calculate_wait_segment(start_point, duration, command)

    return None


def calculate_straight_segment(
    start_point: PreviewPoint, distance: float, speed: float, command: str
) -> PreviewSegment:
    """Calculate movement segment from robot.straight(distance)."""
    speed_per_second = speed if speed > 0 else 1.0
    angle_rad = math.radians(start_point.angle - 90)
    dx = distance * SCALE_MM_TO_PX * math.cos(angle_rad)
    dy = distance * SCALE_MM_TO_PX * math.sin(angle_rad)
    time_ms = abs(distance) / speed_per_second * 1000

    end_point = PreviewPoint(
        x=start_point.x + dx,
        y=start_point.y + dy,
        angle=start_point.angle,
        timestamp=start_point.timestamp + time_ms,
    )

    return PreviewSegment(
        type="straight",
        start_point=PreviewPoint(
            x=start_point.x,
            y=start_point.y,
            angle=start_point.angle,
            timestamp=start_point.timestamp,
        ),
        end_point=end_point,
        command=command,
    )


def calculate_turn_segment(
    start_point: PreviewPoint, angle: float, turn_rate: float, command: str
) -> PreviewSegment:
    """Calculate turn segment from robot.turn(angle)."""
    degrees_per_second = turn_rate if turn_rate > 0 else 1.0
    time_ms = abs(angle) / degrees_per_second * 1000

    end_point = PreviewPoint(
        x=start_point.x,
        y=start_point.y,
        angle=normalize_angle(start_point.angle + angle),
        timestamp=start_point.timestamp + time_ms,
    )

    return PreviewSegment(
        type="turn",
        start_point=PreviewPoint(
            x=start_point.x,
            y=start_point.y,
            angle=start_point.angle,
            timestamp=start_point.timestamp,
        ),
        end_point=end_point,
        command=command,
    )


def calculate_wait_segment(
    start_point: PreviewPoint, duration: float, command: str
) -> PreviewSegment:
    """Calculate wait segment from wait(duration_ms)."""
    end_point = PreviewPoint(
        x=start_point.x,
        y=start_point.y,
        angle=start_point.angle,
        timestamp=start_point.timestamp + duration,
    )

    return PreviewSegment(
        type="wait",
        start_point=PreviewPoint(
            x=start_point.x,
            y=start_point.y,
            angle=start_point.angle,
            timestamp=start_point.timestamp,
        ),
        end_point=end_point,
        command=command,
    )


def get_position_at_time(path: CalculatedPreviewPath, timestamp: float) -> PreviewPoint:
    """Get interpolated position at timestamp."""
    if len(path.segments) == 0:
        return PreviewPoint(x=0, y=0, angle=0, timestamp=0)

    for segment in path.segments:
        if segment.start_point.timestamp <= timestamp <= segment.end_point.timestamp:
            duration = segment.end_point.timestamp - segment.start_point.timestamp
            progress = (
                1.0 if duration == 0 else (timestamp - segment.start_point.timestamp) / duration
            )
            progress = min(max(progress, 0.0), 1.0)
            return PreviewPoint(
                x=segment.start_point.x + (segment.end_point.x - segment.start_point.x) * progress,
                y=segment.start_point.y + (segment.end_point.y - segment.start_point.y) * progress,
                angle=interpolate_angle(
                    segment.start_point.angle, segment.end_point.angle, progress
                ),
                timestamp=timestamp,
            )

    return PreviewPoint(
        x=path.end_position.x,
        y=path.end_position.y,
        angle=path.end_position.angle,
        timestamp=path.end_position.timestamp,
    )


def generate_path_points(
    path: CalculatedPreviewPath, points_per_segment: int = 20
) -> List[PreviewPoint]:
    """Generate evenly spaced points for rendering."""
    points: List[PreviewPoint] = []

    if points_per_segment <= 0:
        return points

    for segment in path.segments:
        duration = segment.end_point.timestamp - segment.start_point.timestamp
        for index in range(points_per_segment + 1):
            progress = index / points_per_segment
            timestamp = segment.start_point.timestamp + duration * progress
            points.append(
                PreviewPoint(
                    x=segment.start_point.x
                    + (segment.end_point.x - segment.start_point.x) * progress,
                    y=segment.start_point.y
                    + (segment.end_point.y - segment.start_point.y) * progress,
                    angle=interpolate_angle(
                        segment.start_point.angle, segment.end_point.angle, progress
                    ),
                    timestamp=timestamp,
                )
            )

    return points


def calculate_preview_path_response(
    commands: List[str],
    start_position: PreviewPoint,
    speed: float,
    turn_rate: float,
    points_per_segment: int = 20,
) -> Dict[str, object]:
    """Calculate preview path and points in API response shape."""
    path = calculate_path(commands, start_position, speed, turn_rate)
    points = generate_path_points(path, points_per_segment=points_per_segment)
    return {
        "path": calculated_path_to_dict(path),
        "points": [preview_point_to_dict(point) for point in points],
    }


def preview_point_to_dict(point: PreviewPoint) -> Dict[str, float]:
    return {
        "x": point.x,
        "y": point.y,
        "angle": point.angle,
        "timestamp": point.timestamp,
    }


def preview_segment_to_dict(segment: PreviewSegment) -> Dict[str, object]:
    return {
        "type": segment.type,
        "start_point": preview_point_to_dict(segment.start_point),
        "end_point": preview_point_to_dict(segment.end_point),
        "command": segment.command,
    }


def calculated_path_to_dict(path: CalculatedPreviewPath) -> Dict[str, object]:
    return {
        "segments": [preview_segment_to_dict(segment) for segment in path.segments],
        "total_time": path.total_time,
        "end_position": preview_point_to_dict(path.end_position),
    }

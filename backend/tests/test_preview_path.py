"""
Tests for backend preview path calculation.
"""

import pytest

from app.services.parser.preview import (
    PreviewPoint,
    calculate_path,
    calculate_preview_path_response,
    generate_path_points,
    get_position_at_time,
)


def test_calculate_path_straight_turn_wait():
    start = PreviewPoint(x=100, y=100, angle=0, timestamp=0)
    path = calculate_path(
        commands=["robot.straight(200)", "robot.turn(90)", "wait(500)"],
        start_position=start,
        speed=200,
        turn_rate=150,
    )

    assert len(path.segments) == 3
    assert path.total_time == pytest.approx(2100.0)
    assert path.end_position.x == pytest.approx(100.0)
    assert path.end_position.y == pytest.approx(0.0)
    assert path.end_position.angle == pytest.approx(90.0)
    assert path.end_position.timestamp == pytest.approx(2100.0)


def test_get_position_at_time_interpolates_within_segment():
    start = PreviewPoint(x=100, y=100, angle=0, timestamp=0)
    path = calculate_path(
        commands=["robot.straight(200)"],
        start_position=start,
        speed=200,
        turn_rate=150,
    )

    midpoint = get_position_at_time(path, 500)
    assert midpoint.x == pytest.approx(100.0)
    assert midpoint.y == pytest.approx(50.0)
    assert midpoint.angle == pytest.approx(0.0)
    assert midpoint.timestamp == pytest.approx(500.0)


def test_generate_path_points_returns_samples():
    start = PreviewPoint(x=100, y=100, angle=0, timestamp=0)
    path = calculate_path(
        commands=["robot.straight(200)", "robot.turn(90)"],
        start_position=start,
        speed=200,
        turn_rate=180,
    )

    points = generate_path_points(path, points_per_segment=10)
    assert len(points) == 22
    assert points[0].timestamp == pytest.approx(0.0)
    assert points[-1].timestamp == pytest.approx(path.total_time)


def test_calculate_preview_path_response_shape():
    payload = calculate_preview_path_response(
        commands=["robot.straight(100)"],
        start_position=PreviewPoint(x=50, y=50, angle=0, timestamp=0),
        speed=100,
        turn_rate=120,
        points_per_segment=5,
    )

    assert payload["path"]["total_time"] == pytest.approx(1000.0)
    assert len(payload["points"]) == 6


@pytest.mark.asyncio
async def test_preview_endpoint(client):
    response = await client.post(
        "/api/v1/parser/preview",
        json={
            "commands": ["robot.straight(200)", "robot.turn(90)"],
            "start_position": {"x": 100, "y": 100, "angle": 0, "timestamp": 0},
            "defaults": {"speed": 200, "turn_rate": 150},
            "points_per_segment": 8,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["path"]["total_time"] == pytest.approx(1600.0)
    assert len(data["path"]["segments"]) == 2
    assert len(data["points"]) == 18


@pytest.mark.asyncio
async def test_preview_endpoint_rejects_invalid_speed(client):
    response = await client.post(
        "/api/v1/parser/preview",
        json={
            "commands": ["robot.straight(200)"],
            "start_position": {"x": 100, "y": 100, "angle": 0, "timestamp": 0},
            "defaults": {"speed": 0, "turn_rate": 150},
        },
    )

    assert response.status_code == 422

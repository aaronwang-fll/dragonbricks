"""
Tests for the parser service.
"""
import pytest
from app.services.parser.parser import (
    parse_command,
    RobotConfig,
)
from app.services.parser.tokenizer import tokenize
from app.services.parser.fuzzy_match import levenshtein_distance, find_best_match


# Tokenizer tests
class TestTokenizer:
    def test_basic_tokenize(self):
        tokens = tokenize("move forward 100mm")
        assert len(tokens) == 4
        assert tokens[0].type == "verb"
        assert tokens[1].type == "direction"
        assert tokens[2].type == "number"
        assert tokens[3].type == "unit"

    def test_tokenize_with_units_attached(self):
        tokens = tokenize("move forward 100mm")
        assert any(t.type == "number" and t.numeric_value == 100 for t in tokens)

    def test_tokenize_colors(self):
        tokens = tokenize("detect black color")
        assert any(t.type == "color" and t.normalized == "black" for t in tokens)

    def test_tokenize_grey_normalized(self):
        tokens = tokenize("detect grey")
        color_token = next(t for t in tokens if t.type == "color")
        assert color_token.normalized == "gray"

    def test_tokenize_sensors(self):
        tokens = tokenize("light sensor")
        assert any(t.type == "sensor" for t in tokens)


# Fuzzy match tests
class TestFuzzyMatch:
    def test_levenshtein_identical(self):
        assert levenshtein_distance("move", "move") == 0

    def test_levenshtein_one_char(self):
        assert levenshtein_distance("move", "mve") == 1
        assert levenshtein_distance("move", "moove") == 1

    def test_levenshtein_typo(self):
        assert levenshtein_distance("forward", "forwrd") == 1
        assert levenshtein_distance("forward", "forwaard") == 1

    def test_find_best_match(self):
        words = ["move", "turn", "wait", "stop"]
        match = find_best_match("moov", words, max_distance=2)
        assert match is not None
        assert match[0] == "move"


# Parser tests - Basic commands
class TestParserBasic:
    @pytest.fixture
    def config(self):
        return RobotConfig()

    def test_parse_move_forward(self, config):
        result = parse_command("move forward 200mm", config)
        assert result.success
        assert "robot.straight(200)" in result.python_code
        assert result.command_type == "move"

    def test_parse_move_backward(self, config):
        result = parse_command("move backward 100mm", config)
        assert result.success
        assert "robot.straight(-100)" in result.python_code

    def test_parse_move_with_speed(self, config):
        result = parse_command("move forward 200mm at speed 300", config)
        assert result.success
        assert "straight_speed=300" in result.python_code

    def test_parse_turn_left(self, config):
        result = parse_command("turn left 90 degrees", config)
        assert result.success
        assert "robot.turn(-90)" in result.python_code
        assert result.command_type == "turn"

    def test_parse_turn_right(self, config):
        result = parse_command("turn right 45 degrees", config)
        assert result.success
        assert "robot.turn(45)" in result.python_code

    def test_parse_wait(self, config):
        result = parse_command("wait 2 seconds", config)
        assert result.success
        assert "wait(2000)" in result.python_code
        assert result.command_type == "wait"

    def test_parse_wait_ms(self, config):
        result = parse_command("wait 500ms", config)
        assert result.success
        assert "wait(500)" in result.python_code

    def test_parse_stop(self, config):
        result = parse_command("stop", config)
        assert result.success
        assert "robot.stop()" in result.python_code


# Parser tests - Motor commands
class TestParserMotor:
    @pytest.fixture
    def config(self):
        return RobotConfig()

    def test_parse_run_motor(self, config):
        result = parse_command("run motor 180 degrees", config)
        assert result.success
        assert "run_angle" in result.python_code
        assert "180" in result.python_code


# Parser tests - Sensor commands
class TestParserSensor:
    @pytest.fixture
    def config(self):
        return RobotConfig(color_sensor_port="C")

    def test_parse_go_until_color(self, config):
        result = parse_command("go forward until the light sensor detect the black color", config)
        assert result.success
        assert "robot.drive(200, 0)" in result.python_code
        assert "Color.BLACK" in result.python_code
        assert "robot.stop()" in result.python_code
        assert result.command_type == "sensor_move"

    def test_parse_wait_until_color(self, config):
        result = parse_command("wait until color sensor detects white", config)
        assert result.success
        assert "Color.WHITE" in result.python_code
        assert "robot.drive" not in result.python_code  # Just wait, no movement

    def test_parse_drive_until_distance(self, config):
        result = parse_command("go forward until distance sensor < 100", config)
        assert result.success
        assert "robot.drive" in result.python_code
        assert "distance" in result.python_code.lower()


# Parser tests - Advanced commands
class TestParserAdvanced:
    @pytest.fixture
    def config(self):
        return RobotConfig()

    def test_parse_repeat(self, config):
        result = parse_command("repeat 3 times", config)
        assert result.success
        assert "for i in range(3)" in result.python_code
        assert result.command_type == "loop"

    def test_parse_set_speed(self, config):
        result = parse_command("set speed to 300", config)
        assert result.success
        assert "straight_speed=300" in result.python_code

    def test_parse_precise_turn(self, config):
        result = parse_command("turn left precisely 90 degrees", config)
        assert result.success
        assert "hub.imu.heading()" in result.python_code
        assert result.command_type == "precise_turn"

    def test_parse_line_follow(self, config):
        result = parse_command("follow line for 500mm", config)
        assert result.success
        assert "threshold" in result.python_code.lower()
        assert result.command_type == "line_follow"


# Parser tests - Clarification requests
class TestParserClarification:
    @pytest.fixture
    def config(self):
        return RobotConfig()

    def test_move_without_distance(self, config):
        result = parse_command("move forward", config)
        assert not result.success
        assert result.needs_clarification is not None
        assert result.needs_clarification.type == "distance"

    def test_turn_without_angle(self, config):
        result = parse_command("turn left", config)
        assert not result.success
        assert result.needs_clarification is not None
        assert result.needs_clarification.type == "angle"

    def test_wait_without_duration(self, config):
        result = parse_command("wait", config)
        assert not result.success
        assert result.needs_clarification is not None
        assert result.needs_clarification.type == "duration"


# Parser tests - Edge cases
class TestParserEdgeCases:
    @pytest.fixture
    def config(self):
        return RobotConfig()

    def test_empty_command(self, config):
        result = parse_command("", config)
        assert not result.success
        assert result.error == "Empty command"

    def test_unknown_command(self, config):
        result = parse_command("dance around happily", config)
        assert not result.success
        assert result.needs_llm  # Should flag for LLM fallback

    def test_fuzzy_typo_move(self, config):
        result = parse_command("moove forward 100mm", config)
        assert result.success  # Should match via fuzzy matching

    def test_unit_conversion_cm(self, config):
        result = parse_command("move forward 10cm", config)
        assert result.success
        assert "robot.straight(100)" in result.python_code  # 10cm = 100mm

    def test_unit_conversion_m(self, config):
        result = parse_command("move forward 1m", config)
        assert result.success
        assert "robot.straight(1000)" in result.python_code  # 1m = 1000mm


# Parser tests - Routine calls
class TestParserRoutineCalls:
    @pytest.fixture
    def config(self):
        return RobotConfig()

    def test_run_mission(self, config):
        result = parse_command("run mission1", config, routine_names=["mission1", "mission2"])
        assert result.success
        assert result.python_code == "mission1()"
        assert result.command_type == "routine_call"

    def test_call_routine(self, config):
        result = parse_command("call grab_object", config, routine_names=["grab_object"])
        assert result.success
        assert result.python_code == "grab_object()"

    def test_execute_routine(self, config):
        result = parse_command("execute turn_around", config, routine_names=["turn_around"])
        assert result.success
        assert result.python_code == "turn_around()"

    def test_direct_routine_name(self, config):
        result = parse_command("mission1", config, routine_names=["mission1"])
        assert result.success
        assert result.python_code == "mission1()"

    def test_routine_with_params(self, config):
        result = parse_command("square with 200", config, routine_names=["square"])
        assert result.success
        assert "square(200)" in result.python_code

    def test_routine_no_match(self, config):
        # When routine name doesn't exist, should not match
        result = parse_command("run nonexistent", config, routine_names=["mission1"])
        assert result.command_type != "routine_call"


# Parser tests - Multitask/Parallel
class TestParserMultitask:
    @pytest.fixture
    def config(self):
        return RobotConfig()

    def test_while_driving_run_motor(self, config):
        result = parse_command(
            "move forward 200mm while running motor 180 degrees",
            config,
            motor_names=["motor"]
        )
        assert result.success
        assert result.command_type == "multitask"
        assert "async def task1" in result.python_code
        assert "async def task2" in result.python_code
        assert "multitask" in result.python_code

    def test_simultaneously(self, config):
        result = parse_command(
            "simultaneously move forward 100mm and turn right 45 degrees",
            config
        )
        assert result.success
        assert result.command_type == "multitask"
        assert "multitask" in result.python_code

    def test_at_same_time(self, config):
        result = parse_command(
            "move forward 200mm and run motor 90 degrees at the same time",
            config,
            motor_names=["motor"]
        )
        assert result.success
        assert result.command_type == "multitask"

    def test_simple_and_not_multitask(self, config):
        # "wait and" shouldn't trigger multitask without movement
        result = parse_command("wait 1 second", config)
        assert result.success
        assert result.command_type == "wait"
        assert result.command_type != "multitask"

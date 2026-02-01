"""
Tests for program endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_program(client: AsyncClient, auth_headers):
    """Test creating a new program."""
    response = await client.post(
        "/api/v1/programs",
        headers=auth_headers,
        json={
            "name": "My Program",
            "description": "A test program",
            "main_section": "move forward 100mm",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Program"
    assert data["main_section"] == "move forward 100mm"
    assert data["version"] == 1
    assert "share_code" in data


@pytest.mark.asyncio
async def test_list_programs(client: AsyncClient, auth_headers, test_program):
    """Test listing user's programs."""
    response = await client.get("/api/v1/programs", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    program_names = [p["name"] for p in data]
    assert "Test Program" in program_names


@pytest.mark.asyncio
async def test_get_program(client: AsyncClient, auth_headers, test_program):
    """Test getting a specific program."""
    response = await client.get(
        f"/api/v1/programs/{test_program.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Program"
    assert data["id"] == test_program.id


@pytest.mark.asyncio
async def test_get_program_by_share_code(client: AsyncClient, test_program):
    """Test getting a program by share code (no auth required)."""
    response = await client.get(
        f"/api/v1/programs/shared/{test_program.share_code}",
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Program"


@pytest.mark.asyncio
async def test_update_program(client: AsyncClient, auth_headers, test_program):
    """Test updating a program."""
    response = await client.patch(
        f"/api/v1/programs/{test_program.id}",
        headers=auth_headers,
        json={
            "name": "Updated Program",
            "main_section": "turn right 90 degrees",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Program"
    assert data["main_section"] == "turn right 90 degrees"
    assert data["version"] == 2  # Version should increment


@pytest.mark.asyncio
async def test_update_program_not_owner(client: AsyncClient, test_program, second_user):
    """Test updating a program when not owner."""
    from app.core.security import create_access_token
    token = create_access_token(data={"sub": second_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.patch(
        f"/api/v1/programs/{test_program.id}",
        headers=headers,
        json={"name": "Hacked"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_fork_program(client: AsyncClient, auth_headers, test_program):
    """Test forking a program."""
    response = await client.post(
        f"/api/v1/programs/{test_program.id}/fork",
        headers=auth_headers,
        json={"name": "My Fork"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "My Fork"
    assert data["id"] != test_program.id


@pytest.mark.asyncio
async def test_fork_program_default_name(client: AsyncClient, auth_headers, test_program):
    """Test forking a program with default name."""
    response = await client.post(
        f"/api/v1/programs/{test_program.id}/fork",
        headers=auth_headers,
        json={},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Copy of Test Program"


@pytest.mark.asyncio
async def test_delete_program(client: AsyncClient, auth_headers, test_program):
    """Test deleting a program."""
    response = await client.delete(
        f"/api/v1/programs/{test_program.id}",
        headers=auth_headers,
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_program_not_owner(client: AsyncClient, test_program, second_user):
    """Test deleting a program when not owner."""
    from app.core.security import create_access_token
    token = create_access_token(data={"sub": second_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.delete(
        f"/api/v1/programs/{test_program.id}",
        headers=headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_share_program(client: AsyncClient, auth_headers, test_program, second_user):
    """Test sharing a program with another user."""
    response = await client.post(
        f"/api/v1/programs/{test_program.id}/shares",
        headers=auth_headers,
        json={
            "user_email": second_user.email,
            "permission": "view",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user_email"] == second_user.email
    assert data["permission"] == "view"


@pytest.mark.asyncio
async def test_list_program_shares(client: AsyncClient, auth_headers, test_program, second_user, db_session):
    """Test listing program shares."""
    from app.models.program import ProgramShare, SharePermission

    # Create a share
    share = ProgramShare(
        program_id=test_program.id,
        user_id=second_user.id,
        permission=SharePermission.VIEW,
    )
    db_session.add(share)
    await db_session.commit()

    response = await client.get(
        f"/api/v1/programs/{test_program.id}/shares",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["user_email"] == second_user.email


@pytest.mark.asyncio
async def test_shared_user_can_view(client: AsyncClient, test_program, second_user, db_session):
    """Test that a user with VIEW permission can access the program."""
    from app.core.security import create_access_token
    from app.models.program import ProgramShare, SharePermission

    # Create a share
    share = ProgramShare(
        program_id=test_program.id,
        user_id=second_user.id,
        permission=SharePermission.VIEW,
    )
    db_session.add(share)
    await db_session.commit()

    token = create_access_token(data={"sub": second_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get(
        f"/api/v1/programs/{test_program.id}",
        headers=headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_shared_user_cannot_edit_with_view(client: AsyncClient, test_program, second_user, db_session):
    """Test that a user with VIEW permission cannot edit."""
    from app.core.security import create_access_token
    from app.models.program import ProgramShare, SharePermission

    # Create a view-only share
    share = ProgramShare(
        program_id=test_program.id,
        user_id=second_user.id,
        permission=SharePermission.VIEW,
    )
    db_session.add(share)
    await db_session.commit()

    token = create_access_token(data={"sub": second_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.patch(
        f"/api/v1/programs/{test_program.id}",
        headers=headers,
        json={"name": "Edited"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_shared_user_can_edit_with_permission(client: AsyncClient, test_program, second_user, db_session):
    """Test that a user with EDIT permission can edit."""
    from app.core.security import create_access_token
    from app.models.program import ProgramShare, SharePermission

    # Create an edit share
    share = ProgramShare(
        program_id=test_program.id,
        user_id=second_user.id,
        permission=SharePermission.EDIT,
    )
    db_session.add(share)
    await db_session.commit()

    token = create_access_token(data={"sub": second_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.patch(
        f"/api/v1/programs/{test_program.id}",
        headers=headers,
        json={"name": "Edited by Shared User"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Edited by Shared User"

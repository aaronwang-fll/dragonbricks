"""
Tests for team endpoints.
"""

import pytest
from httpx import AsyncClient

from app.models.team import Team


@pytest.mark.asyncio
async def test_create_team(client: AsyncClient, auth_headers):
    """Test creating a new team."""
    response = await client.post(
        "/api/v1/teams",
        headers=auth_headers,
        json={
            "name": "My New Team",
            "description": "A great team",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My New Team"
    assert data["description"] == "A great team"
    assert data["member_count"] == 1
    assert len(data["members"]) == 1
    assert data["members"][0]["role"] == "owner"


@pytest.mark.asyncio
async def test_list_teams(client: AsyncClient, auth_headers, test_team):
    """Test listing user's teams."""
    response = await client.get("/api/v1/teams", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    team_names = [t["name"] for t in data]
    assert "Test Team" in team_names


@pytest.mark.asyncio
async def test_get_team(client: AsyncClient, auth_headers, test_team):
    """Test getting a specific team."""
    response = await client.get(f"/api/v1/teams/{test_team.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Team"
    assert data["id"] == test_team.id


@pytest.mark.asyncio
async def test_get_team_not_member(client: AsyncClient, test_team, second_user, db_session):
    """Test getting a team when not a member."""
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": second_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get(f"/api/v1/teams/{test_team.id}", headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_team(client: AsyncClient, auth_headers, test_team):
    """Test updating a team."""
    response = await client.patch(
        f"/api/v1/teams/{test_team.id}",
        headers=auth_headers,
        json={"name": "Updated Team Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Team Name"


@pytest.mark.asyncio
async def test_join_team(client: AsyncClient, test_team, second_user, db_session):
    """Test joining a team with invite code."""
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": second_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post(
        f"/api/v1/teams/{test_team.id}/join",
        headers=headers,
        json={"invite_code": "testcode123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["member_count"] == 2


@pytest.mark.asyncio
async def test_join_team_wrong_code(client: AsyncClient, test_team, second_user, db_session):
    """Test joining a team with wrong invite code."""
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": second_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post(
        f"/api/v1/teams/{test_team.id}/join",
        headers=headers,
        json={"invite_code": "wrongcode"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_leave_team(client: AsyncClient, test_team, second_user, db_session):
    """Test leaving a team."""
    from app.core.security import create_access_token
    from app.models.team import TeamMember, TeamRole

    # First add second user to team
    member = TeamMember(
        team_id=test_team.id,
        user_id=second_user.id,
        role=TeamRole.MEMBER,
    )
    db_session.add(member)
    await db_session.commit()

    token = create_access_token(data={"sub": second_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post(
        f"/api/v1/teams/{test_team.id}/leave",
        headers=headers,
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_owner_cannot_leave(client: AsyncClient, auth_headers, test_team):
    """Test that team owner cannot leave."""
    response = await client.post(
        f"/api/v1/teams/{test_team.id}/leave",
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "Owner cannot leave" in response.json()["detail"]


@pytest.mark.asyncio
async def test_delete_team(client: AsyncClient, auth_headers, test_team):
    """Test deleting a team."""
    response = await client.delete(
        f"/api/v1/teams/{test_team.id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

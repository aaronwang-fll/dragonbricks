"""
Tests for user endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, auth_headers, test_user):
    """Test getting current user profile."""
    response = await client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["username"] == test_user.username
    assert data["full_name"] == test_user.full_name


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    """Test getting current user without authentication."""
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 403  # HTTPBearer returns 403 when no token


@pytest.mark.asyncio
async def test_update_current_user(client: AsyncClient, auth_headers, test_user):
    """Test updating current user profile."""
    response = await client.patch(
        "/api/v1/users/me",
        headers=auth_headers,
        json={
            "full_name": "Updated Name",
            "avatar_url": "https://example.com/avatar.png",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["avatar_url"] == "https://example.com/avatar.png"


@pytest.mark.asyncio
async def test_update_current_user_partial(client: AsyncClient, auth_headers, test_user):
    """Test partial update of current user profile."""
    original_email = test_user.email
    response = await client.patch(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"full_name": "New Name Only"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "New Name Only"
    assert data["email"] == original_email  # Should not change


@pytest.mark.asyncio
async def test_change_password_success(client: AsyncClient, auth_headers):
    """Test successful password change."""
    response = await client.post(
        "/api/v1/users/me/change-password",
        headers=auth_headers,
        json={
            "current_password": "testpassword123",
            "new_password": "newpassword456",
        },
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient, auth_headers):
    """Test password change fails with wrong current password."""
    response = await client.post(
        "/api/v1/users/me/change-password",
        headers=auth_headers,
        json={
            "current_password": "wrongpassword",
            "new_password": "newpassword456",
        },
    )
    assert response.status_code == 400
    assert "Current password is incorrect" in response.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_short_new(client: AsyncClient, auth_headers):
    """Test password change fails with short new password."""
    response = await client.post(
        "/api/v1/users/me/change-password",
        headers=auth_headers,
        json={
            "current_password": "testpassword123",
            "new_password": "short",
        },
    )
    assert response.status_code == 422  # Validation error

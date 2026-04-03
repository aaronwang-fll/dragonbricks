"""
Tests for authentication endpoints.
"""

from unittest.mock import patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """Test successful user registration."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "password123",
            "full_name": "New User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["username"] == "newuser"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user):
    """Test registration fails with duplicate email."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",  # Same as test_user
            "username": "differentuser",
            "password": "password123",
        },
    )
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient, test_user):
    """Test registration fails with duplicate username."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "different@example.com",
            "username": "testuser",  # Same as test_user
            "password": "password123",
        },
    )
    assert response.status_code == 400
    assert "Username already taken" in response.json()["detail"]


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    """Test registration fails with short password."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "user@example.com",
            "username": "user",
            "password": "short",  # Less than 6 characters
        },
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    """Test successful login."""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user):
    """Test login fails with wrong password."""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login fails for nonexistent user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 401


# --- Google Auth Tests ---

FAKE_GOOGLE_IDINFO = {
    "sub": "google-uid-12345",
    "email": "googleuser@gmail.com",
    "name": "Google User",
    "picture": "https://lh3.googleusercontent.com/photo.jpg",
}


@pytest.mark.asyncio
async def test_google_auth_new_user(client: AsyncClient):
    """Test Google sign-in creates a new user."""
    with (
        patch("app.api.auth.settings") as mock_settings,
        patch("app.api.auth.google_id_token.verify_oauth2_token") as mock_verify,
    ):
        mock_settings.GOOGLE_CLIENT_ID = "test-client-id"
        mock_verify.return_value = FAKE_GOOGLE_IDINFO

        response = await client.post(
            "/api/v1/auth/google",
            json={"credential": "fake-jwt-token"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "googleuser@gmail.com"
    assert data["user"]["username"] == "googleuser"


@pytest.mark.asyncio
async def test_google_auth_existing_email(client: AsyncClient, test_user):
    """Test Google sign-in links to existing email account."""
    with (
        patch("app.api.auth.settings") as mock_settings,
        patch("app.api.auth.google_id_token.verify_oauth2_token") as mock_verify,
    ):
        mock_settings.GOOGLE_CLIENT_ID = "test-client-id"
        mock_verify.return_value = {
            **FAKE_GOOGLE_IDINFO,
            "email": "test@example.com",  # Same as test_user
        }

        response = await client.post(
            "/api/v1/auth/google",
            json={"credential": "fake-jwt-token"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["username"] == "testuser"


@pytest.mark.asyncio
async def test_google_auth_invalid_token(client: AsyncClient):
    """Test Google sign-in rejects invalid tokens."""
    with (
        patch("app.api.auth.settings") as mock_settings,
        patch(
            "app.api.auth.google_id_token.verify_oauth2_token",
            side_effect=ValueError("Invalid token"),
        ),
    ):
        mock_settings.GOOGLE_CLIENT_ID = "test-client-id"

        response = await client.post(
            "/api/v1/auth/google",
            json={"credential": "bad-token"},
        )

    assert response.status_code == 401
    assert "Invalid Google token" in response.json()["detail"]


@pytest.mark.asyncio
async def test_google_auth_not_configured(client: AsyncClient):
    """Test Google sign-in returns 503 when not configured."""
    with patch("app.api.auth.settings") as mock_settings:
        mock_settings.GOOGLE_CLIENT_ID = None

        response = await client.post(
            "/api/v1/auth/google",
            json={"credential": "any-token"},
        )

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_rejects_oauth_only_user(client: AsyncClient, db_session):
    """Test password login fails for users who only have Google auth."""
    from app.models.user import User

    user = User(
        email="oauth@example.com",
        username="oauthuser",
        hashed_password=None,
        google_id="google-only-user",
        auth_provider="google",
    )
    db_session.add(user)
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "oauth@example.com", "password": "anypassword"},
    )
    assert response.status_code == 401

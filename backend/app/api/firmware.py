"""
Firmware download proxy endpoint.

Proxies Pybricks firmware downloads from GitHub releases to avoid CORS issues.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import httpx
from typing import Optional

router = APIRouter(prefix="/firmware", tags=["firmware"])

GITHUB_API = "https://api.github.com/repos/pybricks/pybricks-micropython/releases/latest"

# Valid hub types
VALID_HUB_TYPES = {"primehub", "essentialhub", "cityhub", "technichub", "movehub"}


@router.get("/info")
async def get_firmware_info():
    """Get latest firmware release info from GitHub."""
    async with httpx.AsyncClient() as client:
        response = await client.get(GITHUB_API)
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch release info from GitHub")
        
        release = response.json()
        
        return {
            "version": release["tag_name"],
            "assets": [
                {
                    "hub_type": asset["name"].split("-")[1],  # e.g., "pybricks-primehub-v3.6.1.zip" -> "primehub"
                    "name": asset["name"],
                    "size": asset["size"],
                    "download_url": f"/api/v1/firmware/download/{asset['name'].split('-')[1]}"
                }
                for asset in release["assets"]
                if asset["name"].endswith(".zip")
            ]
        }


@router.get("/download/{hub_type}")
async def download_firmware(hub_type: str):
    """
    Proxy firmware download from GitHub releases.
    
    This endpoint fetches the firmware from GitHub and streams it to the client,
    avoiding CORS issues that occur when fetching directly from the browser.
    """
    if hub_type not in VALID_HUB_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid hub type: {hub_type}")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # First get the release info
        release_response = await client.get(GITHUB_API)
        if release_response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch release info from GitHub")
        
        release = release_response.json()
        
        # Find the asset for this hub type
        asset = None
        for a in release["assets"]:
            if hub_type in a["name"] and a["name"].endswith(".zip"):
                asset = a
                break
        
        if not asset:
            raise HTTPException(status_code=404, detail=f"No firmware found for hub type: {hub_type}")
        
        # Stream the firmware file
        download_url = asset["browser_download_url"]
        
        async def stream_firmware():
            async with httpx.AsyncClient(follow_redirects=True) as download_client:
                async with download_client.stream("GET", download_url) as response:
                    if response.status_code != 200:
                        raise HTTPException(status_code=502, detail="Failed to download firmware from GitHub")
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        yield chunk
        
        return StreamingResponse(
            stream_firmware(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={asset['name']}",
                "Content-Length": str(asset["size"]),
            }
        )

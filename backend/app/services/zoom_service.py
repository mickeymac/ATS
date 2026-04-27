import base64
import httpx
from app.core.config import settings
from fastapi import HTTPException

async def get_zoom_access_token():
    try:
        url = f"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={settings.ZOOM_ACCOUNT_ID}"

        auth_string = f"{settings.ZOOM_CLIENT_ID}:{settings.ZOOM_CLIENT_SECRET}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode()

        headers = {
            "Authorization": f"Basic {encoded_auth}"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers)
        
        if response.status_code != 200:
            print("Zoom Token Auth Failed:", response.text)
            raise HTTPException(status_code=500, detail="Failed to authenticate with Zoom API")

        return response.json()["access_token"]
    except Exception as e:
        print("Zoom Token Exception:", str(e))
        raise HTTPException(status_code=500, detail="Error generating Zoom access token")

import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
import googleapiclient.discovery

from database import get_db, User

router = APIRouter()

SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
]

REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def get_flow():
    client_config = {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "redirect_uris": [REDIRECT_URI],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = REDIRECT_URI
    return flow


@router.get("/login")
def login():
    flow = get_flow()
    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return RedirectResponse(url=authorization_url)


@router.get("/callback")
def callback(code: str, db: Session = Depends(get_db)):
    flow = get_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials

    # Get user info
    oauth2_service = googleapiclient.discovery.build(
        "oauth2", "v2", credentials=credentials
    )
    user_info = oauth2_service.userinfo().get().execute()

    google_id = user_info.get("id")
    email = user_info.get("email")

    # Upsert user
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            google_id=google_id,
            email=email,
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
        )
        db.add(user)
    else:
        user.access_token = credentials.token
        if credentials.refresh_token:
            user.refresh_token = credentials.refresh_token

    db.commit()
    db.refresh(user)

    return RedirectResponse(
        url=f"{FRONTEND_URL}/dashboard?user_id={user.id}"
    )


def get_credentials(user_id: str, db: Session) -> Credentials:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    creds = Credentials(
        token=user.access_token,
        refresh_token=user.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=SCOPES,
    )
    return creds

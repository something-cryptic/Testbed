import uuid
import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from database import get_db, init_db, Analysis
from auth import router as auth_router
from youtube import get_recent_videos, get_channel_analytics
from analyzer import analyze_channel

app = FastAPI(title="YouTube Content Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/videos/{user_id}")
def get_videos(user_id: str, db: Session = Depends(get_db)):
    try:
        videos = get_recent_videos(user_id, db, max_results=50)
        return {"videos": videos, "count": len(videos)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics/{user_id}")
def get_analytics(user_id: str, db: Session = Depends(get_db)):
    try:
        analytics = get_channel_analytics(user_id, db)
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/{user_id}")
def analyze(user_id: str, db: Session = Depends(get_db)):
    try:
        # Fetch data
        videos = get_recent_videos(user_id, db, max_results=50)
        analytics = get_channel_analytics(user_id, db)

        # Run analysis
        result = analyze_channel(videos, analytics)

        # Store result
        analysis = Analysis(
            id=str(uuid.uuid4()),
            user_id=user_id,
            result_json=json.dumps(result),
        )
        db.add(analysis)
        db.commit()

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

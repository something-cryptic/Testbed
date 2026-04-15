from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
import googleapiclient.discovery
from googleapiclient.errors import HttpError

from auth import get_credentials


def get_youtube_client(user_id: str, db: Session):
    creds = get_credentials(user_id, db)
    return googleapiclient.discovery.build("youtube", "v3", credentials=creds)


def get_analytics_client(user_id: str, db: Session):
    creds = get_credentials(user_id, db)
    return googleapiclient.discovery.build("youtubeAnalytics", "v2", credentials=creds)


def get_recent_videos(user_id: str, db: Session, max_results: int = 50):
    youtube = get_youtube_client(user_id, db)

    # Get channel ID
    channels_response = youtube.channels().list(part="id", mine=True).execute()
    if not channels_response.get("items"):
        raise HTTPException(status_code=404, detail="No YouTube channel found")

    channel_id = channels_response["items"][0]["id"]

    # Get uploads playlist ID
    channel_details = (
        youtube.channels()
        .list(part="contentDetails", id=channel_id)
        .execute()
    )
    uploads_playlist_id = channel_details["items"][0]["contentDetails"][
        "relatedPlaylists"
    ]["uploads"]

    # Get playlist items
    playlist_items = []
    next_page_token = None

    while len(playlist_items) < max_results:
        request = youtube.playlistItems().list(
            part="contentDetails",
            playlistId=uploads_playlist_id,
            maxResults=min(50, max_results - len(playlist_items)),
            pageToken=next_page_token,
        )
        response = request.execute()
        playlist_items.extend(response.get("items", []))
        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    if not playlist_items:
        return []

    # Get video IDs
    video_ids = [
        item["contentDetails"]["videoId"] for item in playlist_items
    ]

    # Get video details in batches of 50
    videos = []
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        videos_response = (
            youtube.videos()
            .list(
                part="snippet,statistics,contentDetails",
                id=",".join(batch),
            )
            .execute()
        )
        videos.extend(videos_response.get("items", []))

    # Format video data
    formatted_videos = []
    for video in videos:
        snippet = video.get("snippet", {})
        statistics = video.get("statistics", {})
        content_details = video.get("contentDetails", {})

        formatted_videos.append(
            {
                "id": video["id"],
                "title": snippet.get("title", ""),
                "description": snippet.get("description", ""),
                "tags": snippet.get("tags", []),
                "publishedAt": snippet.get("publishedAt", ""),
                "thumbnails": snippet.get("thumbnails", {}),
                "viewCount": int(statistics.get("viewCount", 0)),
                "likeCount": int(statistics.get("likeCount", 0)),
                "commentCount": int(statistics.get("commentCount", 0)),
                "duration": content_details.get("duration", ""),
            }
        )

    return formatted_videos


def get_video_analytics(user_id: str, db: Session, video_id: str, start_date: str = None):
    analytics = get_analytics_client(user_id, db)

    if not start_date:
        start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

    end_date = datetime.now().strftime("%Y-%m-%d")

    try:
        response = (
            analytics.reports()
            .query(
                ids="channel==MINE",
                startDate=start_date,
                endDate=end_date,
                metrics="estimatedMinutesWatched,averageViewDuration,averageViewPercentage,impressions,impressionClickThroughRate,subscribersGained",
                dimensions="video",
                filters=f"video=={video_id}",
            )
            .execute()
        )

        rows = response.get("rows", [])
        if not rows:
            return {}

        col_headers = [h["name"] for h in response.get("columnHeaders", [])]
        row = rows[0]

        return dict(zip(col_headers, row))
    except HttpError:
        return {}


def get_channel_analytics(user_id: str, db: Session):
    analytics = get_analytics_client(user_id, db)

    start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    end_date = datetime.now().strftime("%Y-%m-%d")

    try:
        response = (
            analytics.reports()
            .query(
                ids="channel==MINE",
                startDate=start_date,
                endDate=end_date,
                metrics="views,estimatedMinutesWatched,subscribersGained,subscribersLost",
                dimensions="day",
            )
            .execute()
        )

        col_headers = [h["name"] for h in response.get("columnHeaders", [])]
        rows = response.get("rows", [])

        daily_data = []
        for row in rows:
            daily_data.append(dict(zip(col_headers, row)))

        # Aggregate totals
        totals = {
            "views": sum(int(r.get("views", 0)) for r in daily_data),
            "watchTime": sum(float(r.get("estimatedMinutesWatched", 0)) for r in daily_data),
            "subscribersGained": sum(int(r.get("subscribersGained", 0)) for r in daily_data),
            "subscribersLost": sum(int(r.get("subscribersLost", 0)) for r in daily_data),
            "dailyData": daily_data,
        }

        return totals
    except HttpError as e:
        raise HTTPException(status_code=500, detail=f"Analytics API error: {str(e)}")

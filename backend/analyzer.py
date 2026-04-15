import json
import anthropic

client = anthropic.Anthropic()

SYSTEM_PROMPT = """You are a YouTube growth strategist. Analyze this creator's video performance data and return specific, actionable recommendations. Focus on: title patterns, posting frequency, video length, tags, and engagement rates. Be specific with examples from their actual data."""


def analyze_channel(videos_data: list, analytics_data: dict) -> dict:
    # Prepare a summary of the data to send to Claude
    # Limit to avoid token overflow
    video_summary = []
    for video in videos_data[:30]:
        video_summary.append(
            {
                "title": video.get("title", ""),
                "viewCount": video.get("viewCount", 0),
                "likeCount": video.get("likeCount", 0),
                "commentCount": video.get("commentCount", 0),
                "tags": video.get("tags", [])[:10],
                "publishedAt": video.get("publishedAt", ""),
                "duration": video.get("duration", ""),
            }
        )

    data_payload = {
        "channel_analytics": {
            "views_last_90_days": analytics_data.get("views", 0),
            "watch_time_minutes": analytics_data.get("watchTime", 0),
            "subscribers_gained": analytics_data.get("subscribersGained", 0),
            "subscribers_lost": analytics_data.get("subscribersLost", 0),
        },
        "recent_videos": video_summary,
    }

    user_message = f"""Here is the YouTube channel performance data for analysis:

{json.dumps(data_payload, indent=2)}

Please analyze this data and return a JSON response with the following structure:
{{
    "top_insights": ["insight1", "insight2", "insight3"],
    "quick_wins": ["win1", "win2", "win3"],
    "content_gaps": ["gap1", "gap2"],
    "best_performing_patterns": ["pattern1", "pattern2"],
    "recommendations": [
        {{
            "category": "titles|length|timing|tags|thumbnails",
            "finding": "what you found",
            "action": "what to do",
            "expected_impact": "low|medium|high"
        }}
    ]
}}

Return ONLY valid JSON, no additional text."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    response_text = response.content[0].text.strip()

    # Strip markdown code blocks if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        response_text = "\n".join(lines[1:-1])

    result = json.loads(response_text)
    return result

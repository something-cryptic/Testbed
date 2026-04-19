from __future__ import annotations
from datetime import datetime, timezone
from collections import Counter
from statistics import stdev, mean
import math
from typing import Any

Post = dict[str, Any]


def calculate_engagement_rate(posts: list[Post]) -> float:
    rates = []
    for p in posts:
        m = p.get("metrics", {})
        views = m.get("views", 0)
        if views > 0:
            rate = ((m.get("likes", 0) + m.get("comments", 0)) / views) * 100
            rates.append(rate)
    return round(mean(rates), 4) if rates else 0.0


def find_best_posting_times(posts: list[Post]) -> tuple[list[str], list[int]]:
    """Return (best_days, best_hours) based on average views per publish time."""
    day_views: dict[str, list[int]] = {}
    hour_views: dict[int, list[int]] = {}

    for p in posts:
        published = p.get("publishedAt", "")
        views = p.get("metrics", {}).get("views", 0)
        if not published:
            continue
        try:
            dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
        except ValueError:
            continue
        day = dt.strftime("%A")
        hour = dt.hour
        day_views.setdefault(day, []).append(views)
        hour_views.setdefault(hour, []).append(views)

    # Rank days/hours by mean views
    day_means = {d: mean(vs) for d, vs in day_views.items() if vs}
    hour_means = {h: mean(vs) for h, vs in hour_views.items() if vs}

    best_days = sorted(day_means, key=lambda d: day_means[d], reverse=True)[:3]
    best_hours = sorted(hour_means, key=lambda h: hour_means[h], reverse=True)[:3]

    return best_days, best_hours


def calculate_view_velocity(posts: list[Post]) -> float:
    """Score 0-1: how fast recent videos accumulate views relative to channel average."""
    if not posts:
        return 0.0

    now = datetime.now(timezone.utc)
    velocities = []

    for p in posts:
        published = p.get("publishedAt", "")
        views = p.get("metrics", {}).get("views", 0)
        if not published or views == 0:
            continue
        try:
            dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
        except ValueError:
            continue
        age_days = max((now - dt).days, 1)
        velocities.append(views / age_days)

    if not velocities:
        return 0.0

    avg = mean(velocities)
    if avg == 0:
        return 0.0

    # Score most recent video's velocity vs channel average
    recent_velocity = velocities[0]
    raw_score = recent_velocity / avg
    # Sigmoid to normalize to 0-1
    return round(1 / (1 + math.exp(-0.5 * (raw_score - 1))), 4)


def score_consistency(posts: list[Post]) -> float:
    """Return 0-1 consistency score (1 = perfectly regular posting schedule)."""
    if len(posts) < 3:
        return 0.5

    dates = []
    for p in posts:
        published = p.get("publishedAt", "")
        if not published:
            continue
        try:
            dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            dates.append(dt)
        except ValueError:
            continue

    if len(dates) < 3:
        return 0.5

    dates.sort(reverse=True)
    intervals = [(dates[i] - dates[i + 1]).days for i in range(len(dates) - 1)]

    if not intervals:
        return 0.5

    avg_interval = mean(intervals)
    if avg_interval == 0:
        return 1.0

    sd = stdev(intervals) if len(intervals) > 1 else 0
    cv = sd / avg_interval  # coefficient of variation
    # CV=0 → score=1 (perfectly consistent), CV=1 → score≈0.37
    return round(math.exp(-cv), 4)


def extract_top_tags(posts: list[Post]) -> list[str]:
    """Return tags that appear most in high-performing posts (above-median views)."""
    if not posts:
        return []

    views_list = [p.get("metrics", {}).get("views", 0) for p in posts]
    median_views = sorted(views_list)[len(views_list) // 2]

    tag_counter: Counter[str] = Counter()
    for p in posts:
        if p.get("metrics", {}).get("views", 0) >= median_views:
            for tag in p.get("tags", []):
                tag_counter[tag.lower()] += 1

    return [tag for tag, _ in tag_counter.most_common(10)]


def calculate_optimal_length(posts: list[Post]) -> int:
    """Return the median video duration (seconds) of the top quartile by views."""
    if not posts:
        return 0

    sorted_by_views = sorted(posts, key=lambda p: p.get("metrics", {}).get("views", 0), reverse=True)
    top_quartile = sorted_by_views[: max(1, len(sorted_by_views) // 4)]

    durations = [p.get("metrics", {}).get("watchTimeSeconds", 0) for p in top_quartile]
    durations = [d for d in durations if d > 0]
    if not durations:
        return 0

    durations.sort()
    return durations[len(durations) // 2]


def calculate_engagement_trend(posts: list[Post]) -> str:
    """Compare engagement rate of most recent 5 posts vs the 5 before that."""
    if len(posts) < 6:
        return "stable"

    def eng_rate(p: Post) -> float:
        m = p.get("metrics", {})
        views = m.get("views", 0)
        if views == 0:
            return 0.0
        return ((m.get("likes", 0) + m.get("comments", 0)) / views) * 100

    sorted_posts = sorted(posts, key=lambda p: p.get("publishedAt", ""), reverse=True)
    recent = mean([eng_rate(p) for p in sorted_posts[:5]])
    older = mean([eng_rate(p) for p in sorted_posts[5:10]])

    if older == 0:
        return "stable"

    delta = (recent - older) / older
    if delta > 0.1:
        return "improving"
    if delta < -0.1:
        return "declining"
    return "stable"

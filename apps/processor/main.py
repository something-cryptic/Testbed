from __future__ import annotations
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from processor import (
    calculate_engagement_rate,
    find_best_posting_times,
    calculate_view_velocity,
    score_consistency,
    extract_top_tags,
    calculate_optimal_length,
    calculate_engagement_trend,
)

app = FastAPI(title="YouTube Analyzer Processor", version="1.0.0")


class ProcessRequest(BaseModel):
    posts: list[dict[str, Any]]


class ProcessResponse(BaseModel):
    avgEngagementRate: float
    bestPostingDays: list[str]
    bestPostingHours: list[int]
    optimalVideoLength: int
    topPerformingTags: list[str]
    viewVelocityScore: float
    consistencyScore: float
    engagementTrend: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/process", response_model=ProcessResponse)
def process(req: ProcessRequest) -> ProcessResponse:
    posts = req.posts
    best_days, best_hours = find_best_posting_times(posts)

    return ProcessResponse(
        avgEngagementRate=calculate_engagement_rate(posts),
        bestPostingDays=best_days,
        bestPostingHours=best_hours,
        optimalVideoLength=calculate_optimal_length(posts),
        topPerformingTags=extract_top_tags(posts),
        viewVelocityScore=calculate_view_velocity(posts),
        consistencyScore=score_consistency(posts),
        engagementTrend=calculate_engagement_trend(posts),
    )

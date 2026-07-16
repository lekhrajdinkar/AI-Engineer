"""
Simple script to list videos from a YouTube channel (e.g. @KodeKloud) using YouTube Data API v3.

Usage examples (PowerShell):

# Export API key to environment (or add to .env in repo root)
$env:OPENAI_API_KEY = "..."  # not needed for this script
$env:YOUTUBE_API_KEY = "YOUR_YOUTUBE_API_KEY"

# Run the script (max 50 results)
python -m src.y2026.youtube_agent.get_kodekloud_videos --query KodeKloud --max-results 50

# Or specify a channel id directly
python -m src.y2026.youtube_agent.get_kodekloud_videos --channel-id UCf0r... --max-results 100

Notes:
- This script requires a Google YouTube Data API v3 key stored in environment variable `YOUTUBE_API_KEY`.
- If you don't have an API key, the script will explain how to get one and exit.
- The script writes JSON to `metadata/kodekloud_videos.json` by default.

"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

# Load .env if present (project uses python-dotenv)
load_dotenv()

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


def require_api_key() -> str:
    key = os.getenv("YOUTUBE_API_KEY")
    if not key:
        print("ERROR: YOUTUBE_API_KEY not found in environment. Please create a YouTube Data API v3 key and set YOUTUBE_API_KEY.")
        print("Guide: https://developers.google.com/youtube/v3/getting-started")
        sys.exit(1)
    return key


def find_channel_id(api_key: str, query: str, debug: bool = False) -> Optional[str]:
    """Search channels by query (name/handle) and return best channelId or None."""
    params = {
        "part": "snippet",
        "q": query,
        "type": "channel",
        "maxResults": 5,
        "key": api_key,
    }
    url = f"{YOUTUBE_API_BASE}/search"
    if debug:
        print(f"DEBUG: find_channel_id() -> url={url} params={params}")
    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
    except requests.exceptions.HTTPError as e:
        print(f"ERROR: YouTube API request failed: {e}")
        print("Check that your YOUTUBE_API_KEY is valid and that the YouTube Data API is enabled for the key.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Network error while calling YouTube API: {e}")
        return None

    items = data.get("items", [])
    if debug:
        print(f"DEBUG: find_channel_id() -> items_found={len(items)}")
    if not items:
        return None

    # Prefer exact channelTitle match (case-insensitive), otherwise return first
    q_lower = query.lower().lstrip("@")
    for it in items:
        title = it.get("snippet", {}).get("channelTitle", "").lower()
        if q_lower in title or title in q_lower:
            return it.get("snippet", {}).get("channelId")

    first = items[0]
    if debug:
        print(f"DEBUG: find_channel_id() -> returning first match channelTitle={first.get('snippet',{}).get('channelTitle')} channelId={first.get('snippet',{}).get('channelId')}")
    return first.get("snippet", {}).get("channelId")


def get_videos_for_channel(api_key: str, channel_id: str, max_results: int = 100, debug: bool = False) -> List[Dict[str, Any]]:
    """Retrieve videos for a channel using the `search` endpoint (type=video)."""
    videos: List[Dict[str, Any]] = []
    params = {
        "part": "snippet",
        "channelId": channel_id,
        "order": "date",
        "maxResults": 50,  # API limit per page
        "type": "video",
        "key": api_key,
    }
    url = f"{YOUTUBE_API_BASE}/search"

    if debug:
        print(f"DEBUG: get_videos_for_channel() -> start channel_id={channel_id} max_results={max_results}")
        print(f"DEBUG: initial params={params}")

    while True:
        try:
            r = requests.get(url, params=params, timeout=15)
            r.raise_for_status()
            data = r.json()
        except requests.exceptions.HTTPError as e:
            print(f"ERROR: YouTube API request failed: {e}")
            print("Check that your YOUTUBE_API_KEY is valid and has YouTube Data API v3 access.")
            break
        except requests.exceptions.RequestException as e:
            print(f"ERROR: Network error while calling YouTube API: {e}")
            break
        items = data.get("items", [])
        if debug:
            print(f"DEBUG: get_videos_for_channel() -> page items={len(items)} nextPageToken={data.get('nextPageToken')}")
        for item in items:
            vid = item.get("id", {}).get("videoId")
            snippet = item.get("snippet", {})
            videos.append(
                {
                    "video_id": vid,
                    "title": snippet.get("title"),
                    "description": snippet.get("description"),
                    "published_at": snippet.get("publishedAt"),
                    "channel_title": snippet.get("channelTitle"),
                    "video_url": f"https://www.youtube.com/watch?v={vid}" if vid else None,
                }
            )
            if debug:
                print(f"DEBUG: appended video_id={vid} title={snippet.get('title')}")
            if len(videos) >= max_results:
                return videos[:max_results]

        # pagination
        next_token = data.get("nextPageToken")
        if not next_token:
            break
        params["pageToken"] = next_token
        time.sleep(0.1)

    return videos


def save_json(data: Any, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch videos from a YouTube channel (search by name/handle or use channel id).")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--query", help="Channel search query (e.g. KodeKloud or @KodeKloud)")
    group.add_argument("--channel-id", help="YouTube channel ID (starts with UC...")
    parser.add_argument("--max-results", type=int, default=50, help="Maximum number of videos to fetch (default: 50)")
    parser.add_argument("--out", default="metadata/kodekloud_videos.json", help="Output JSON file path")
    parser.add_argument("--debug", action="store_true", help="Enable debug prints of internal state")

    args = parser.parse_args(argv)

    api_key = require_api_key()

    channel_id = args.channel_id
    if not channel_id:
        print(f"Resolving channel id for query: {args.query}")
        channel_id = find_channel_id(api_key, args.query, debug=args.debug)
        if not channel_id:
            print("ERROR: Unable to find channel id for query.")
            return 2
        print(f"Resolved channel id: {channel_id}")

    print(f"Fetching up to {args.max_results} videos for channel {channel_id}...")
    videos = get_videos_for_channel(api_key, channel_id, max_results=args.max_results, debug=args.debug)
    print(f"Found {len(videos)} videos. Writing to {args.out}")

    output = {
        "channel_id": channel_id,
        "query": args.query if args.query else None,
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "count": len(videos),
        "videos": videos,
    }

    save_json(output, args.out)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


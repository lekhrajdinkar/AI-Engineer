import os
from typing import List, Optional
import requests
from urllib.parse import urlencode
from datetime import datetime
from src.y2026.youtube_agent_2.backend import db_sqlLite
from src.y2026.youtube_agent_2.backend import config

def get_oauth_authorize_url(client_id: str, redirect_uri: str, scope: str):
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",
        "prompt": "consent",
    }
    return config.GOOGLE_OAUTH_AUTHORIZE + "?" + urlencode(params)


def exchange_code_for_tokens(code: str, client_id: str, client_secret: str, redirect_uri: str) -> Optional[dict]:
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    resp = requests.post(config.GOOGLE_OAUTH_TOKEN, data=data, timeout=10)
    if resp.status_code != 200:
        return None
    tokens = resp.json()
    tokens["created_at"] = datetime.utcnow().isoformat()
    db.save_tokens("google", tokens)
    return tokens


def refresh_access_token(refresh_token: str, client_id: str, client_secret: str) -> Optional[dict]:
    data = {
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
    }
    resp = requests.post(config.GOOGLE_OAUTH_TOKEN, data=data, timeout=10)
    if resp.status_code != 200:
        return None
    tokens = resp.json()
    tokens["created_at"] = datetime.utcnow().isoformat()
    # Preserve refresh_token if missing in response
    if "refresh_token" not in tokens:
        tokens["refresh_token"] = refresh_token
    db.save_tokens("google", tokens)
    return tokens


def list_subscribed_channels() -> List[dict]:
    # Try to load latest google tokens
    tokens = db.load_latest_tokens("google")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    print(f"🔍 [list_subscribed_channels] Loaded tokens: {bool(tokens)}")
    if tokens:
        print(f"   Token keys: {list(tokens.keys())}")
        print(f"   Has access_token: {'access_token' in tokens}")
    
    if not tokens or "access_token" not in tokens:
        print("❌ No tokens or missing access_token, returning DEMO_CHANNELS")
        return config.DEMO_CHANNELS

    access_token = tokens["access_token"]
    print(f"✅ Using access_token: {access_token[:20]}...")
    
    # Use API; refresh if needed
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"part": "snippet", "mine": "true", "maxResults": 50}
    items = []
    nextPage = None
    
    while True:
        if nextPage:
            params["pageToken"] = nextPage
        print(f"📡 Requesting YouTube subscriptions API...")
        try:
            resp = requests.get(config.YOUTUBE_SUBSCRIPTIONS_API, headers=headers, params=params, timeout=10)
            print(f"   Response status: {resp.status_code}")
            print(f"   Response text (first 200 chars): {resp.text[:200]}")
        except Exception as e:
            print(f"   Request error: {e}")
            return config.DEMO_CHANNELS
            
        if resp.status_code == 401 and client_id and client_secret and tokens.get("refresh_token"):
            # Try to refresh
            print(f"⚠️  Got 401 Unauthorized, attempting token refresh...")
            refreshed = refresh_access_token(tokens.get("refresh_token"), client_id, client_secret)
            if not refreshed:
                print(f"   Token refresh failed, returning DEMO_CHANNELS")
                return config.DEMO_CHANNELS
            access_token = refreshed["access_token"]
            headers["Authorization"] = f"Bearer {access_token}"
            print(f"✅ Token refreshed, retrying API call...")
            continue
            
        if resp.status_code != 200:
            print(f"❌ API returned {resp.status_code}: {resp.text[:200]}")
            return config.DEMO_CHANNELS
            
        data = resp.json()
        print(f"✅ Got response with {len(data.get('items', []))} subscriptions")
        
        for it in data.get("items", []):
            snip = it.get("snippet", {})
            resId = snip.get("resourceId", {})
            channelId = resId.get("channelId")
            title = snip.get("title")
            items.append({"channel_id": channelId, "title": title, "url": f"https://youtube.com/channel/{channelId}"})
        
        nextPage = data.get("nextPageToken")
        if not nextPage:
            break

    print(f"📦 Returning {len(items)} real channels from YouTube API")
    return items if items else config.DEMO_CHANNELS


def get_channel_playlists(channel_id: str) -> List[dict]:
    """Fetch all playlists for a given channel."""
    tokens = db.load_latest_tokens("google")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not tokens or "access_token" not in tokens:
        print(f"❌ [get_channel_playlists] No tokens, returning empty list")
        return []
    
    access_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"part": "snippet", "channelId": channel_id, "maxResults": 50}
    items = []
    nextPage = None
    
    while True:
        if nextPage:
            params["pageToken"] = nextPage
        
        print(f"📡 [get_channel_playlists] Fetching playlists for channel {channel_id}...")
        try:
            resp = requests.get("https://www.googleapis.com/youtube/v3/playlists", headers=headers, params=params, timeout=10)
        except Exception as e:
            print(f"   Request error: {e}")
            return []
        
        if resp.status_code == 401 and client_id and client_secret and tokens.get("refresh_token"):
            print(f"⚠️  Got 401, refreshing token...")
            refreshed = refresh_access_token(tokens.get("refresh_token"), client_id, client_secret)
            if not refreshed:
                return []
            access_token = refreshed["access_token"]
            headers["Authorization"] = f"Bearer {access_token}"
            continue
        
        if resp.status_code != 200:
            print(f"❌ API returned {resp.status_code}")
            return []
        
        data = resp.json()
        for it in data.get("items", []):
            snip = it.get("snippet", {})
            items.append({
                "playlist_id": it.get("id"),
                "title": snip.get("title"),
                "description": snip.get("description"),
                "thumbnail": snip.get("thumbnails", {}).get("default", {}).get("url")
            })
        
        nextPage = data.get("nextPageToken")
        if not nextPage:
            break
    
    print(f"✅ Found {len(items)} playlists for channel {channel_id}")
    return items


def get_playlist_videos(playlist_id: str) -> List[dict]:
    """Fetch all videos from a specific playlist."""
    tokens = db.load_latest_tokens("google")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not tokens or "access_token" not in tokens:
        print(f"❌ [get_playlist_videos] No tokens, returning empty list")
        return []
    
    access_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"part": "snippet", "playlistId": playlist_id, "maxResults": 50}
    items = []
    nextPage = None
    
    while True:
        if nextPage:
            params["pageToken"] = nextPage
        
        print(f"📡 [get_playlist_videos] Fetching videos for playlist {playlist_id}...")
        try:
            resp = requests.get("https://www.googleapis.com/youtube/v3/playlistItems", headers=headers, params=params, timeout=10)
        except Exception as e:
            print(f"   Request error: {e}")
            return []
        
        if resp.status_code == 401 and client_id and client_secret and tokens.get("refresh_token"):
            print(f"⚠️  Got 401, refreshing token...")
            refreshed = refresh_access_token(tokens.get("refresh_token"), client_id, client_secret)
            if not refreshed:
                return []
            access_token = refreshed["access_token"]
            headers["Authorization"] = f"Bearer {access_token}"
            continue
        
        if resp.status_code != 200:
            print(f"❌ API returned {resp.status_code}")
            return []
        
        data = resp.json()
        for it in data.get("items", []):
            snip = it.get("snippet", {})
            vid_id = snip.get("resourceId", {}).get("videoId")
            if vid_id:
                items.append({
                    "video_id": vid_id,
                    "title": snip.get("title"),
                    "description": snip.get("description"),
                    "thumbnail": snip.get("thumbnails", {}).get("default", {}).get("url"),
                    "url": f"https://youtube.com/watch?v={vid_id}",
                    "position": it.get("position")
                })
        
        nextPage = data.get("nextPageToken")
        if not nextPage:
            break
    
    print(f"✅ Found {len(items)} videos in playlist {playlist_id}")
    return items


def get_channel_videos(channel_id: str) -> List[dict]:
    """Fetch all videos uploaded to a channel (via its uploads playlist)."""
    tokens = db.load_latest_tokens("google")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not tokens or "access_token" not in tokens:
        print(f"❌ [get_channel_videos] No tokens, returning empty list")
        return []
    
    access_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # First, get the uploads playlist ID for this channel
    print(f"📡 [get_channel_videos] Fetching uploads playlist for channel {channel_id}...")
    try:
        resp = requests.get(
            "https://www.googleapis.com/youtube/v3/channels",
            headers=headers,
            params={"part": "contentDetails", "id": channel_id},
            timeout=10
        )
    except Exception as e:
        print(f"   Request error: {e}")
        return []
    
    if resp.status_code == 401 and client_id and client_secret and tokens.get("refresh_token"):
        print(f"⚠️  Got 401, refreshing token...")
        refreshed = refresh_access_token(tokens.get("refresh_token"), client_id, client_secret)
        if not refreshed:
            return []
        access_token = refreshed["access_token"]
        headers["Authorization"] = f"Bearer {access_token}"
        # Retry
        try:
            resp = requests.get(
                "https://www.googleapis.com/youtube/v3/channels",
                headers=headers,
                params={"part": "contentDetails", "id": channel_id},
                timeout=10
            )
        except Exception as e:
            print(f"   Request error on retry: {e}")
            return []
    
    if resp.status_code != 200:
        print(f"❌ Channels API returned {resp.status_code}")
        return []
    
    data = resp.json()
    items = data.get("items", [])
    if not items:
        print(f"❌ No channel found with id {channel_id}")
        return []
    
    uploads_playlist_id = items[0].get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")
    if not uploads_playlist_id:
        print(f"❌ Could not find uploads playlist for channel {channel_id}")
        return []
    
    print(f"✅ Found uploads playlist: {uploads_playlist_id}")
    # Now fetch videos from the uploads playlist
    return get_playlist_videos(uploads_playlist_id)



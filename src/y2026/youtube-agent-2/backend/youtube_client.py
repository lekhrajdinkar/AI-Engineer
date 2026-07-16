import os
from typing import List, Optional
import requests
from urllib.parse import urlencode
from datetime import datetime
from . import db

# Demo fallback channels
DEMO_CHANNELS = [
    {"channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw", "title": "Google Developers", "url": "https://youtube.com/channel/UC_x5...", "videos_count": 120},
    {"channel_id": "UCJPLp5SjeGSdVdwsfb9Q7lQ", "title": "NASA", "url": "https://youtube.com/channel/UCJPLp...", "videos_count": 340},
]


GOOGLE_OAUTH_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN = "https://oauth2.googleapis.com/token"
YOUTUBE_SUBSCRIPTIONS_API = "https://www.googleapis.com/youtube/v3/subscriptions"


def get_oauth_authorize_url(client_id: str, redirect_uri: str, scope: str):
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",
        "prompt": "consent",
    }
    return GOOGLE_OAUTH_AUTHORIZE + "?" + urlencode(params)


def exchange_code_for_tokens(code: str, client_id: str, client_secret: str, redirect_uri: str) -> Optional[dict]:
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    resp = requests.post(GOOGLE_OAUTH_TOKEN, data=data, timeout=10)
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
    resp = requests.post(GOOGLE_OAUTH_TOKEN, data=data, timeout=10)
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
        return DEMO_CHANNELS

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
            resp = requests.get(YOUTUBE_SUBSCRIPTIONS_API, headers=headers, params=params, timeout=10)
            print(f"   Response status: {resp.status_code}")
            print(f"   Response text (first 200 chars): {resp.text[:200]}")
        except Exception as e:
            print(f"   Request error: {e}")
            return DEMO_CHANNELS
            
        if resp.status_code == 401 and client_id and client_secret and tokens.get("refresh_token"):
            # Try to refresh
            print(f"⚠️  Got 401 Unauthorized, attempting token refresh...")
            refreshed = refresh_access_token(tokens.get("refresh_token"), client_id, client_secret)
            if not refreshed:
                print(f"   Token refresh failed, returning DEMO_CHANNELS")
                return DEMO_CHANNELS
            access_token = refreshed["access_token"]
            headers["Authorization"] = f"Bearer {access_token}"
            print(f"✅ Token refreshed, retrying API call...")
            continue
            
        if resp.status_code != 200:
            print(f"❌ API returned {resp.status_code}: {resp.text[:200]}")
            return DEMO_CHANNELS
            
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
    return items if items else DEMO_CHANNELS


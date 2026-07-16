#!/usr/bin/env python
"""Test script for new YouTube video/playlist endpoints."""

import requests
import json
import time

BASE_URL = "http://localhost:8001"
time.sleep(2)  # Give backend time to start

def test_api(method, endpoint, params=None):
    """Helper to test API endpoint."""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{'='*70}")
    print(f"🧪 {method} {endpoint}")
    if params:
        print(f"   Params: {params}")
    try:
        if method == "GET":
            r = requests.get(url, params=params)
        else:
            r = requests.post(url, json=params)
        
        print(f"   Status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            print(f"   ✅ Success")
            return data
        else:
            print(f"   ❌ Error: {r.text[:200]}")
            return None
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return None


print("🚀 Testing YouTube Video/Playlist Endpoints")
print("="*70)

# 1. Get channels
channels_resp = test_api("GET", "/api/channels")
if channels_resp:
    channels = channels_resp.get("channels", [])
    print(f"   Found {len(channels)} channels")
    if channels:
        channel_id = channels[0]["channel_id"]
        print(f"   Using channel: {channels[0]['title']} (ID: {channel_id})")
        
        # 2. Get playlists for first channel
        print(f"\n📋 Testing playlists for channel...")
        playlists_resp = test_api("GET", f"/api/{channel_id}/playlists")
        if playlists_resp:
            playlists = playlists_resp.get("playlists", [])
            print(f"   Found {len(playlists)} playlists")
            
            # 3. Get videos for channel (uploads playlist)
            print(f"\n🎬 Testing videos for channel uploads...")
            videos_resp = test_api("GET", "/api/videos", {"channel_id": channel_id})
            if videos_resp:
                videos = videos_resp.get("videos", [])
                print(f"   Found {len(videos)} videos")
                if videos:
                    print(f"   First video: {videos[0].get('title', 'N/A')}")
            
            # 4. Get videos for specific playlist (if any)
            if playlists:
                playlist_id = playlists[0]["playlist_id"]
                print(f"\n🎬 Testing videos for specific playlist ({playlists[0]['title']})...")
                playlist_videos_resp = test_api("GET", "/api/videos", {
                    "channel_id": channel_id,
                    "playlist_id": playlist_id
                })
                if playlist_videos_resp:
                    videos = playlist_videos_resp.get("videos", [])
                    print(f"   Found {len(videos)} videos in playlist")
                    if videos:
                        print(f"   First video: {videos[0].get('title', 'N/A')}")

print("\n" + "="*70)
print("✅ Test complete!")


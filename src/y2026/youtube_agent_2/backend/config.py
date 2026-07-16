from pathlib import Path

DEMO_CHANNELS = []

DB_PATH = Path(__file__).parent / "youtubeldb.sqlite3"

GOOGLE_OAUTH_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN = "https://oauth2.googleapis.com/token"
YOUTUBE_SUBSCRIPTIONS_API = "https://www.googleapis.com/youtube/v3/subscriptions"

TRIM_VIDEO_DESC = True
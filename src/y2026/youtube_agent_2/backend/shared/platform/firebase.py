"""Idempotent Firebase initialization for independently composed services."""

import json

import firebase_admin
from firebase_admin import credentials, firestore

from . import settings


def ensure_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()
    options = {"projectId": settings.FIREBASE_PROJECT_ID}
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        service_account = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
        return firebase_admin.initialize_app(
            credentials.Certificate(service_account), options
        )
    return firebase_admin.initialize_app(options=options)


def firestore_client():
    ensure_firebase_app()
    return firestore.client()

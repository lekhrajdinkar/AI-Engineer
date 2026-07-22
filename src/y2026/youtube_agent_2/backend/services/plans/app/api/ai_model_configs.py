"""CRUD and provider readiness checks for hosted AI model configurations."""

from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
import requests

from src.y2026.youtube_agent_2.backend.services.plans.app import config
from src.y2026.youtube_agent_2.backend.services.plans.app.models import (
    AiModelConfigCreate,
    AiModelConfigRecord,
    AiModelConfigUpdate,
)
from src.y2026.youtube_agent_2.backend.services.plans.app.repositories import store


router = APIRouter(prefix="/api/ai-model-configs", tags=["ai-model-configs"])


class AiModelConfigListResponse(BaseModel):
    items: list[AiModelConfigRecord]


class AiModelConfigDeleteResponse(BaseModel):
    message: str
    config_id: str
    soft_deleted: bool


class AiModelConfigTestResponse(BaseModel):
    success: bool
    message: str
    config: AiModelConfigRecord


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _provider_api_key(provider: str) -> str:
    return {
        "groq": config.GROQ_API_KEY,
        "google": config.GOOGLE_API_KEY,
        "openai": config.OPENAI_API_KEY,
    }.get(provider, "")


def _with_credential_status(record: AiModelConfigRecord) -> AiModelConfigRecord:
    record.credential_status = (
        "configured" if _provider_api_key(record.provider) else "missing"
    )
    return record


def _load(config_id: str) -> AiModelConfigRecord:
    row = store.load_ai_model_config(config_id)
    if not row:
        raise HTTPException(status_code=404, detail="AI model configuration not found")
    return _with_credential_status(AiModelConfigRecord.model_validate(row))


def _save(record: AiModelConfigRecord) -> AiModelConfigRecord:
    record = _with_credential_status(record)
    store.save_ai_model_config(record.model_dump())
    return record


def _clear_other_defaults(config_id: str) -> None:
    now = _utcnow()
    for row in store.list_ai_model_configs():
        record = AiModelConfigRecord.model_validate(row)
        if record.id != config_id and record.is_default:
            record.is_default = False
            record.updated_at = now
            _save(record)


def _choose_replacement_default(excluded_id: str | None = None) -> None:
    candidates = [
        _with_credential_status(AiModelConfigRecord.model_validate(row))
        for row in store.list_ai_model_configs()
        if row.get("id") != excluded_id and row.get("enabled")
    ]
    if not candidates or any(record.is_default for record in candidates):
        return
    candidates.sort(
        key=lambda record: (
            record.test_status != "passed",
            record.credential_status != "configured",
            record.created_at,
        )
    )
    replacement = candidates[0]
    replacement.is_default = True
    replacement.updated_at = _utcnow()
    _save(replacement)


def _validate_fallback(record: AiModelConfigRecord) -> None:
    fallback_id = record.fallback_model_config_id
    if not fallback_id:
        return
    seen = {record.id}
    while fallback_id:
        if fallback_id in seen:
            raise HTTPException(
                status_code=422,
                detail="Fallback model configurations must not form a cycle",
            )
        seen.add(fallback_id)
        fallback_row = store.load_ai_model_config(fallback_id)
        if not fallback_row:
            raise HTTPException(
                status_code=422,
                detail=f"Fallback model configuration '{fallback_id}' was not found",
            )
        fallback = AiModelConfigRecord.model_validate(fallback_row)
        if not fallback.enabled:
            raise HTTPException(
                status_code=422,
                detail="Fallback model configuration must be enabled",
            )
        fallback_id = fallback.fallback_model_config_id


def _probe_provider(record: AiModelConfigRecord, api_key: str) -> tuple[bool, str]:
    model_path = quote(record.model.removeprefix("models/"), safe="")
    if record.provider == "google":
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_path}"
        headers = {}
        params = {"key": api_key}
    elif record.provider == "openai":
        url = f"https://api.openai.com/v1/models/{model_path}"
        headers = {"Authorization": f"Bearer {api_key}"}
        params = None
    else:
        url = f"https://api.groq.com/openai/v1/models/{model_path}"
        headers = {"Authorization": f"Bearer {api_key}"}
        params = None
    try:
        response = requests.get(
            url,
            headers=headers,
            params=params,
            timeout=config.AI_MODEL_TEST_TIMEOUT_SECS,
        )
    except requests.RequestException:
        return False, f"Could not reach the {record.provider} model API"
    if response.ok:
        return True, f"{record.provider} model is reachable"
    if response.status_code in {401, 403}:
        return False, f"{record.provider} rejected the configured credential"
    if response.status_code == 404:
        return False, f"Model '{record.model}' was not found at {record.provider}"
    return False, f"{record.provider} returned HTTP {response.status_code}"


@router.get("", response_model=AiModelConfigListResponse)
def list_ai_model_configs(enabled: bool | None = Query(default=None)):
    records = [
        _with_credential_status(AiModelConfigRecord.model_validate(row))
        for row in store.list_ai_model_configs()
    ]
    if enabled is True:
        records = [
            record
            for record in records
            if record.enabled
            and record.test_status == "passed"
            and record.credential_status == "configured"
        ]
    elif enabled is False:
        records = [record for record in records if not record.enabled]
    return AiModelConfigListResponse(items=records)


@router.post("", response_model=AiModelConfigRecord, status_code=status.HTTP_201_CREATED)
def create_ai_model_config(request: AiModelConfigCreate):
    now = _utcnow()
    record = AiModelConfigRecord(
        **request.model_dump(),
        credential_status=(
            "configured" if _provider_api_key(request.provider) else "missing"
        ),
        created_at=now,
        updated_at=now,
    )
    _validate_fallback(record)
    if record.is_default:
        _clear_other_defaults(record.id)
    return _save(record)


@router.patch("/{config_id}", response_model=AiModelConfigRecord)
def update_ai_model_config(config_id: str, request: AiModelConfigUpdate):
    current = _load(config_id)
    changes = request.model_dump(exclude_unset=True)
    provider_identity_changed = bool(
        {"provider", "model", "structured_output_mode"}.intersection(changes)
    )
    if changes.get("enabled") is False and current.is_default:
        changes.setdefault("is_default", False)
    data = current.model_dump()
    data.update(changes)
    if provider_identity_changed:
        data.update(
            test_status="untested",
            test_message=None,
            last_tested_at=None,
        )
    data["updated_at"] = _utcnow()
    try:
        updated = AiModelConfigRecord.model_validate(data)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    _validate_fallback(updated)
    if updated.is_default:
        _clear_other_defaults(updated.id)
    saved = _save(updated)
    if current.is_default and not saved.is_default:
        _choose_replacement_default(excluded_id=saved.id)
    return saved


@router.delete("/{config_id}", response_model=AiModelConfigDeleteResponse)
def delete_ai_model_config(config_id: str):
    current = _load(config_id)
    now = _utcnow()
    for row in store.list_ai_model_configs():
        dependent = AiModelConfigRecord.model_validate(row)
        if dependent.fallback_model_config_id == current.id:
            dependent.fallback_model_config_id = None
            dependent.updated_at = now
            _save(dependent)
    referenced = store.is_ai_model_config_referenced(current.id)
    if referenced:
        current.enabled = False
        current.is_default = False
        current.deleted_at = now
        current.updated_at = now
        _save(current)
    else:
        store.delete_ai_model_config(current.id)
    if current.is_default or not any(
        row.get("is_default") for row in store.list_ai_model_configs()
    ):
        _choose_replacement_default(excluded_id=current.id)
    return AiModelConfigDeleteResponse(
        message=(
            "AI model configuration archived because request history references it"
            if referenced
            else "AI model configuration deleted"
        ),
        config_id=current.id,
        soft_deleted=referenced,
    )


@router.post("/{config_id}/test", response_model=AiModelConfigTestResponse)
def test_ai_model_config(config_id: str):
    record = _load(config_id)
    api_key = _provider_api_key(record.provider)
    if not api_key:
        success = False
        message = f"Server credential for {record.provider} is missing"
    else:
        success, message = _probe_provider(record, api_key)
    record.credential_status = "configured" if api_key else "missing"
    record.test_status = "passed" if success else "failed"
    record.test_message = message
    record.last_tested_at = _utcnow()
    record.updated_at = record.last_tested_at
    saved = _save(record)
    return AiModelConfigTestResponse(
        success=success,
        message=message,
        config=saved,
    )

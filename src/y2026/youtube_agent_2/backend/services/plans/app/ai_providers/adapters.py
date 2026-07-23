"""Built-in and configurable hosted-LLM provider adapters."""

from __future__ import annotations

import os
from typing import Any, Callable, Mapping
from urllib.parse import quote

import requests

from src.y2026.youtube_agent_2.backend.services.plans.app import config

from .base import ProviderAdapter, ProviderTestResult


def _request_error(provider_name: str) -> ProviderTestResult:
    return ProviderTestResult(False, f"Could not reach the {provider_name} model API")


def _status_error(provider_name: str, model: str, status_code: int) -> ProviderTestResult:
    if status_code in {401, 403}:
        return ProviderTestResult(False, f"{provider_name} rejected the configured credential")
    if status_code == 404:
        return ProviderTestResult(False, f"Model '{model}' was not found at {provider_name}")
    return ProviderTestResult(False, f"{provider_name} returned HTTP {status_code}")


def _match_listed_model(response, provider_name: str, model: str) -> ProviderTestResult:
    try:
        models = response.json().get("data", [])
    except (AttributeError, ValueError):
        return ProviderTestResult(False, f"{provider_name} model API returned an invalid response")
    matching_model = next(
        (candidate for candidate in models if candidate.get("id") == model),
        None,
    )
    if matching_model is None:
        return ProviderTestResult(False, f"Model '{model}' was not found at {provider_name}")
    if matching_model.get("active") is False:
        return ProviderTestResult(False, f"Model '{model}' is not active at {provider_name}")
    return ProviderTestResult(True, f"{provider_name} model is reachable")


class GroqProvider(ProviderAdapter):
    id = "groq"
    display_name = "Groq"
    adapter_type = "groq"
    credential_env = "GROQ_API_KEY"
    strict_json_schema = True

    def api_key(self) -> str:
        return config.GROQ_API_KEY

    def test_model(self, model: str) -> ProviderTestResult:
        try:
            response = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {self.api_key()}"},
                timeout=config.AI_MODEL_TEST_TIMEOUT_SECS,
            )
        except requests.RequestException:
            return _request_error(self.id)
        if response.ok:
            return _match_listed_model(response, self.id, model)
        return _status_error(self.id, model, response.status_code)

    def create_chat_model(self, snapshot: Mapping[str, Any]):
        from langchain_groq import ChatGroq

        return ChatGroq(
            api_key=self.require_api_key(),
            model=snapshot["model"],
            temperature=snapshot.get("temperature", 0),
            timeout=config.AI_LLM_TIMEOUT_SECS,
            max_retries=config.AI_LLM_MAX_RETRIES,
        )


class GoogleProvider(ProviderAdapter):
    id = "google"
    display_name = "Google"
    adapter_type = "google"
    credential_env = "GOOGLE_API_KEY"
    strict_json_schema = False

    def api_key(self) -> str:
        return config.GOOGLE_API_KEY

    def test_model(self, model: str) -> ProviderTestResult:
        model_path = quote(model.removeprefix("models/"), safe="")
        try:
            response = requests.get(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_path}",
                params={"key": self.api_key()},
                timeout=config.AI_MODEL_TEST_TIMEOUT_SECS,
            )
        except requests.RequestException:
            return _request_error(self.id)
        if response.ok:
            return ProviderTestResult(True, f"{self.id} model is reachable")
        return _status_error(self.id, model, response.status_code)

    def create_chat_model(self, snapshot: Mapping[str, Any]):
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            google_api_key=self.require_api_key(),
            model=snapshot["model"],
            temperature=snapshot.get("temperature", 0),
            max_retries=config.AI_LLM_MAX_RETRIES,
        )


class OpenAIProvider(ProviderAdapter):
    id = "openai"
    display_name = "OpenAI"
    adapter_type = "openai"
    credential_env = "OPENAI_API_KEY"
    strict_json_schema = True

    def api_key(self) -> str:
        return config.OPENAI_API_KEY

    def test_model(self, model: str) -> ProviderTestResult:
        model_path = quote(model, safe="")
        try:
            response = requests.get(
                f"https://api.openai.com/v1/models/{model_path}",
                headers={"Authorization": f"Bearer {self.api_key()}"},
                timeout=config.AI_MODEL_TEST_TIMEOUT_SECS,
            )
        except requests.RequestException:
            return _request_error(self.id)
        if response.ok:
            return ProviderTestResult(True, f"{self.id} model is reachable")
        return _status_error(self.id, model, response.status_code)

    def create_chat_model(self, snapshot: Mapping[str, Any]):
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            api_key=self.require_api_key(),
            model=snapshot["model"],
            temperature=snapshot.get("temperature", 0),
            timeout=config.AI_LLM_TIMEOUT_SECS,
            max_retries=config.AI_LLM_MAX_RETRIES,
        )


class OpenAICompatibleProvider(ProviderAdapter):
    adapter_type = "openai_compatible"

    def __init__(
        self,
        *,
        provider_id: str,
        display_name: str,
        base_url: str,
        credential_env: str,
        structured_output_modes: tuple[str, ...],
        strict_json_schema: bool,
    ):
        self.id = provider_id
        self.display_name = display_name
        self.base_url = base_url.rstrip("/")
        self.credential_env = credential_env
        self.structured_output_modes = structured_output_modes
        self.strict_json_schema = strict_json_schema

    def api_key(self) -> str:
        return os.getenv(self.credential_env, "")

    def test_model(self, model: str) -> ProviderTestResult:
        try:
            response = requests.get(
                f"{self.base_url}/models",
                headers={"Authorization": f"Bearer {self.api_key()}"},
                timeout=config.AI_MODEL_TEST_TIMEOUT_SECS,
            )
        except requests.RequestException:
            return _request_error(self.id)
        if response.ok:
            return _match_listed_model(response, self.id, model)
        return _status_error(self.id, model, response.status_code)

    def create_chat_model(self, snapshot: Mapping[str, Any]):
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            api_key=self.require_api_key(),
            base_url=self.base_url,
            model=snapshot["model"],
            temperature=snapshot.get("temperature", 0),
            timeout=config.AI_LLM_TIMEOUT_SECS,
            max_retries=config.AI_LLM_MAX_RETRIES,
        )


BUILTIN_PROVIDER_FACTORIES: tuple[Callable[[], ProviderAdapter], ...] = (
    GroqProvider,
    GoogleProvider,
    OpenAIProvider,
)

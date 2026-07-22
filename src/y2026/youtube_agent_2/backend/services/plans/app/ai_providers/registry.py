"""Provider registry with a server-owned OpenAI-compatible provider catalog."""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse

from src.y2026.youtube_agent_2.backend.services.plans.app import config

from .adapters import BUILTIN_PROVIDER_FACTORIES, OpenAICompatibleProvider
from .base import ProviderAdapter


_PROVIDER_ID = re.compile(r"^[a-z][a-z0-9_-]{1,63}$")
_STRUCTURED_OUTPUT_MODES = {
    "auto",
    "json_schema",
    "json_mode",
    "function_calling",
}


class ProviderRegistry:
    def __init__(self, catalog_path: Path):
        self.catalog_path = Path(catalog_path)
        self._providers: dict[str, ProviderAdapter] = {}
        self.reload()

    def reload(self, catalog_path: Path | None = None) -> None:
        if catalog_path is not None:
            self.catalog_path = Path(catalog_path)

        builtins = [factory() for factory in BUILTIN_PROVIDER_FACTORIES]
        providers = {provider.id: provider for provider in builtins}

        for entry in self._catalog_entries():
            if not isinstance(entry, dict):
                raise ValueError("Each AI provider catalog entry must be an object")
            if entry.get("enabled", True) is False:
                continue
            adapter = self._openai_compatible_adapter(entry)
            if adapter.id in providers:
                raise ValueError(f"AI provider '{adapter.id}' is configured more than once")
            providers[adapter.id] = adapter
        self._providers = providers

    def _catalog_entries(self) -> list[dict]:
        if not self.catalog_path.exists():
            return []
        try:
            document = json.loads(self.catalog_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise ValueError(
                f"Unable to load AI provider catalog '{self.catalog_path}'"
            ) from error
        entries = document.get("providers", [])
        if not isinstance(entries, list):
            raise ValueError("AI provider catalog 'providers' must be a list")
        return entries

    def _openai_compatible_adapter(self, entry: dict) -> ProviderAdapter:
        if entry.get("adapter") != "openai_compatible":
            raise ValueError(
                f"Unsupported configured AI provider adapter '{entry.get('adapter')}'"
            )
        provider_id = str(entry.get("id", "")).strip()
        if not _PROVIDER_ID.fullmatch(provider_id):
            raise ValueError(f"Invalid AI provider id '{provider_id}'")
        display_name = str(entry.get("name", "")).strip()
        credential_env = str(entry.get("api_key_env", "")).strip()
        base_url = str(entry.get("base_url", "")).strip().rstrip("/")
        parsed_url = urlparse(base_url)
        if not display_name or not credential_env:
            raise ValueError(
                f"AI provider '{provider_id}' requires name and api_key_env"
            )
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
            raise ValueError(f"AI provider '{provider_id}' has an invalid base_url")
        configured_modes = entry.get(
            "structured_output_modes",
            ["auto", "json_schema", "json_mode", "function_calling"],
        )
        if not isinstance(configured_modes, list) or not configured_modes:
            raise ValueError(
                f"AI provider '{provider_id}' structured_output_modes must be a list"
            )
        modes = tuple(dict.fromkeys(str(mode) for mode in configured_modes))
        if not set(modes).issubset(_STRUCTURED_OUTPUT_MODES):
            raise ValueError(
                f"AI provider '{provider_id}' has unsupported structured output modes"
            )
        return OpenAICompatibleProvider(
            provider_id=provider_id,
            display_name=display_name,
            base_url=base_url,
            credential_env=credential_env,
            structured_output_modes=modes,
            strict_json_schema=bool(entry.get("strict_json_schema", False)),
        )

    def get(self, provider_id: str) -> ProviderAdapter | None:
        return self._providers.get(provider_id)

    def require(self, provider_id: str) -> ProviderAdapter:
        provider = self.get(provider_id)
        if provider is None:
            raise KeyError(provider_id)
        return provider

    def metadata(self) -> list[dict]:
        return [
            provider.metadata()
            for provider in sorted(
                self._providers.values(),
                key=lambda item: (item.display_name.lower(), item.id),
            )
        ]


provider_registry = ProviderRegistry(config.AI_PROVIDER_CATALOG_PATH)

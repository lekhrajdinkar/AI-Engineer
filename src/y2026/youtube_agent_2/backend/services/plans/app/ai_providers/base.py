"""Shared provider contracts without LangChain or persistence dependencies."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class ProviderTestResult:
    success: bool
    message: str


class ProviderConfigurationError(RuntimeError):
    """Raised when a registered provider cannot construct its chat model."""


class ProviderAdapter(ABC):
    id: str
    display_name: str
    adapter_type: str
    credential_env: str
    structured_output_modes: tuple[str, ...] = (
        "auto",
        "json_schema",
        "json_mode",
        "function_calling",
    )
    strict_json_schema: bool = False

    @abstractmethod
    def api_key(self) -> str:
        """Return the provider credential from server-owned configuration."""

    @abstractmethod
    def test_model(self, model: str) -> ProviderTestResult:
        """Verify the credential and model without exposing the credential."""

    @abstractmethod
    def create_chat_model(self, snapshot: Mapping[str, Any]):
        """Create the LangChain BaseChatModel used by the graph."""

    def credential_status(self) -> str:
        return "configured" if self.api_key() else "missing"

    def require_api_key(self) -> str:
        api_key = self.api_key()
        if not api_key:
            raise ProviderConfigurationError(
                f"{self.credential_env} is required for {self.display_name} course generation"
            )
        return api_key

    def supports_structured_output(self, mode: str) -> bool:
        return mode in self.structured_output_modes

    def structured_output_options(self, mode: str) -> dict[str, Any]:
        options: dict[str, Any] = {"method": mode}
        if mode == "json_schema" and self.strict_json_schema:
            options["strict"] = True
        return options

    def metadata(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.display_name,
            "adapter": self.adapter_type,
            "credential_status": self.credential_status(),
            "structured_output_modes": list(self.structured_output_modes),
        }

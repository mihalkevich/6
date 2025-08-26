from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Literal

import yaml


@dataclass
class SuccessIndicator:
    type: Literal["css", "text"]
    value: str


@dataclass
class RegistrationSelectors:
    email: str
    password: str
    submit: str
    username: Optional[str] = None
    confirm_password: Optional[str] = None


@dataclass
class RegistrationConfig:
    url: str
    headless: bool
    default_password: str
    delay_seconds_between_accounts: float
    success_indicator: SuccessIndicator
    selectors: RegistrationSelectors

    @staticmethod
    def load_from_file(config_path: Path | str) -> "RegistrationConfig":
        path = Path(config_path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {path}")
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        try:
            success = SuccessIndicator(
                type=data["success_indicator"]["type"],
                value=data["success_indicator"]["value"],
            )
            selectors = RegistrationSelectors(
                email=data["selectors"]["email"],
                password=data["selectors"]["password"],
                submit=data["selectors"]["submit"],
                username=data["selectors"].get("username"),
                confirm_password=data["selectors"].get("confirm_password"),
            )
            return RegistrationConfig(
                url=data["url"],
                headless=bool(data.get("headless", True)),
                default_password=data.get("default_password", "ChangeMe!234"),
                delay_seconds_between_accounts=float(data.get("delay_seconds_between_accounts", 1)),
                success_indicator=success,
                selectors=selectors,
            )
        except KeyError as exc:
            missing_key = str(exc)
            raise ValueError(f"Missing required configuration key: {missing_key}") from exc
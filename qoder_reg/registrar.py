from __future__ import annotations

import csv
import time
from dataclasses import asdict
from pathlib import Path
from typing import Callable, Iterable, Optional, Sequence, Tuple

from playwright.sync_api import Playwright, sync_playwright, TimeoutError as PlaywrightTimeoutError

from .config import RegistrationConfig


LogFn = Callable[[str], None]


def ensure_output_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def parse_email_line(line: str) -> Tuple[str, Optional[str]]:
    raw = line.strip()
    if not raw:
        return ("", None)
    # Try common separators
    for sep in (":", ";", ",", " "):
        if sep in raw:
            email, password = raw.split(sep, 1)
            return email.strip(), password.strip() or None
    return raw, None


class QoderRegistrar:
    def __init__(self, config: RegistrationConfig, output_csv: Path) -> None:
        self.config = config
        self.output_csv = output_csv
        ensure_output_dir(self.output_csv)

    def _write_csv_header_if_needed(self) -> None:
        if not self.output_csv.exists():
            with self.output_csv.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=[
                        "email",
                        "status",
                        "message",
                        "used_password",
                    ],
                )
                writer.writeheader()

    def _append_csv_row(self, row: dict) -> None:
        with self.output_csv.open("a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "email",
                    "status",
                    "message",
                    "used_password",
                ],
            )
            writer.writerow(row)

    def _wait_for_success(self, page) -> bool:
        indicator = self.config.success_indicator
        try:
            if indicator.type == "css":
                page.wait_for_selector(indicator.value, timeout=15_000, state="visible")
                return True
            if indicator.type == "text":
                page.wait_for_timeout(500)  # small pause to let text render
                content = page.content()
                return indicator.value in content
        except PlaywrightTimeoutError:
            return False
        return False

    def _register_one(self, playwright: Playwright, email: str, password: str) -> Tuple[bool, str]:
        browser = playwright.chromium.launch(headless=self.config.headless)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto(self.config.url, wait_until="domcontentloaded")

            sel = self.config.selectors

            if sel.username:
                username_value = email.split("@", 1)[0]
                page.fill(sel.username, username_value)
            page.fill(sel.email, email)

            page.fill(sel.password, password)
            if sel.confirm_password:
                page.fill(sel.confirm_password, password)

            page.click(sel.submit)

            success = self._wait_for_success(page)
            if success:
                return True, "ok"
            return False, "success indicator not found"
        except Exception as exc:  # noqa: BLE001
            return False, f"exception: {exc.__class__.__name__}: {exc}"
        finally:
            context.close()
            browser.close()

    def run_sequential(
        self,
        email_lines: Iterable[str],
        logger: Optional[LogFn] = None,
        stop_flag: Optional["threading.Event"] = None,
    ) -> None:
        self._write_csv_header_if_needed()

        def log(msg: str) -> None:
            if logger:
                logger(msg)

        creds: Sequence[Tuple[str, Optional[str]]] = [parse_email_line(line) for line in email_lines]
        with sync_playwright() as p:
            for idx, (email, maybe_password) in enumerate(creds, start=1):
                if stop_flag is not None and stop_flag.is_set():
                    log("Stopped by user.")
                    break
                if not email:
                    continue
                password_to_use = maybe_password or self.config.default_password
                log(f"[{idx}/{len(creds)}] Registering: {email}")
                ok, message = self._register_one(p, email=email, password=password_to_use)
                row = {
                    "email": email,
                    "status": "success" if ok else "failure",
                    "message": message,
                    "used_password": password_to_use,
                }
                self._append_csv_row(row)
                if ok:
                    log(f"  -> success")
                else:
                    log(f"  -> failure: {message}")
                time.sleep(max(0.0, float(self.config.delay_seconds_between_accounts)))
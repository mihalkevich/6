import csv
import datetime
import os
from dataclasses import dataclass
from typing import List, Optional

import requests
from flask import Flask, redirect, render_template, request, send_file, url_for, flash


@dataclass
class EmailAccount:
    email: str
    password: str = ""
    status: str = "pending"  # pending, success, failed, skipped
    notes: str = ""
    attempt_count: int = 0
    updated_at: Optional[str] = None


class RegistrationManager:
    def __init__(self) -> None:
        self.accounts: List[EmailAccount] = []
        self.current_index: int = 0
        self.progress_changed: bool = False

    def has_accounts(self) -> bool:
        return len(self.accounts) > 0

    def current(self) -> Optional[EmailAccount]:
        if not self.accounts:
            return None
        if self.current_index < 0:
            self.current_index = 0
        if self.current_index >= len(self.accounts):
            self.current_index = len(self.accounts) - 1
        return self.accounts[self.current_index]

    def next(self) -> Optional[EmailAccount]:
        if not self.accounts:
            return None
        if self.current_index < len(self.accounts) - 1:
            self.current_index += 1
        return self.current()

    def prev(self) -> Optional[EmailAccount]:
        if not self.accounts:
            return None
        if self.current_index > 0:
            self.current_index -= 1
        return self.current()

    def set_status(self, status: str) -> None:
        account = self.current()
        if account is None:
            return
        account.status = status
        account.attempt_count += 1
        account.updated_at = datetime.datetime.utcnow().isoformat()
        self.progress_changed = True

    def load_from_file(self, file_path: str) -> None:
        accounts: List[EmailAccount] = []
        _, ext = os.path.splitext(file_path.lower())
        if ext == ".csv":
            with open(file_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                # expected headers: email,password,status,notes
                for row in reader:
                    email = (row.get("email") or "").strip()
                    if not email:
                        continue
                    accounts.append(
                        EmailAccount(
                            email=email,
                            password=(row.get("password") or "").strip(),
                            status=(row.get("status") or "pending").strip() or "pending",
                            notes=(row.get("notes") or "").strip(),
                            attempt_count=int((row.get("attempt_count") or 0) or 0),
                            updated_at=(row.get("updated_at") or None) or None,
                        )
                    )
        else:
            # txt, list: email or email:password
            with open(file_path, encoding="utf-8") as f:
                for line in f:
                    raw = line.strip()
                    if not raw or raw.startswith("#"):
                        continue
                    if ":" in raw:
                        email, password = raw.split(":", 1)
                        accounts.append(EmailAccount(email=email.strip(), password=password.strip()))
                    else:
                        accounts.append(EmailAccount(email=raw))

        self.accounts = accounts
        self.current_index = 0
        self.progress_changed = False

    def save_to_csv(self, file_path: str) -> None:
        fieldnames = [
            "email",
            "password",
            "status",
            "notes",
            "attempt_count",
            "updated_at",
        ]
        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for acc in self.accounts:
                writer.writerow(
                    {
                        "email": acc.email,
                        "password": acc.password,
                        "status": acc.status,
                        "notes": acc.notes,
                        "attempt_count": acc.attempt_count,
                        "updated_at": acc.updated_at or "",
                    }
                )
        self.progress_changed = False


app = Flask(__name__)
manager = RegistrationManager()


@app.get("/")
def index():
    return render_template(
        "index.html",
        accounts=manager.accounts,
        current_index=manager.current_index,
    )


@app.post("/upload")
def upload():
    file = request.files.get("file")
    if not file or file.filename == "":
        flash("Файл не выбран", "error")
        return redirect(url_for("index"))
    tmp_path = os.path.join("/tmp", f"emails_{datetime.datetime.utcnow().timestamp()}_{file.filename}")
    file.save(tmp_path)
    try:
        manager.load_from_file(tmp_path)
        flash(f"Загружено {len(manager.accounts)} аккаунтов", "success")
    except Exception as e:
        flash(str(e), "error")
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
    return redirect(url_for("index"))


@app.get("/export")
def export_csv():
    if not manager.accounts:
        flash("Нет данных для экспорта", "error")
        return redirect(url_for("index"))
    out_path = "/tmp/qoder_export.csv"
    manager.save_to_csv(out_path)
    return send_file(out_path, as_attachment=True, download_name="qoder_export.csv")


@app.post("/set_index")
def set_index():
    try:
        idx = int(request.form.get("index", "0"))
        if 0 <= idx < len(manager.accounts):
            manager.current_index = idx
    except Exception:
        pass
    return redirect(url_for("index"))


@app.post("/mark")
def mark():
    status = request.form.get("status", "pending")
    notes = request.form.get("notes", "")
    acc = manager.current()
    if acc is not None:
        acc.notes = notes
        manager.set_status(status)
        # advance to next pending
        next_index = manager.current_index
        for i in range(manager.current_index + 1, len(manager.accounts)):
            if manager.accounts[i].status == "pending":
                next_index = i
                break
        manager.current_index = next_index
    return redirect(url_for("index"))


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))
    app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret")
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()


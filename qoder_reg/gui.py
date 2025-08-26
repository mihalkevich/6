from __future__ import annotations

import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext

from .config import RegistrationConfig
from .registrar import QoderRegistrar


class RegistrarGUI:
    def __init__(self, root: tk.Tk, config_path: Path) -> None:
        self.root = root
        self.root.title("QODER Registrar")

        self.config_path = config_path
        self.config = RegistrationConfig.load_from_file(self.config_path)

        self.text = scrolledtext.ScrolledText(self.root, width=80, height=20)
        self.text.grid(row=0, column=0, columnspan=4, padx=8, pady=8, sticky="nsew")

        self.password_label = tk.Label(self.root, text="Override Password (optional):")
        self.password_label.grid(row=1, column=0, sticky="w", padx=8)
        self.password_entry = tk.Entry(self.root, width=30, show="*")
        self.password_entry.grid(row=1, column=1, sticky="w")

        self.headless_var = tk.BooleanVar(value=self.config.headless)
        self.headless_check = tk.Checkbutton(self.root, text="Headless", variable=self.headless_var)
        self.headless_check.grid(row=1, column=2, sticky="w")

        self.delay_label = tk.Label(self.root, text="Delay (s):")
        self.delay_label.grid(row=1, column=3, sticky="e")
        self.delay_entry = tk.Entry(self.root, width=6)
        self.delay_entry.insert(0, str(self.config.delay_seconds_between_accounts))
        self.delay_entry.grid(row=1, column=4, sticky="w")

        self.load_btn = tk.Button(self.root, text="Load TXT", command=self.load_txt)
        self.load_btn.grid(row=2, column=0, padx=8, pady=4, sticky="w")

        self.start_btn = tk.Button(self.root, text="Start", command=self.start)
        self.start_btn.grid(row=2, column=1, padx=8, pady=4)

        self.stop_btn = tk.Button(self.root, text="Stop", command=self.stop, state=tk.DISABLED)
        self.stop_btn.grid(row=2, column=2, padx=8, pady=4)

        self.log = scrolledtext.ScrolledText(self.root, width=80, height=10, state=tk.DISABLED)
        self.log.grid(row=3, column=0, columnspan=5, padx=8, pady=8, sticky="nsew")

        self.root.grid_columnconfigure(0, weight=1)
        self.root.grid_columnconfigure(1, weight=0)
        self.root.grid_columnconfigure(2, weight=0)
        self.root.grid_columnconfigure(3, weight=0)
        self.root.grid_columnconfigure(4, weight=0)
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_rowconfigure(3, weight=1)

        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    def load_txt(self) -> None:
        path = filedialog.askopenfilename(title="Select emails file", filetypes=[("Text", "*.txt"), ("All", "*.*")])
        if not path:
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            self.text.delete("1.0", tk.END)
            self.text.insert("1.0", content)
        except Exception as exc:  # noqa: BLE001
            messagebox.showerror("Error", f"Failed to load file: {exc}")

    def _log(self, msg: str) -> None:
        self.log.configure(state=tk.NORMAL)
        self.log.insert(tk.END, msg + "\n")
        self.log.configure(state=tk.DISABLED)
        self.log.see(tk.END)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        override_password = self.password_entry.get().strip()
        if override_password:
            self.config.default_password = override_password
        try:
            self.config.headless = bool(self.headless_var.get())
            self.config.delay_seconds_between_accounts = float(self.delay_entry.get())
        except ValueError:
            messagebox.showerror("Error", "Delay must be a number")
            return

        emails_blob = self.text.get("1.0", tk.END)
        lines = [line for line in emails_blob.splitlines() if line.strip()]
        if not lines:
            messagebox.showwarning("No Emails", "Please paste emails (one per line)")
            return

        output_csv = Path("output/results.csv")
        registrar = QoderRegistrar(config=self.config, output_csv=output_csv)

        self._stop_event.clear()
        self.start_btn.configure(state=tk.DISABLED)
        self.stop_btn.configure(state=tk.NORMAL)

        def runner():
            try:
                registrar.run_sequential(lines, logger=self._log, stop_flag=self._stop_event)
            finally:
                self.start_btn.configure(state=tk.NORMAL)
                self.stop_btn.configure(state=tk.DISABLED)

        self._thread = threading.Thread(target=runner, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        if self._thread and self._thread.is_alive():
            self._stop_event.set()


def run_gui(config_path: Path) -> None:
    root = tk.Tk()
    app = RegistrarGUI(root, config_path=config_path)
    root.mainloop()
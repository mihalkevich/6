from __future__ import annotations

from pathlib import Path

from qoder_reg.gui import run_gui


if __name__ == "__main__":
    config_path = Path("config.yaml")
    run_gui(config_path=config_path)
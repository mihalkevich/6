# QODER Registrar (Sequential Email Registration)

This app provides a simple GUI to paste a list of emails and run sequential registrations using Playwright.

## Prerequisites
- Python 3.10+
- Linux/macOS/Windows

## Setup
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install --with-deps
```

## Configuration
Edit `config.yaml` with the target registration URL and CSS selectors.
```yaml
url: "https://example.com/register"
headless: true
default_password: "ChangeMe!234"
delay_seconds_between_accounts: 2
success_indicator:
  # type can be: css|text
  type: "css"
  value: "div.registration-success"
selectors:
  email: "input[name='email']"
  username: "input[name='username']"  # optional; omit or leave empty if not required
  password: "input[name='password']"
  confirm_password: "input[name='passwordConfirm']"
  submit: "button[type='submit']"
```

- `success_indicator`: How to detect success. If `type: text`, the `value` is a substring to wait for on the page.
- `selectors`: Provide CSS selectors for the fields and submit control.

## Run
```bash
python main.py
```

Paste your emails into the text box (one per line). Supported formats per line:
- `email@example.com`
- `email@example.com:password`
- `email@example.com;password`
- `email@example.com,password`

Set optional overrides (password, headless, delay) in the GUI. Click Start.

Results will be saved to `output/results.csv`.

## Notes
- This is a template. You must fill `config.yaml` with the real QODER registration page and selectors.
- The app processes accounts sequentially.


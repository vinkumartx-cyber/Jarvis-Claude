from __future__ import annotations

from bot.config import load_config
from bot.live.runner import run_forever
from bot.logging_setup import configure_logging


def main() -> None:
    app_cfg, secrets = load_config()
    configure_logging(secrets.log_level)
    run_forever(app_cfg, secrets)


if __name__ == "__main__":
    main()

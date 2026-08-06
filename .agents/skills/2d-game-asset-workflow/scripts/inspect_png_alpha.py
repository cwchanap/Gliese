#!/usr/bin/env python3
"""
Inspect PNG alpha usage for generated game assets.

Prints JSON with alpha summary so transparent-background requests can be
validated before assets are wired into Phaser.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover - environment issue
    print(f"Pillow is required: {exc}", file=sys.stderr)
    sys.exit(2)


def inspect_png(path: Path) -> dict[str, object]:
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        alpha_min, alpha_max = alpha.getextrema()
        histogram = alpha.histogram()  # 256 entries; index = alpha value, value = pixel count

        return {
            "path": str(path),
            "mode": image.mode,
            "size": list(image.size),
            "has_alpha": "A" in image.getbands(),
            "alpha_min": alpha_min,
            "alpha_max": alpha_max,
            "transparent_pixels": histogram[0],
            "translucent_pixels": sum(histogram[1:255]),
            "opaque_pixels": histogram[255],
        }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: inspect_png_alpha.py <png-path>", file=sys.stderr)
        return 1

    path = Path(sys.argv[1]).expanduser()
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        return 1

    print(json.dumps(inspect_png(path), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

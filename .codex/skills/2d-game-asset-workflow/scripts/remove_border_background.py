#!/usr/bin/env python3
"""
Remove a flat border-connected background from a PNG by converting matched pixels
to alpha 0.

This is intended for generated game assets that were requested with transparency
but arrived as fully opaque images with a uniform matte background.
"""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove border-connected flat backgrounds from PNG files."
    )
    parser.add_argument("input", type=Path, help="Input PNG path")
    parser.add_argument("output", type=Path, help="Output PNG path")
    parser.add_argument(
        "--tolerance",
        type=int,
        default=18,
        help="Maximum per-channel RGB distance from sampled border colors (default: 18)",
    )
    return parser.parse_args()


def color_matches(pixel: tuple[int, int, int, int], reference: tuple[int, int, int, int], tolerance: int) -> bool:
    return all(abs(pixel[index] - reference[index]) <= tolerance for index in range(3))


def border_points(width: int, height: int) -> list[tuple[int, int]]:
    points: list[tuple[int, int]] = []
    for x in range(width):
        points.append((x, 0))
        points.append((x, height - 1))
    for y in range(1, height - 1):
        points.append((0, y))
        points.append((width - 1, y))
    return points


def main() -> int:
    args = parse_args()
    with Image.open(args.input) as image:
        rgba = image.convert("RGBA")
        pixels = rgba.load()
        width, height = rgba.size

        queue: deque[tuple[int, int]] = deque()
        visited: set[tuple[int, int]] = set()
        sample_colors: dict[tuple[int, int], tuple[int, int, int, int]] = {}

        for point in border_points(width, height):
            queue.append(point)
            visited.add(point)
            sample_colors[point] = pixels[point]

        removed = 0

        while queue:
            x, y = queue.popleft()
            reference = sample_colors[(x, y)]
            pixel = pixels[x, y]

            if color_matches(pixel, reference, args.tolerance):
                if pixel[3] != 0:
                    pixels[x, y] = (pixel[0], pixel[1], pixel[2], 0)
                    removed += 1

                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
                        sample_colors[(nx, ny)] = reference

        args.output.parent.mkdir(parents=True, exist_ok=True)
        rgba.save(args.output)

    print(
        json.dumps(
            {
                "input": str(args.input),
                "output": str(args.output),
                "tolerance": args.tolerance,
                "removed_pixels": removed,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

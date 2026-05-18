from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


OUT = Path("public/game/assets/environment-dressing.png")
SHEET_SIZE = (384, 192)
CELL = 96
LOW = 48

TRANSPARENT = (0, 0, 0, 0)
OUTLINE = (24, 22, 22, 255)
SHADOW = (40, 42, 43, 255)
STONE_DARK = (70, 72, 68, 255)
STONE_MID = (116, 116, 104, 255)
STONE_LIGHT = (172, 169, 142, 255)
STONE_WARM = (137, 129, 106, 255)
MOSS_DARK = (45, 83, 44, 255)
MOSS = (73, 127, 54, 255)
MOSS_LIGHT = (128, 177, 72, 255)
LEAF_DARK = (42, 89, 42, 255)
LEAF = (74, 142, 57, 255)
LEAF_LIGHT = (142, 192, 81, 255)
PURPLE_DARK = (63, 45, 90, 255)
PURPLE = (111, 83, 155, 255)
PURPLE_LIGHT = (177, 150, 226, 255)


def low_frame() -> Image.Image:
    return Image.new("RGBA", (LOW, LOW), TRANSPARENT)


def paste_frame(sheet: Image.Image, frame: Image.Image, col: int, row: int) -> None:
    sheet.alpha_composite(frame.resize((CELL, CELL), Image.Resampling.NEAREST), (col * CELL, row * CELL))


def rect(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: tuple[int, int, int, int]) -> None:
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=fill)


def line(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], fill: tuple[int, int, int, int]) -> None:
    draw.line(points, fill=fill, width=1)


def town_wall_horizontal() -> Image.Image:
    image = low_frame()
    d = ImageDraw.Draw(image)
    rect(d, 0, 14, 48, 24, OUTLINE)
    rect(d, 0, 15, 48, 5, STONE_LIGHT)
    rect(d, 0, 20, 48, 15, STONE_MID)
    rect(d, 0, 35, 48, 3, SHADOW)
    rect(d, 0, 38, 48, 2, MOSS_DARK)

    for x in range(0, 48, 8):
        rect(d, x + 1, 16, 5, 2, STONE_LIGHT)
        rect(d, x + 1, 26, 6, 1, STONE_DARK)
        rect(d, x + 6, 20, 1, 15, OUTLINE)
        if x % 16 == 0:
            rect(d, x + 2, 30, 3, 2, STONE_WARM)

    for x, y in [(2, 38), (8, 36), (18, 37), (30, 38), (40, 36), (45, 37)]:
        rect(d, x, y, 2, 2, MOSS)
    for x in [12, 28, 43]:
        rect(d, x, 15, 2, 1, (206, 199, 156, 255))

    return image


def town_wall_vertical() -> Image.Image:
    image = low_frame()
    d = ImageDraw.Draw(image)
    rect(d, 14, 0, 24, 48, OUTLINE)
    rect(d, 15, 0, 5, 48, STONE_LIGHT)
    rect(d, 20, 0, 15, 48, STONE_MID)
    rect(d, 35, 0, 3, 48, SHADOW)
    rect(d, 38, 0, 2, 48, MOSS_DARK)

    for y in range(0, 48, 8):
        rect(d, 16, y + 1, 2, 5, STONE_LIGHT)
        rect(d, 26, y + 1, 1, 6, STONE_DARK)
        rect(d, 20, y + 6, 15, 1, OUTLINE)
        if y % 16 == 0:
            rect(d, 30, y + 2, 2, 3, STONE_WARM)

    for x, y in [(38, 2), (36, 9), (37, 18), (38, 29), (36, 39), (37, 44)]:
        rect(d, x, y, 2, 2, MOSS)
    for y in [12, 28, 43]:
        rect(d, 15, y, 1, 2, (206, 199, 156, 255))

    return image


def hedge_horizontal() -> Image.Image:
    image = low_frame()
    d = ImageDraw.Draw(image)
    rect(d, 0, 8, 48, 32, LEAF_DARK)
    rect(d, 0, 10, 48, 27, LEAF)
    for x in range(-2, 50, 4):
        rect(d, x, 8, 5, 5, MOSS)
        rect(d, x + 1, 15, 6, 6, LEAF_LIGHT if x % 8 == 2 else LEAF)
        rect(d, x + 2, 24, 6, 7, LEAF)
        rect(d, x, 32, 5, 6, MOSS_DARK)
    for x, y in [(4, 17), (12, 25), (21, 14), (30, 28), (39, 18), (45, 31)]:
        rect(d, x, y, 2, 2, LEAF_LIGHT)
    rect(d, 0, 39, 48, 2, MOSS_DARK)

    return image


def hedge_vertical() -> Image.Image:
    image = low_frame()
    d = ImageDraw.Draw(image)
    rect(d, 8, 0, 32, 48, LEAF_DARK)
    rect(d, 10, 0, 27, 48, LEAF)
    for y in range(-2, 50, 4):
        rect(d, 8, y, 5, 5, MOSS)
        rect(d, 15, y + 1, 6, 6, LEAF_LIGHT if y % 8 == 2 else LEAF)
        rect(d, 24, y + 2, 7, 6, LEAF)
        rect(d, 32, y, 6, 5, MOSS_DARK)
    for x, y in [(17, 4), (25, 12), (14, 21), (28, 30), (18, 39), (31, 45)]:
        rect(d, x, y, 2, 2, LEAF_LIGHT)
    rect(d, 39, 0, 2, 48, MOSS_DARK)

    return image


def ruin_wall() -> Image.Image:
    image = low_frame()
    d = ImageDraw.Draw(image)
    d.polygon(
        [(3, 18), (10, 16), (16, 19), (23, 15), (30, 18), (37, 16), (45, 20), (45, 35), (3, 35)],
        fill=OUTLINE,
    )
    d.polygon(
        [(5, 19), (10, 18), (16, 21), (23, 17), (30, 20), (37, 18), (43, 21), (43, 33), (5, 33)],
        fill=STONE_DARK,
    )

    stones = [
        (6, 20, 8, 5, STONE_MID),
        (16, 21, 7, 6, STONE_WARM),
        (25, 20, 8, 5, STONE_MID),
        (34, 21, 8, 5, STONE_WARM),
        (8, 27, 10, 5, STONE_WARM),
        (20, 28, 9, 4, STONE_MID),
        (31, 27, 10, 5, STONE_DARK),
    ]
    for x, y, w, h, color in stones:
        rect(d, x, y, w, h, color)
        rect(d, x, y, w, 1, STONE_LIGHT)

    line(d, [(17, 21), (19, 24), (18, 27)], OUTLINE)
    line(d, [(30, 21), (28, 24), (31, 28), (30, 32)], OUTLINE)
    rect(d, 8, 34, 5, 2, MOSS)
    rect(d, 35, 33, 4, 2, MOSS)
    rect(d, 21, 18, 2, 2, MOSS_LIGHT)

    return image


def future_gate() -> Image.Image:
    image = low_frame()
    d = ImageDraw.Draw(image)
    rect(d, 5, 18, 38, 22, OUTLINE)
    rect(d, 7, 19, 34, 4, STONE_LIGHT)
    rect(d, 7, 23, 34, 14, STONE_MID)
    rect(d, 7, 37, 34, 2, SHADOW)
    rect(d, 11, 24, 26, 11, PURPLE_DARK)
    d.polygon([(24, 21), (36, 29), (24, 37), (12, 29)], fill=PURPLE)
    line(d, [(24, 23), (24, 35)], PURPLE_LIGHT)
    line(d, [(15, 29), (33, 29)], PURPLE_LIGHT)
    rect(d, 13, 20, 4, 3, STONE_WARM)
    rect(d, 31, 20, 4, 3, STONE_WARM)
    rect(d, 11, 36, 5, 2, MOSS_DARK)
    rect(d, 31, 36, 6, 2, MOSS_DARK)

    return image


def stone_stair() -> Image.Image:
    image = low_frame()
    d = ImageDraw.Draw(image)
    widths = [28, 34, 40, 44, 36]
    y = 16
    for index, width in enumerate(widths):
        x = (48 - width) // 2
        rect(d, x - 1, y - 1, width + 2, 5, OUTLINE)
        rect(d, x, y, width, 2, STONE_LIGHT)
        rect(d, x, y + 2, width, 2, STONE_MID)
        rect(d, x, y + 4, width, 1, SHADOW)
        if index % 2 == 0:
            rect(d, x + 5, y + 1, 4, 1, (207, 201, 170, 255))
        y += 5
    rect(d, 13, 41, 7, 2, MOSS)
    rect(d, 29, 41, 8, 2, MOSS_DARK)

    return image


def main() -> None:
    sheet = Image.new("RGBA", SHEET_SIZE, TRANSPARENT)
    frames = [
        (town_wall_horizontal(), 0, 0),
        (town_wall_vertical(), 1, 0),
        (hedge_horizontal(), 2, 0),
        (hedge_vertical(), 3, 0),
        (ruin_wall(), 0, 1),
        (future_gate(), 1, 1),
        (stone_stair(), 2, 1),
    ]

    for frame, col, row in frames:
        paste_frame(sheet, frame, col, row)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT)


if __name__ == "__main__":
    main()

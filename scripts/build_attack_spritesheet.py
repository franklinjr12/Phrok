"""Normalize a hand-authored attack animation sheet into a game-ready spritesheet.

The source art (``assets/sprites/animations/*_<cols>x<rows>.png``) is drawn at a far
larger scale than the in-game sprites and its frames are not laid out on an exact
pixel grid, so slicing it with a naive ``frameWidth`` produces bleed between frames
and a character several times too big.

This script instead:

1. Detects each frame by the transparent gutters between drawings.
2. Anchors every frame on the character's feet, so the body never jitters.
3. Scales the whole sheet so the character's height matches the base sprite
   (``assets/sprites/swordsman.png``), keeping the animation the same size as the
   idle sprite it replaces.
4. Repacks the frames into a uniform grid whose centre matches the base sprite's
   centre, so the game can swap textures without touching the sprite origin.

Usage:
    python scripts/build_attack_spritesheet.py
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ALPHA_THRESHOLD = 8
# Gutters narrower than this are treated as part of the same drawing (a sword tip
# separated from the body by a couple of empty columns is still one frame).
MIN_GUTTER = 8
# Extra transparent margin around the packed content, in output pixels.
PADDING = 1


@dataclass(frozen=True)
class SourceFrame:
    left: int
    right: int
    top: int
    bottom: int
    feet_x: float

    @property
    def feet_y(self) -> int:
        return self.bottom

    @property
    def width(self) -> int:
        return self.right - self.left + 1

    @property
    def height(self) -> int:
        return self.bottom - self.top + 1


def content_runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Return inclusive column ranges that hold content, merging narrow gutters."""
    occupied = mask.any(axis=0)
    runs: list[tuple[int, int]] = []
    start: int | None = None

    for index, filled in enumerate(occupied):
        if filled and start is None:
            start = index
        elif not filled and start is not None:
            runs.append((start, index - 1))
            start = None

    if start is not None:
        runs.append((start, len(occupied) - 1))

    if not runs:
        raise ValueError("sheet row holds no content")

    merged = [runs[0]]
    for run in runs[1:]:
        if run[0] - merged[-1][1] <= MIN_GUTTER:
            merged[-1] = (merged[-1][0], run[1])
        else:
            merged.append(run)

    return merged


def read_frames(mask: np.ndarray, columns: int, rows: int) -> list[SourceFrame]:
    height = mask.shape[0]
    frames: list[SourceFrame] = []

    for row in range(rows):
        band_top = round(row * height / rows)
        band_bottom = round((row + 1) * height / rows)
        band = mask[band_top:band_bottom]
        runs = content_runs(band)

        if len(runs) != columns:
            raise ValueError(f"row {row} detected {len(runs)} frames, expected {columns}")

        for left, right in runs:
            cell = band[:, left:right + 1]
            filled_rows = np.where(cell.any(axis=1))[0]
            top, bottom = int(filled_rows.min()), int(filled_rows.max())
            # The legs are the lowest slice of the drawing; effect arcs sit higher up,
            # so this keeps the anchor on the body even when a frame has a big flourish.
            legs_top = max(top, bottom - int((bottom - top + 1) * 0.12))
            legs_columns = np.where(cell[legs_top:bottom + 1].any(axis=0))[0]
            frames.append(SourceFrame(
                left=left,
                right=right,
                top=band_top + top,
                bottom=band_top + bottom,
                feet_x=left + (int(legs_columns.min()) + int(legs_columns.max())) / 2,
            ))

    return frames


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").point(lambda pixel: 255 if pixel > ALPHA_THRESHOLD else 0).getbbox()

    if bbox is None:
        raise ValueError("image is blank")

    return bbox


def build(source: Path, base: Path, output: Path, columns: int, rows: int) -> None:
    sheet = Image.open(source).convert("RGBA")
    mask = np.array(sheet.getchannel("A")) > ALPHA_THRESHOLD
    frames = read_frames(mask, columns, rows)

    base_image = Image.open(base).convert("RGBA")
    base_left, base_top, base_right, base_bottom = alpha_bbox(base_image)
    base_character_height = base_bottom - base_top
    # Distance from the base sprite's origin (its centre) down to the feet. Matching
    # this keeps the character planted on the same spot when the texture swaps.
    feet_below_centre = base_bottom - base_image.height / 2

    # The first frame is the neutral stance, so its height is the character's height.
    scale = base_character_height / frames[0].height

    left_reach = max((frame.feet_x - frame.left) for frame in frames) * scale
    right_reach = max((frame.right - frame.feet_x) for frame in frames) * scale
    up_reach = max((frame.feet_y - frame.top) for frame in frames) * scale

    half_width = math.ceil(max(left_reach, right_reach)) + PADDING
    half_height = math.ceil(max(up_reach - feet_below_centre, feet_below_centre)) + PADDING
    frame_width, frame_height = half_width * 2, half_height * 2
    feet_y = half_height + feet_below_centre

    canvas = Image.new("RGBA", (frame_width * columns, frame_height * rows), (0, 0, 0, 0))

    for index, frame in enumerate(frames):
        crop = sheet.crop((frame.left, frame.top, frame.right + 1, frame.bottom + 1))
        scaled = crop.resize(
            (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
            # Area averaging: the source is a smooth high-resolution drawing, not
            # block-scaled pixel art, so nearest-neighbour would drop the sword.
            Image.Resampling.BOX,
        )
        x = round(half_width - (frame.feet_x - frame.left) * scale)
        y = round(feet_y - (frame.feet_y - frame.top) * scale)
        canvas.alpha_composite(
            scaled,
            ((index % columns) * frame_width + x, (index // columns) * frame_height + y),
        )

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)

    print(f"wrote {output.relative_to(ROOT)}")
    print(f"  source frames : {columns}x{rows} ({len(frames)})")
    print(f"  scale         : {scale:.5f} (character {frames[0].height}px -> {base_character_height}px)")
    print(f"  frame size    : {frame_width}x{frame_height}")
    print(f"  feet anchor   : ({half_width}, {feet_y:g})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="assets/sprites/animations/swordsman_hitting_2x4.png")
    parser.add_argument("--base", default="assets/sprites/swordsman.png")
    parser.add_argument("--output", default="assets/sprites/animations/swordsman-attack.png")
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--rows", type=int, default=2)
    args = parser.parse_args()

    build(
        source=ROOT / args.source,
        base=ROOT / args.base,
        output=ROOT / args.output,
        columns=args.columns,
        rows=args.rows,
    )


if __name__ == "__main__":
    main()

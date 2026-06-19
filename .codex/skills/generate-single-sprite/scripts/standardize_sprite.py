from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image, ImageChops


TARGET_SIZES = {
    "base-tile": (32, 32),
    "small-character": (32, 48),
    "small-character-square": (32, 32),
    "medium-monster": (48, 48),
    "medium-monster-small": (32, 32),
    "large-monster": (64, 64),
    "mvp-boss": (96, 96),
    "item-icon": (32, 32),
    "item-icon-small": (24, 24),
    "skill-icon": (32, 32),
}


def parse_size(value: str) -> tuple[int, int]:
    match = re.fullmatch(r"(\d+)x(\d+)", value.lower())
    if not match:
        raise argparse.ArgumentTypeError("size must use WIDTHxHEIGHT, for example 32x48")
    width, height = int(match.group(1)), int(match.group(2))
    if width <= 0 or height <= 0:
        raise argparse.ArgumentTypeError("width and height must be positive")
    return width, height


def content_bbox(image: Image.Image, alpha_threshold: int) -> tuple[int, int, int, int] | None:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    mask = alpha.point(lambda pixel: 255 if pixel > alpha_threshold else 0)
    bbox = mask.getbbox()
    if bbox:
        return bbox

    # Fallback for non-transparent images: trim uniform outer background.
    background = Image.new(rgba.mode, rgba.size, rgba.getpixel((0, 0)))
    diff = ImageChops.difference(rgba, background)
    return diff.getbbox()


def expand_bbox(
    bbox: tuple[int, int, int, int],
    image_size: tuple[int, int],
    padding: int,
) -> tuple[int, int, int, int]:
    left, top, right, bottom = bbox
    width, height = image_size
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )


def resample_filter() -> Image.Resampling:
    return Image.Resampling.LANCZOS


def standardize_sprite(
    input_path: Path,
    output_path: Path,
    target_size: tuple[int, int],
    crop_padding: int,
    canvas_padding: int,
    alpha_threshold: int,
    align: str,
) -> None:
    with Image.open(input_path) as source:
        image = source.convert("RGBA")

    bbox = content_bbox(image, alpha_threshold)
    if bbox is None:
        raise ValueError(f"Could not detect sprite content in {input_path}")

    cropped = image.crop(expand_bbox(bbox, image.size, crop_padding))
    target_width, target_height = target_size
    fit_width = max(1, target_width - canvas_padding * 2)
    fit_height = max(1, target_height - canvas_padding * 2)

    scale = min(fit_width / cropped.width, fit_height / cropped.height)
    resized_size = (
        max(1, round(cropped.width * scale)),
        max(1, round(cropped.height * scale)),
    )
    resized = cropped.resize(resized_size, resample_filter())

    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    x = (target_width - resized.width) // 2
    if align == "bottom":
        y = target_height - resized.height - canvas_padding
    elif align == "top":
        y = canvas_padding
    else:
        y = (target_height - resized.height) // 2
    canvas.alpha_composite(resized, (x, max(0, y)))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Crop transparent/background padding and resize a single Prok sprite to a GDD target size."
    )
    parser.add_argument("input_path", type=Path)
    parser.add_argument("output_path", type=Path)
    parser.add_argument(
        "--asset-type",
        choices=sorted(TARGET_SIZES),
        default="small-character",
        help="GDD target size preset. Defaults to small-character, 32x48.",
    )
    parser.add_argument(
        "--size",
        type=parse_size,
        help="Override the preset target size with WIDTHxHEIGHT.",
    )
    parser.add_argument("--crop-padding", type=int, default=1)
    parser.add_argument("--canvas-padding", type=int, default=1)
    parser.add_argument("--alpha-threshold", type=int, default=8)
    parser.add_argument(
        "--align",
        choices=("center", "bottom", "top"),
        default="bottom",
        help="Use bottom for characters and monsters; center is usually better for icons and tiles.",
    )
    args = parser.parse_args()

    target_size = args.size if args.size else TARGET_SIZES[args.asset_type]
    standardize_sprite(
        input_path=args.input_path,
        output_path=args.output_path,
        target_size=target_size,
        crop_padding=max(0, args.crop_padding),
        canvas_padding=max(0, args.canvas_padding),
        alpha_threshold=max(0, min(255, args.alpha_threshold)),
        align=args.align,
    )


if __name__ == "__main__":
    main()

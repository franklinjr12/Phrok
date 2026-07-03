from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGEGEN_CHROMA = Path.home() / ".codex" / "skills" / ".system" / "imagegen" / "scripts" / "remove_chroma_key.py"
STANDARDIZE = ROOT / ".codex" / "skills" / "generate-single-sprite" / "scripts" / "standardize_sprite.py"

TARGET_SIZES = {
    "small-character": (32, 48),
    "small-character-square": (32, 32),
    "medium-monster": (48, 48),
    "large-monster": (64, 64),
    "mvp-boss": (96, 96),
    "skill-icon": (32, 32),
}


def parse_size(value: str) -> tuple[int, int]:
    width, height = value.lower().split("x", 1)
    return int(width), int(height)


def run(command: list[str]) -> None:
    subprocess.run(command, cwd=ROOT, check=True)


def pack_to_target(input_path: Path, output_path: Path, size: tuple[int, int], align: str) -> None:
    image = Image.open(input_path).convert("RGBA")
    alpha_bbox = image.getchannel("A").point(lambda pixel: 255 if pixel > 8 else 0).getbbox()

    if alpha_bbox is None:
      raise ValueError(f"ppa output is blank: {input_path}")

    cropped = image.crop(alpha_bbox)
    target_width, target_height = size

    if cropped.width > target_width or cropped.height > target_height:
        scale = min(target_width / cropped.width, target_height / cropped.height)
        cropped = cropped.resize(
            (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
            Image.Resampling.NEAREST,
        )

    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (target_width - cropped.width) // 2
    if align == "bottom":
        y = target_height - cropped.height
    elif align == "top":
        y = 0
    else:
        y = (target_height - cropped.height) // 2

    canvas.alpha_composite(cropped, (x, y))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("raw_image", type=Path)
    parser.add_argument("output_path", type=Path)
    parser.add_argument("--asset-type", choices=sorted(TARGET_SIZES), required=True)
    parser.add_argument("--align", choices=("bottom", "center", "top"), default="bottom")
    parser.add_argument("--size", type=parse_size)
    parser.add_argument("--work-dir", type=Path, default=ROOT / "tmp" / "spritegen")
    args = parser.parse_args()

    target_size = args.size if args.size else TARGET_SIZES[args.asset_type]
    args.work_dir.mkdir(parents=True, exist_ok=True)
    stem = args.output_path.stem
    alpha_path = args.work_dir / f"{stem}-alpha.png"
    standardized_path = args.work_dir / f"{stem}-standard.png"
    ppa_path = args.work_dir / f"{stem}-ppa.png"

    try:
        run([
            sys.executable,
            str(IMAGEGEN_CHROMA),
            "--input",
            str(args.raw_image),
            "--out",
            str(alpha_path),
            "--auto-key",
            "border",
            "--soft-matte",
            "--transparent-threshold",
            "12",
            "--opaque-threshold",
            "220",
            "--despill",
        ])
        standardize_command = [
            sys.executable,
            str(STANDARDIZE),
            str(alpha_path),
            str(standardized_path),
            "--asset-type",
            args.asset_type,
            "--align",
            args.align,
        ]
        if args.size:
            standardize_command.extend(["--size", f"{target_size[0]}x{target_size[1]}"])
        run(standardize_command)
        run(["ppa", str(standardized_path), "-o", str(ppa_path), "-c", "32", "-t", "-w", "2"])
        pack_to_target(ppa_path, args.output_path, target_size, args.align)
    finally:
        for path in (alpha_path, standardized_path, ppa_path):
            path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()

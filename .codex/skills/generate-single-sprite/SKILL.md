---
name: generate-single-sprite
description: Generate exactly one finished sprite image for this Prok Phaser project, never a spritesheet. Use when Codex is asked to create, add, replace, or regenerate an individual game sprite asset under assets/sprites using the Prok visual style, the imagegen skill, the bundled phrok_style_reference.png reference image, and ppa palette reduction.
---

# Generate Single Sprite

## GDD Size Standards

Use these target canvas sizes from `docs/gdd.md` unless the user requests a different size:

| Asset type | Target size |
| --- | --- |
| Base tile | 32x32 px |
| Small character sprite | 32x48 px by default, 32x32 px when a square character is explicitly better |
| Medium monster | 48x48 px by default, 32x32 px when it should read as small |
| Large monster | 64x64 px |
| MVP boss | 96x96 px or larger when explicitly requested |
| Item icon | 32x32 px by default, 24x24 px for very small inventory/UI icons |
| Skill icon | 32x32 px |

## Workflow

Use this workflow to create one sprite file at a time for this repository.

1. Confirm the requested output is a single sprite, not a spritesheet. If the user asks for a spritesheet, explain that this skill only creates individual sprite images and ask for one sprite to generate first.
2. Choose the final output path inside `assets/sprites/`. Create subfolders only when they match the requested asset organization or existing project conventions.
3. Use the `imagegen` skill first. Always provide both:
   - `assets/phrok_style_reference.png` from this skill folder as a reference image which is the reference artstyle of the game.
   - A concise image generation prompt for the requested sprite.
   - Specify that character sprites should face right for standardization.
   - If it is not a tileset or something that needs a background, specify that the background must always be transparent.
4. Save the raw imagegen output as a temporary file outside `assets/sprites/`, such as in the repository root, `tmp/`, or another scratch location.
5. Run `scripts/standardize_sprite.py` from this skill folder before palette reduction. This script detects useful sprite pixels, crops away excess transparent or uniform background, proportionally resizes the sprite into the GDD target canvas, and keeps only a small transparent margin. Choose the `--asset-type` preset that matches the sprite:

```
python .codex/skills/generate-single-sprite/scripts/standardize_sprite.py <raw_imagegen_path> <standardized_temp_path> --asset-type small-character --align bottom
```

The helper requires Pillow (`PIL`) in the active Python environment.

Use `--align bottom` for characters and monsters so feet/body baselines stay consistent. Use `--align center` for icons, tiles, and most non-character objects. Use `--size WIDTHxHEIGHT` only when the GDD table or the user calls for a specific exception, such as an MVP boss larger than 96x96.

6. Run `ppa` from PATH with exactly 32 colors:

```
ppa <input_path> -o <output_path> -c 32
```

Use the standardized temporary file as `<input_path>` and the final `assets/sprites/...` sprite path as `<output_path>`.

7. Delete both temporary files after `ppa` succeeds. Keep only the final processed sprite in `assets/sprites/`.
8. Report the final sprite path, the chosen target size or asset type, and mention that `ppa` was run with `-c 32`.

## Prompt Requirements

Prompt for a single isolated sprite only. Include the object or character, view angle, intended game use, transparent or simple background if appropriate, and a reminder to match the Prok reference style.

Do not ask imagegen for sheets, grids, multiple poses, animation frames, contact sheets, or variant collections. If variants are needed, generate them as separate requests and process each one through `ppa` independently.

## Required Asset

Use `assets/phrok_style_reference.png` as the style reference image for every imagegen request made through this skill.

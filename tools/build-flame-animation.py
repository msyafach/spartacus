from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "timer"
SOURCE = ASSETS / "source" / "autosprite-campfire-preview.webp"
CANVAS_SIZE = 724
FRAME_MS = 42
INTERPOLATED_STEPS = 4

# Keep the complete campfire and its logs at one fixed size. Only the flame
# region above the fuel bed changes size as the timer counts down.
STAGES = {
    "full": {"flame_width": 1.0, "flame_height": 1.0},
    "half": {"flame_width": 0.82, "flame_height": 0.62},
    "ember": {"flame_width": 0.58, "flame_height": 0.30},
}
CAMPFIRE_SIZE = 650
CAMPFIRE_BOTTOM = 672
FLAME_ANCHOR_X = 144
FLAME_ANCHOR_Y = 183


def load_frames(source: Path) -> list[Image.Image]:
    animation = Image.open(source)
    frames: list[Image.Image] = []
    for index in range(getattr(animation, "n_frames", 1)):
        animation.seek(index)
        frames.append(animation.convert("RGBA").copy())
    if len(frames) < 2:
        raise ValueError(f"Expected an animated campfire, got {len(frames)} frame")
    return frames


def interpolate_rgba(first: Image.Image, second: Image.Image, amount: float) -> Image.Image:
    """Blend in premultiplied-alpha space to keep transparent edges clean."""
    a = np.asarray(first, dtype=np.float32) / 255.0
    b = np.asarray(second, dtype=np.float32) / 255.0
    a_alpha = a[:, :, 3:4]
    b_alpha = b[:, :, 3:4]
    alpha = a_alpha * (1.0 - amount) + b_alpha * amount
    premultiplied = a[:, :, :3] * a_alpha * (1.0 - amount) + b[:, :, :3] * b_alpha * amount
    rgb = np.divide(premultiplied, alpha, out=np.zeros_like(premultiplied), where=alpha > 1e-6)
    rgba = np.concatenate((rgb, alpha), axis=2)
    return Image.fromarray(np.clip(rgba * 255.0, 0, 255).astype(np.uint8), "RGBA")


def make_smooth_loop(source_frames: list[Image.Image]) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index, current in enumerate(source_frames):
        following = source_frames[(index + 1) % len(source_frames)]
        for step in range(INTERPOLATED_STEPS):
            frames.append(interpolate_rgba(current, following, step / INTERPOLATED_STEPS))
    return frames


def split_flame(source: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Separate the bright moving flame from the original logs and stones."""
    pixels = np.asarray(source, dtype=np.uint8).copy()
    height, width = pixels.shape[:2]
    y = np.arange(height)[:, None]
    x = np.arange(width)[None, :]
    red = pixels[:, :, 0].astype(np.float32)
    green = pixels[:, :, 1].astype(np.float32)
    blue = pixels[:, :, 2].astype(np.float32)
    warm_flame = (red > 105) & (red > green * 1.14) & (green > blue * 1.25)
    flame_mask = ((y < 140) | ((y < 178) & (x > 64) & (x < 224) & warm_flame)) & (pixels[:, :, 3] > 0)

    base_pixels = pixels.copy()
    base_pixels[:, :, 3][flame_mask] = 0
    flame_pixels = pixels.copy()
    flame_pixels[:, :, 3][~flame_mask] = 0
    return Image.fromarray(base_pixels, "RGBA"), Image.fromarray(flame_pixels, "RGBA")


def render_stage(stage: str, source_frames: list[Image.Image]) -> list[Image.Image]:
    config = STAGES[stage]
    rendered: list[Image.Image] = []

    for source in source_frames:
        if stage == "full":
            campfire = source
        else:
            base, flame = split_flame(source)
            width_scale = config["flame_width"]
            height_scale = config["flame_height"]
            flame = flame.resize(
                (round(source.width * width_scale), round(source.height * height_scale)),
                Image.Resampling.LANCZOS,
            )
            campfire = base.copy()
            campfire.alpha_composite(
                flame,
                (
                    round(FLAME_ANCHOR_X * (1.0 - width_scale)),
                    round(FLAME_ANCHOR_Y * (1.0 - height_scale)),
                ),
            )

        campfire = campfire.resize((CAMPFIRE_SIZE, CAMPFIRE_SIZE), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(campfire, ((CANVAS_SIZE - CAMPFIRE_SIZE) // 2, CAMPFIRE_BOTTOM - CAMPFIRE_SIZE))
        rendered.append(canvas)

    return rendered


def save_animation(frames: list[Image.Image], destination: Path) -> None:
    frames[0].save(
        destination,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_MS,
        loop=0,
        lossless=False,
        quality=91,
        method=3,
        minimize_size=True,
    )


def save_contact_sheet(stages: dict[str, list[Image.Image]]) -> None:
    indices = (0, 8, 16, 24, 32, 40, 48, 56)
    thumb = 240
    sheet = Image.new("RGBA", (thumb * len(indices), thumb * len(stages)), (8, 8, 10, 255))
    for row, frames in enumerate(stages.values()):
        for column, index in enumerate(indices):
            frame = frames[index].copy()
            frame.thumbnail((thumb, thumb), Image.Resampling.LANCZOS)
            left = column * thumb + (thumb - frame.width) // 2
            top = row * thumb + (thumb - frame.height) // 2
            sheet.alpha_composite(frame, (left, top))
    sheet.convert("RGB").save(ASSETS / "flame-animation-contact-sheet.jpg", quality=92)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing CC0 campfire animation: {SOURCE}")

    source_frames = load_frames(SOURCE)
    smooth_frames = make_smooth_loop(source_frames)
    if len(smooth_frames) != 64:
        raise ValueError(f"Expected 64 output frames, got {len(smooth_frames)}")

    built: dict[str, list[Image.Image]] = {}
    for stage in STAGES:
        frames = render_stage(stage, smooth_frames)
        save_animation(frames, ASSETS / f"flame-{stage}-animated.webp")
        built[stage] = frames
    save_contact_sheet(built)


if __name__ == "__main__":
    main()

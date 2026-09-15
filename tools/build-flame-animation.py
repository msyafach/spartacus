from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "timer"
SOURCE = ASSETS / "source" / "cgheven-large-campfire-64-4k.png"
LOGS_SOURCE = ASSETS / "source" / "campfire-base.png"
CANVAS_SIZE = 724
FRAME_COUNT = 64
FRAME_MS = 42
FIRE_SOURCE_CENTER_X = 230.1

STAGES = {
    "full": {"fire_size": 590, "fire_bottom": 585, "glow": 105},
    "half": {"fire_size": 410, "fire_bottom": 570, "glow": 72},
    "ember": {"fire_size": 245, "fire_bottom": 560, "glow": 48},
}


def split_flipbook(sheet: Image.Image) -> list[Image.Image]:
    if sheet.size[0] % 8 or sheet.size[1] % 8:
        raise ValueError(f"Expected an 8x8 flipbook, got {sheet.size}")
    cell_w = sheet.size[0] // 8
    cell_h = sheet.size[1] // 8
    return [
        sheet.crop((column * cell_w, row * cell_h, (column + 1) * cell_w, (row + 1) * cell_h))
        for row in range(8)
        for column in range(8)
    ]


def extract_log_layer(source: Image.Image) -> Image.Image:
    """Keep one consistent fire pit while removing the old painted upper flame."""
    source = source.convert("RGBA")
    rgba = np.asarray(source, dtype=np.float32).copy()
    height = rgba.shape[0]
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3]
    luminance = rgb[:, :, 0] * 0.299 + rgb[:, :, 1] * 0.587 + rgb[:, :, 2] * 0.114
    y = np.arange(height, dtype=np.float32)[:, None]

    # Above the pit, retain only dark solid material. From the coal bed down,
    # retain the original pixels completely. A soft transition avoids a cutout edge.
    vertical = np.clip((y - 335.0) / 85.0, 0.0, 1.0)
    dark_material = np.clip((218.0 - luminance) / 92.0, 0.0, 1.0)
    transition = np.where(y < 535.0, vertical * dark_material, 1.0)
    rgba[:, :, 3] = alpha * transition
    layer = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA")
    bbox = layer.getchannel("A").getbbox()
    if not bbox:
        return layer
    content_center = (bbox[0] + bbox[2]) / 2
    offset_x = round(CANVAS_SIZE / 2 - content_center)
    centered = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    centered.alpha_composite(layer, (offset_x, 0))
    return centered


def make_glow(stage: str, energy: float) -> Image.Image:
    config = STAGES[stage]
    layer = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    # The broad halo stays stable so the loop does not flash against the UI.
    # Flicker is confined to the fuel bed in warm_logs().
    alpha = round(config["glow"] * 0.86)
    if stage == "full":
        box = (105, 325, 619, 685)
    elif stage == "half":
        box = (155, 390, 569, 680)
    else:
        box = (220, 455, 504, 665)
    draw.ellipse(box, fill=(255, 71, 8, alpha))
    return layer.filter(ImageFilter.GaussianBlur(54 if stage == "full" else 42))


def warm_logs(logs: Image.Image, energy: float, stage: str) -> Image.Image:
    config = STAGES[stage]
    strength = config["glow"] / STAGES["full"]["glow"]
    warm = Image.new("RGBA", logs.size, (255, 75, 5, 0))
    mask = Image.new("L", logs.size, 0)
    draw = ImageDraw.Draw(mask)
    alpha = round((31 + energy * 20) * strength)
    draw.ellipse((170, 410, 555, 650), fill=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(38))
    mask_arr = np.asarray(mask, dtype=np.uint8)
    log_alpha = np.asarray(logs.getchannel("A"), dtype=np.uint8)
    warm.putalpha(Image.fromarray(np.minimum(mask_arr, log_alpha), "L"))
    return Image.alpha_composite(logs, warm)


def render_stage(stage: str, fire_frames: list[Image.Image], logs: Image.Image) -> list[Image.Image]:
    config = STAGES[stage]
    size = int(config["fire_size"])
    bottom = int(config["fire_bottom"])
    rendered: list[Image.Image] = []

    raw_energies: list[float] = []
    for fire in fire_frames:
        rgba = np.asarray(fire.convert("RGBA"), dtype=np.float32)
        alpha = rgba[:, :, 3] / 255.0
        luminance = rgba[:, :, 0] * 0.299 + rgba[:, :, 1] * 0.587 + rgba[:, :, 2] * 0.114
        raw_energies.append(float((luminance * alpha).sum() / max(alpha.sum(), 1.0)))
    energy_min = min(raw_energies)
    energy_span = max(max(raw_energies) - energy_min, 1.0)

    for fire, raw_energy in zip(fire_frames, raw_energies):
        fire = fire.convert("RGBA")
        energy = (raw_energy - energy_min) / energy_span
        fire = fire.resize((size, size), Image.Resampling.LANCZOS)
        fire = ImageEnhance.Color(fire).enhance(1.04)

        canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        canvas = Image.alpha_composite(canvas, make_glow(stage, energy))
        # The simulation was rendered off-axis inside every source cell.
        # Apply one stable correction to all frames so the flame remains natural
        # while its average visual center sits over the coal bed.
        source_offset = round((256.0 - FIRE_SOURCE_CENTER_X) * size / 512.0)
        left = (CANVAS_SIZE - size) // 2 + source_offset
        canvas.alpha_composite(fire, (left, bottom - size))
        canvas = Image.alpha_composite(canvas, warm_logs(logs, energy, stage))
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
        quality=88,
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
            sheet.alpha_composite(frame, (column * thumb + (thumb - frame.width) // 2, row * thumb))
    sheet.convert("RGB").save(ASSETS / "flame-animation-contact-sheet.jpg", quality=91)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing licensed source flipbook: {SOURCE}")
    if not LOGS_SOURCE.exists():
        raise FileNotFoundError(f"Missing campfire base artwork: {LOGS_SOURCE}")

    fire_frames = split_flipbook(Image.open(SOURCE))
    logs = extract_log_layer(Image.open(LOGS_SOURCE))
    built: dict[str, list[Image.Image]] = {}
    for stage in STAGES:
        frames = render_stage(stage, fire_frames, logs)
        save_animation(frames, ASSETS / f"flame-{stage}-animated.webp")
        built[stage] = frames
    save_contact_sheet(built)


if __name__ == "__main__":
    main()

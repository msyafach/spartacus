"""Check that timer flames shrink while the wood and stone footprint stays fixed."""

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "timer"


def bounds(mask: np.ndarray) -> tuple[int, int, int, int]:
    y, x = np.where(mask)
    if not len(x):
        raise AssertionError("Expected visible campfire pixels")
    return int(x.min()), int(y.min()), int(x.max()), int(y.max())


def main() -> None:
    footprints = []
    flame_tops = []
    for stage in ("full", "half", "ember"):
        animation = Image.open(ASSETS / f"flame-{stage}-animated.webp")
        assert animation.size == (724, 724)
        assert animation.n_frames == 64
        animation.seek(0)
        alpha = np.asarray(animation.convert("RGBA"))[:, :, 3]
        y = np.arange(alpha.shape[0])[:, None]
        footprints.append(bounds((alpha > 100) & (y > 440)))
        flame_tops.append(bounds((alpha > 100) & (y < 430))[1])
        print(stage, "wood/stones", footprints[-1], "flame top", flame_tops[-1])

    assert footprints[0] == footprints[1] == footprints[2], "Wood and stones changed size or position"
    assert flame_tops[0] < flame_tops[1] < flame_tops[2], "Flame did not shrink as time ran down"
    print("PASS: flame shrinks while wood and stones stay fixed")


if __name__ == "__main__":
    main()

"""Rebuild the seamless fireplace ambience from the two public-domain sources."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "ambience" / "source"
DESTINATION = ROOT / "assets" / "ambience" / "fire.ogg"


def run(*args: str) -> None:
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], check=True)


def main() -> None:
    bed = SOURCE / "nps-fireplace-bed.ogg"
    crackle = SOURCE / "dry-grass-fireplace.ogg"
    for source in (bed, crackle):
        if not source.exists():
            raise FileNotFoundError(source)

    with tempfile.TemporaryDirectory(prefix="spartacus-fireplace-") as temp:
        candidate = Path(temp) / "fire-candidate.ogg"
        run(
            "-i", str(bed), "-i", str(crackle),
            "-filter_complex",
            "[0:a]highpass=f=100,lowpass=f=9000,"
            "acompressor=threshold=0.016:ratio=8:attack=8:release=260:makeup=10[bed];"
            "[1:a]highpass=f=180,lowpass=f=10000,"
            "acompressor=threshold=0.012:ratio=7:attack=5:release=190:makeup=9,"
            "asplit=4[c1][c2][c3][c4];"
            "[c1][c2]acrossfade=d=2.5[loop1];"
            "[loop1][c3]acrossfade=d=2.5[loop2];"
            "[loop2][c4]acrossfade=d=2.5,atrim=duration=65[crackle];"
            "[bed][crackle]amix=inputs=2:weights='0.7 0.5':normalize=0,"
            "alimiter=limit=0.82,atrim=duration=65[out]",
            "-map", "[out]", "-c:a", "libvorbis", "-q:a", "5", str(candidate),
        )
        run(
            "-i", str(candidate),
            "-filter_complex",
            "[0:a]asplit=2[a][b];"
            "[a]atrim=start=3:end=65,asetpts=PTS-STARTPTS[body];"
            "[b]atrim=start=0:end=3,asetpts=PTS-STARTPTS[head];"
            "[body][head]acrossfade=d=3,volume=0.78[out]",
            "-map", "[out]", "-c:a", "libvorbis", "-q:a", "5", str(DESTINATION),
        )


if __name__ == "__main__":
    main()

# Ambience recordings

Spartacus bundles the following field recordings so ambience works offline. Each excerpt was trimmed, band-limited, level-adjusted, and re-encoded as Ogg Vorbis. The fireplace blends a hearth bed with a separate close crackling recording, compresses their wide volume range, and crossfades the loop boundary. The original recordings remain available at the links below.

| App sound | Source and creator | License | Excerpt |
| --- | --- | --- | --- |
| Rain | [Rain](https://commons.wikimedia.org/wiki/File:Rain_(1).ogg), ezwa | Public domain | 2–43 s; 38 s crossfaded loop |
| Ocean | [Waves](https://commons.wikimedia.org/wiki/File:Waves.ogg), Dsw4 | Public domain | 15–85 s; 65 s loop |
| Bustling Café | [Cafe ambiance](https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg), Marble Toast | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 60–130 s; 65 s loop |
| Forest | [forest ambience](https://commons.wikimedia.org/wiki/File:20090610_0_ambience.ogg), nille | Public domain | 8–78 s; 65 s loop |
| Fireplace | [Valley Forge Yule Log](https://commons.wikimedia.org/wiki/File:Valley_Forge_Yule_Log.webm), Gregory Purifoy / National Park Service; [Dry grass burning in open fireplace](https://commons.wikimedia.org/wiki/File:Dry_grass_burning_in_open_fireplace.ogg), ezwa | Public domain (U.S. federal government work); public domain (author dedication) | 65 s hearth bed mixed with repeated 25 s crackle; 62 s crossfaded loop |

The airplane cabin, brown noise, and binaural beats remain synthesized by the app. The generated rain, ocean, and café sounds remain available internally as fallbacks if a recording fails to load.

The two edited fireplace source recordings are kept in `assets/ambience/source/` for rebuilding, but excluded from the installer. Run `python tools/build-fireplace-ambience.py` to recreate the bundled loop.

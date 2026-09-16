# Flame timer animation assets

`flame-full-animated.webp`, `flame-half-animated.webp`, and
`flame-ember-animated.webp` are transparent 724 x 724 looping animations.
Each contains 64 frames at 42 ms per frame. Four blended in-between frames are
created from each pair of the 16 original animation frames, including the loop
boundary, to smooth their motion without deforming the artwork.

The **Campfire** animation comes from [AutoSprite's free sprite library](https://www.autosprite.io/free-sprites/campfire)
under CC0. Its flame, sparks, logs, and stones are one cohesive source asset.
The original logs and stones stay at the same size and position in every stage;
only the upper flame is reduced. No older generated fire or separate wood artwork
remains.

The original animated WebP is in `source/` for rebuilding and excluded from
packaged releases. Run `python tools/build-flame-animation.py` to regenerate
the optimized animations and `flame-animation-contact-sheet.jpg`.

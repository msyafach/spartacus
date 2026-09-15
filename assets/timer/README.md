# Flame timer animation assets

`flame-full-animated.webp`, `flame-half-animated.webp`, and
`flame-ember-animated.webp` are transparent 724 x 724 looping animations.
Every file contains 64 genuinely rendered fire frames at 42 ms per frame.
The flames change across their full height and at the fuel bed; no geometric
warping or side-to-side image motion is used.

All three stages share the same fire pit artwork, so the wood and stones never
change shape as the timer runs down. Light from the rendered flame modulates the
glow across the logs and coal bed, while the source simulation supplies natural
licks, splits, collapses, and small flying embers.

The fire simulation is **Large Campfire Loop - No Smoke - Flipbooks (8x8)** by
Ammar Khan / CGHEVEN, licensed CC0:

https://cgheven.com/assets/large-campfire-loop-no-smoke-flipbooks-6x6-8x8

The original 4K 8x8 sheet and the shared campfire base live in `source/` for
rebuilding but are excluded from packaged releases. Run
`python tools/build-flame-animation.py` after changing either source. The script
also regenerates `flame-animation-contact-sheet.jpg` for visual review.

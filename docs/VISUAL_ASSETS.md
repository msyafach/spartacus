# Spartacus visual assets

The application backgrounds were generated with Codex's built-in image generation tool, then saved as JPEG (quality 93) at 1672 × 941. The Windows icon and installer artwork are rendered from the project-owned vector mark in `assets/helmet.svg` using `npx electron tools/make-icons.js`. The generated icon concept was redrawn as a clean vector so small Windows icon sizes stay legible.

The timer fire uses Ammar Khan / CGHEVEN's 4K **Large Campfire Loop - No Smoke** 8×8 flipbook under the [CC0 license](https://cgheven.com/assets/large-campfire-loop-no-smoke-flipbooks-6x6-8x8). Its 64 rendered frames are composited with one consistent fire pit base into full, half, and ember stages. The release includes only the optimized animated WebP files; rebuilding instructions and source details are in `assets/timer/README.md`.

## Prompts

Default background:

> Use case: photorealistic-natural. Asset type: wide desktop background for the Spartacus minimalist black-and-white focus timer. A timeless monumental stone colonnade and broad steps receding into mist at dawn, seen from a calm eye-level architectural perspective. Quiet contemplative space with a strong sense of discipline and forward movement, no people, no weapons. Monochrome graphite, charcoal, silver and soft ivory only. Fine stone texture, atmospheric depth, natural cinematic light, polished editorial architectural photograph. Landscape 16:9 framing, composition balanced so white timer and controls over a dark UI overlay remain readable; preserve even detailed texture across the whole frame without an overly bright center. No text, logo, interface, borders or watermark.

Track backgrounds used this shared prompt, replacing `{name}` and `{scene}` with the entries below:

> Use case: photorealistic-natural. Asset type: fullscreen background for the {name} built-in lofi track in Spartacus, a minimalist focus timer. {scene} Premium editorial photography, fine natural texture, restrained monochrome charcoal, silver, and ivory palette, calm mood, cinematic atmospheric depth. Landscape 16:9 wide framing with clear visual interest spread across the frame; the application will place a dark overlay and light text on top. No text, logos, interface, borders or watermark.

| Track | Scene |
| --- | --- |
| hanging-lanterns | A quiet narrow historic street at blue hour, a sequence of simple paper lanterns hanging overhead, pools of diffused light on wet stone, no people. |
| bread | A rustic artisan bakery table by a tall rain-streaked window, one loaf of bread and a ceramic cup, subtle steam and soft morning light, no people. |
| first-snow | An empty path through pine trees during the first gentle snowfall, soft branches and distant mist, peaceful winter stillness. |
| waves | An aerial view of slow ocean waves rolling diagonally onto a dark volcanic shore, elegant white foam patterns, no people or buildings. |
| pearl | A single luminous pearl resting inside an open shell on dark stone, subtle reflection and soft side light, quiet still life, not jewelry advertising. |
| flicker | A lone candle flame flickering in a dark quiet room beside an old book, softly illuminated wall, intimate contemplative atmosphere, no people. |
| skin | Close-up abstract study of soft linen fabric folds and smooth river stones, tactile gentle surfaces, shadow and light, no human body. |
| pieces-of-stars | A remote night sky with a restrained scatter of bright stars above a dark mountain horizon, faint Milky Way texture, no fantasy effects. |
| moment | An empty wooden desk by a tall window at dawn, open notebook and one pencil, pale light falling across the surface, quiet moment before work. |

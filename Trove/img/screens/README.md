# Trove phone screens

Two places read from this folder:

- `Trove/cover.html` — the cover on the case study page. Edit the `SCREENS`
  array near the top of its script. Multiple entries crossfade.
- `models.html` — the Trove station on the homepage scroll. It reads
  `phone-screen.png` directly (`troveOverlayURL`).

Both draw onto the same `iphone.glb` the MyAuntie station uses, at
`[40, 88]` local units, position `[0, 45.7, 8.5]`.

Captures want to be portrait, roughly 9:19.5 (1179x2556 is exact).
`phone-screen.png` is a placeholder gradient. Overwrite it.

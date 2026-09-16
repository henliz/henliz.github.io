# Scene art credits

The tile scenes in `scenes/` are rendered images. Geometry, lighting and
shading are generated; the *surfaces* are photographs used as albedo and
heightfields, so the normals come off real grain and thread.

## MyAuntie — the nursery (`ns-back.webp`)

The armchair is a cut-out supplied by Hen. Everything else photographic is
**CC0** (public domain, no attribution required), found via Openverse and
listed here for traceability rather than obligation:

| used for | title | source | licence |
| --- | --- | --- | --- |
| nursery wall plaster | White Plaster | [stocksnap](https://stocksnap.io/photo/white-plaster-V1SCOCHDK7) | CC0 |
| nursery floorboards | Wood plank floor texture background | [rawpixel](https://www.rawpixel.com/image/6170512/photo-image-background-texture-banner) | CC0 |
| small wooden props | Wood plank floor texture background | [rawpixel](https://www.rawpixel.com/image/6130363/photo-image-background-texture-abstract) | CC0 |
| upholstery weave, rug, cushion, basket | Upholstery fabric (1950s) | [rawpixel](https://www.rawpixel.com/image/9957128/upholstery-fabric-1950s) | CC0 |
| knitted blanket and teddy | Dog sweater 2 | [wikimedia](https://commons.wikimedia.org/w/index.php?curid=139561247) | CC0 |
| the garden through the window | View of guava tree branches and green leaves against the sky | [wordpress](https://wordpress.org/photos/photo/93168efda1/) | CC0 |
| the framed prints on the wall | A vibrant orange gerbera daisy flower stands tall on a single stem amid green foliage. The soft-focus bokeh background features a blurred garden with potted plants in a nursery setting. | [wordpress](https://wordpress.org/photos/photo/2246a089a8/) | CC0 |

## Trove — the meadow

Sky, hills, grass tufts and grass fringe are the Trove landing page's own
assets. The two cloud layers are real photographed cumulus from the same
source, knocked out of their sky.

## Skrimp — the kitchen (`ct-*`)

Drawn, like the meadow, not rendered. SVG and CSS light. The single raster is
Skrimp's own grocery-bag cutout, trimmed of its transparent margin.

| layer | what it is |
| --- | --- |
| `ct-room.svg` | window and garden, sill pot, ivy, open shelving, hanging planter, backsplash, cabinets |
| `.ct-sun` | CSS radial. daylight at the far end of the run |
| `ct-counter.svg` | worktop and front lip |
| `ct-props.svg` | sink, brass tap, herb pots, kettle, pendant |
| `ct-rays.svg` | sun shafts thrown across the run |
| `ct-bag.webp` | `call-to-action-grocery-savings.png`, eCo-op frontend |
| `ct-motes.svg` | dust |
| `.ct-clip` | the grocery-list capture, cropped to the app card |

The run is nearest at the right and recedes to a vanishing point at x=-2048,
off canvas. That number is derived, not chosen: the grocery bag's cutting board
has a front-left edge whose slope is +0.2100, measured off the PNG's own alpha
channel (lowest opaque pixel per column, line fitted over x 371..650, residual
0.5px). Anchoring the worktop's lip at (2000, 1150) and solving
x = 2000 + (300 - 1150) / 0.2100 puts the vanishing point where the lip comes
out exactly parallel to that edge. Worktop, backsplash, tile courses, drawer rails and cabinet stiles all
converge on it, and props are scaled by how far down the run they sit.

Left to right on the worktop: groceries, laptop, breakfast, with a Skrimp guy at
each end. Everything is placed against the measured worktop band — at the bag's
x the surface runs y 41%..64% of the tile, so its board lands at 60%.

The clip is deliberately NOT mapped to the laptop screen. On the lid it always
fought the lid's aspect; as its own card it plays at its own shape and can be
put anywhere. The capture is 1280x694 with the app card at x 58..1222, y 0..672
and the page's own grey around it, so the card box is cut to 1164x672 and the
video offset to push that grey outside it.

Earlier attempts, for the record: a head-on kitchen (flat wall behind a flat
band), an aisle canyon (too cold for the product), and a countertop photograph
(right feel, wrong medium).

## Menzoberranzan — the cavern (`ud-*.webp`)

Fully generated. No photographic source.

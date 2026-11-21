# TuneVerse design

Every page is printed like a gig flyer from a riso machine: two inks on cool paper.
A room is a little gig your friends get let into, so rooms, invites and forms are **tickets**.

Use this file for every page. If you need something it doesn't cover, add it here first.

## Inks (the only colours)

| Token | Hex | Job |
|---|---|---|
| `paper` | `#f2f3f5` | Page ground. Cool white, never cream. |
| `ink` | `#111d63` | All body text, borders, rules. Deep riso blue, never black. |
| `blue` | `#2148d6` | Big display type and the second ink in duotones. |
| `pink` | `#ff3fa4` | Fluoro pink. Primary buttons, ticket fills, "now playing", the misprint layer. Never small text on paper (fails contrast). |
| `wash` | `#e2e6f3` | Quiet fills: inputs, hover rows, empty art. |
| `soft` | `#4a5797` | Secondary text on paper or wash (6:1). |

Values above are **day print**. Never write a hex in a component; use the token so every paper works.

Role tokens (each paper sets its own):

| Token | Job |
|---|---|
| `on-pink` | Text on anything pink. Never `text-ink` on `bg-pink`. |
| `rule` | Dividers and panel edges. Interactive edges (buttons, fields, switches) use `ink`. |
| `field` | Inside inputs. |
| `wash-strong` | Hover on a wash block. |
| `stage` / `on-stage` | The video and Spotify area. Always dark, on every paper. |

Text on blue or on an ink block is `paper` (they invert together on dark papers).
Errors are `field` strips with a 6px pink left edge and plain words, no red (`<FormError>`).

## Papers

Four papers, picked with the swatches in every header (`<PaperPicker>`), saved per device.
"Auto" follows the device: light = day print, dark = night print.

| Paper | `data-paper` | Ground | Notes |
|---|---|---|---|
| Day print | `day` | `#f2f3f5` | The default. |
| Blush | `blush` | `#fbdde9` | Pink buttons get an ink edge (`.btn-pink`) so they don't vanish. |
| Night print | `night` | `#0e1647` | The ink becomes the paper. Lighter blue `#7d95ff`, pink `#ff4fac`. Default dark. |
| Black stock | `black` | `#121216` | Extra option only. Near-black + neon is a known AI look, so never the default. |

Every pair passes AA (4.5:1) on every paper. Check new colours on all four before adding them.

## Type

- **Anton** (`font-display`): uppercase, condensed, huge. Headlines, room names, ticket titles. Never for sentences.
- **Archivo** (`font-sans`): everything else. Labels on tickets use the wide cut (`.label`: 125% width, bold, small caps-size tracking).
- Scale: display 13vw → 4.5rem cap on posters, 3rem in the room; body 16px; small 14px.

## Shapes

- Corners are square. The only circles are avatars and the play button.
- Separate things with 2px `rule` lines or solid fills, not shadows and not hairlines.
- **Tickets** (`.ticket`): a solid block with a perforated stub on the right, notches cut top and bottom. Use for: featured room, room cards, auth forms, invite code.

## Signature details (don't add more)

1. **Misregistered headline** (`<Overprint>`): the pink layer sits slightly off the blue one (multiplied on light papers, blue on top on dark ones), like a riso print that slipped. It slides into place once on load.
2. **Duotone artwork** (`.duotone`): album art prints in pink + blue; hover shows the real colours.

## Loud vs calm

- Loud: home, lobby, auth, errors. Overprint headlines, big tickets.
- Calm: inside a room. Paper ground, ink rules, Anton only for the room name and section titles; pink only for what's playing and the main action.

## Motion

One move per page at most: the overprint settling, list rows dropping in. Everything off under `prefers-reduced-motion`.

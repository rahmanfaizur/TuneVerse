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

Text on pink is always `ink` (4.7:1). Text on blue or ink is always `paper`.
Errors use an ink-bordered pink strip and plain words, no red.

## Type

- **Anton** (`font-display`): uppercase, condensed, huge. Headlines, room names, ticket titles. Never for sentences.
- **Archivo** (`font-sans`): everything else. Labels on tickets use the wide cut (`.label`: 125% width, bold, small caps-size tracking).
- Scale: display 13vw → 4.5rem cap on posters, 3rem in the room; body 16px; small 14px.

## Shapes

- Corners are square. The only circles are avatars and the play button.
- Separate things with 2px `ink` rules or solid fills, not shadows and not hairlines.
- **Tickets** (`.ticket`): a solid block with a perforated stub on the right, notches cut top and bottom. Use for: featured room, room cards, auth forms, invite code.

## Signature details (don't add more)

1. **Misregistered headline** (`<Overprint>`): the pink layer sits slightly off the blue one, multiplied, like a riso print that slipped. It slides into place once on load.
2. **Duotone artwork** (`.duotone`): album art prints in pink + blue; hover shows the real colours.

## Loud vs calm

- Loud: home, lobby, auth, errors. Overprint headlines, big tickets.
- Calm: inside a room. Paper ground, ink rules, Anton only for the room name and section titles; pink only for what's playing and the main action.

## Motion

One move per page at most: the overprint settling, list rows dropping in. Everything off under `prefers-reduced-motion`.

# DESIGN.md: Galmee Wholesale

Change this file first, then the code.

## Brief

- **Subject:** a wholesale shop in Shashamane. Sugar and flour sacks stacked to the ceiling, yellow oil jerrycans, a blue tarpaulin over the delivery truck, and a credit notebook behind the counter that only the owner can read.
- **Audience:** the owner (wants the number, tonight) and the counter staff (gives goods on credit with one thumb while a customer waits).
- **Primary job:** show who owes how much, and since when, in two seconds.

## Colour

| Token | Hex | Role |
| --- | --- | --- |
| `--tarp` | `#0F4C5C` | Dominant. The truck tarpaulin: header, primary action, active nav. |
| `--jerrycan` | `#F5B700` | The one accent. Only on the total-owed band and the primary "give on credit" action. Always with ink text. |
| `--floor` | `#F3F4F1` | Page background, a swept cement floor. Cool, not cream. |
| `--ink` | `#14242A` | Text. |
| `--sack-line` | `#CBD3D3` | Row dividers and borders. |
| `--owed` | `#AB2318` | Money owed and errors. Always with a label or an arrow icon. |
| `--paid` | `#1B6B4A` | Repaid, settled. Always with a check icon. |
| `--late` | `#8A5200` | Overdue ageing. Always with a clock icon and the bucket text. |

Status is never colour alone: each status has an icon and a word.

## Type

- **Latin and Afaan Oromo:** Atkinson Hyperlegible Next, variable. Designed so that 1/7, 0/O and 5/S cannot be mistaken, which is the whole job of a debt ledger read in sunlight.
- **Amharic:** Noto Sans Ethiopic, variable. Set 2 % larger with looser leading, because Ethiopic glyphs are dense at small sizes.
- Self-hosted with `next/font/local` in `src/app/fonts/`.
- Scale (px): 14, 16, 18, 22, 28, 40. The 40 is reserved for the total-owed figure.
- Money always uses `.money` (tabular figures, 600 weight), right-aligned in lists.

## Layout

No grid of cards. The main screen is a stock sheet: full-width rows split by one line, the name on the left and the amount hanging on the right. Behind each row's amount a thin bar shows that customer's share of the biggest debt, like a sack-height tally.

360 px:

```
+----------------------------------+
| Tenant name              EN  [>] |  tarp header
+----------------------------------+
|##################################|  jerrycan band
|  Total owed                      |
|  148,320.00 ETB       25 shops   |
|##################################|
| [ Search name or phone        ]  |
|                                  |
| Almaz Shop            12,400.00  |
| 0911...  since 47 days  ▓▓▓▓▓▓▓  |
| -------------------------------- |
| Bekele Mini Market     8,250.00  |
| 0912...  since 12 days  ▓▓▓▓     |
+----------------------------------+
| Owed  Items  Overdue  Reports    |  bottom nav
+----------------------------------+
        ( + Give on credit )          sticky, thumb reach
```

Desktop (1280 px): a tarp sidebar on the left, the same sheet centred at max 56 rem. The band stays full width of the content column.

## Review against generic defaults

- First pass used the notebook look (ruled lines, red margin). Rejected: Galmee School already owns it, and it is the obvious answer for a credit app.
- Cream background rejected: floor is a cool grey-white.
- Cards rejected for the main list: rows are denser on a 360 px phone and read like a stock sheet.
- No all-caps labels, no eyebrow text, no gradients, no shadow under rows.

## Boldness

One thing only: the jerrycan-yellow total-owed band. Everything else is quiet.

## Motion

Only in answer to an action (sheet opening, saved confirmation). All motion is off under `prefers-reduced-motion`.

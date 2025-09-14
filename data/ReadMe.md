# Mock Data Documentation

This folder contains two CSV files with mock purchasing data designed for demos and prototyping. The data simulates groceries, occasional gasoline, and restaurant/cafeteria spending over the last ~60 days.

## Files

- `data/transaction-mockup.csv` — line-item transactions (one row per purchased item).
- `data/receipts-mockup.csv` — receipt-level summaries (one row per receipt).

Dates are in local time, format `YYYY-MM-DD HH:mm:ss`. Amounts are USD, stored as decimals with a dot separator and two fractional digits. CSVs are comma-delimited with a header row.

## Schema: transaction-mockup.csv

Columns

- `date_time` (string): Timestamp of the purchase (shared by all items in the same receipt).
- `receipt_id` (string): Identifier for the receipt. Format `RYYYYMMDD-NN` where `NN` increments per-day.
- `item_name` (string): Human-friendly item name (e.g., `Milk 2% 1 gal`).
- `item_type` (string, enum): One of the item type ontology values listed below.
- `net_amount` (number): Pre-tax line amount in USD.
- `sales_tax` (number): Sales tax for the line in USD.

Row semantics

- Multiple rows can share the same `date_time` and `receipt_id` to represent items on a single receipt.
- Line taxes are pre-computed; totals are the arithmetic sum of line net and line taxes.

## Schema: receipts-mockup.csv

Columns

- `date_time` (string): Timestamp of the receipt. Matches corresponding values in `transaction-mockup.csv`.
- `total_net` (number): Sum of `net_amount` across all items in the receipt.
- `total_sales` (number): Sum of `sales_tax` across all items in the receipt.
- `vendor` (string): Plausible merchant name for the receipt.

Row semantics

- One row per receipt timestamp.
- Totals equal the sum of the corresponding transaction rows sharing the same `date_time`.

Note: The summary file does not include `receipt_id` (by design, to keep it minimal). The join key between files is `date_time`. If you prefer a more robust join, consider adding `receipt_id` to `receipts-mockup.csv` as an extension.

## Relationships

- Cardinality: Many transaction rows map to one receipt row (many-to-one).
- Join key: `date_time`.
- Integrity rules (as generated):
  - Every `date_time` present in `receipts-mockup.csv` appears in `transaction-mockup.csv`.
  - For each shared `date_time`, `total_net = Σ(net_amount)` and `total_sales = Σ(sales_tax)` over the matching transactions.
  - Line amounts and taxes are rounded to 2 decimals; receipt totals are the sum of these rounded values.

Example (2025-07-21 18:46:55)

- Sum of line `net_amount` = 33.09
- Sum of line `sales_tax` = 1.52
- `receipts-mockup.csv` contains a row with `total_net=33.09` and `total_sales=1.52` for the same `date_time`.

## Item type ontology

The following `item_type` values appear in the mock data:

- `produce` — Fruits and vegetables.
- `dairy` — Milk, yogurt, cheese, eggs.
- `meat` — Beef, poultry, pork, seafood.
- `pantry` — Shelf-stable staples (rice, pasta, canned goods, baking).
- `bakery` — Bread and baked goods.
- `beverages` — Soft drinks, sparkling water, juice, ready-to-drink teas.
- `household` — Non-food household consumables (paper towels, detergent).
- `restaurant` — Dine-in or takeout prepared meals and drinks.
- `cafeteria` — Workplace café/coffee bar purchases.
- `gasoline` — Fuel purchases.

Tax assumptions used in the mock data (for realism; not jurisdiction-specific):

- 0%: `produce`, `dairy`, `meat`, `pantry`, `bakery`, `gasoline`.
- ~8%: `household`, many `beverages` (e.g., soda and RTD drinks).
- ~10%: `restaurant`, `cafeteria`.

These rates were applied per line to produce the supplied `sales_tax` values.

## Vendor mapping (heuristic)

Vendors in `receipts-mockup.csv` are plausible names chosen by category:

- Grocery: “Green Valley Market”, “SuperMart”, “Neighborhood Market”, “Town Grocery”.
- Gas: “Shell”, “Chevron”.
- Restaurant: “Burger Hub”, “Napoli Pizzeria”, “Sushi House”, “El Pueblo Taqueria”, “Thai Spice”, “Ramen Corner”, “Marina Seafood Grill”, “Big Smoke BBQ”.
- Cafeteria: “Work Cafeteria”.

This mapping is illustrative; feel free to standardize or replace names as needed.

## Usage examples

SQL-style aggregation from transactions to receipts:

```sql
-- Derive receipt totals by date_time
SELECT
  date_time,
  ROUND(SUM(net_amount), 2) AS total_net,
  ROUND(SUM(sales_tax), 2) AS total_sales
FROM transactions
GROUP BY date_time
ORDER BY date_time;
```

Joining receipts back to transactions on `date_time`:

```sql
SELECT t.*, r.total_net, r.total_sales, r.vendor
FROM transactions t
JOIN receipts r USING (date_time);
```

## Extensibility

- Add `receipt_id` to `receipts-mockup.csv` for a stronger join key when multiple receipts may share identical timestamps.
- Add `store_location` or `payment_method` fields for richer scenarios.
- Introduce discounts (`promo_amount`) if you want subtotal and discount logic.

## Caveats

- All values are synthetic and may not reflect any specific tax regime.
- Totals are computed as sums of rounded line items; minor rounding differences can occur if you recompute tax from totals.

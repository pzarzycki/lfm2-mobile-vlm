export type Receipt = {
  date_time: string;
  receipt_id: string;
  total_net: number;
  total_sales: number;
  vendor: string;
};

export type Transaction = {
  date_time: string;
  receipt_id: string;
  item_name: string;
  item_type: string;
  net_amount: number;
  sales_tax: number;
};

export function parseCsv(text: string): string[][] {
  // minimal CSV parser (no quotes support for simplicity of mock data)
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => line.split(','));
}

export function parseReceipts(text: string): Receipt[] {
  const rows = parseCsv(text);
  const [header, ...body] = rows;
  if (!header) return [];
  const idx = Object.fromEntries(header.map((k, i) => [k, i]));
  return body.map(r => ({
    date_time: r[idx['date_time']],
    receipt_id: r[idx['receipt_id']],
    total_net: Number(r[idx['total_net']]),
    total_sales: Number(r[idx['total_sales']]),
    vendor: r[idx['vendor']],
  }));
}

export function parseTransactions(text: string): Transaction[] {
  const rows = parseCsv(text);
  const [header, ...body] = rows;
  if (!header) return [];
  const idx = Object.fromEntries(header.map((k, i) => [k, i]));
  return body.map(r => ({
    date_time: r[idx['date_time']],
    receipt_id: r[idx['receipt_id']],
    item_name: r[idx['item_name']],
    item_type: r[idx['item_type']],
    net_amount: Number(r[idx['net_amount']]),
    sales_tax: Number(r[idx['sales_tax']]),
  }));
}

export function sumBy<T>(items: T[], pick: (t: T) => number): number {
  return items.reduce((a, b) => a + pick(b), 0);
}

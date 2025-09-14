import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { readCsv } from '../storage/files';
import { parseTransactions } from '../storage/csv';

export default function Reports() {
  const [txText, setTxText] = useState('');
  useEffect(() => { (async () => setTxText(await readCsv('transactions.csv')))(); }, []);
  const txs = useMemo(() => parseTransactions(txText), [txText]);

  // Weekly (last 7 days, matches Dashboard)
  const week = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const sums = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    for (const t of txs) {
      const d = new Date(t.date_time.replace(' ', 'T'));
      if (d >= new Date(sevenDaysAgo.toDateString())) {
        const i = (d.getDay() + 6) % 7;
        sums[i] += t.net_amount + t.sales_tax;
      }
    }
    return labels.map((d, i) => ({ d, v: sums[i] }));
  }, [txs]);
  const weekTotal = useMemo(() => week.reduce((a, b) => a + b.v, 0), [week]);
  const maxWeek = Math.max(...week.map(w => w.v), 1);

  // Top Categories (last 30 days, top 4, with values only)
  const byCategory = useMemo(() => {
    const cutoff = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const map: Record<string, number> = {};
    for (const t of txs) {
      const d = new Date(t.date_time.replace(' ', 'T'));
      if (d >= new Date(cutoff.toDateString())) {
        const amt = t.net_amount + t.sales_tax;
        map[t.item_type] = (map[t.item_type] || 0) + amt;
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [txs]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.desc}>Weekly spending and top categories</Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <Text style={styles.sectionMetric}>${weekTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.chartRow}>
          {week.map((w, i) => (
            <View key={i} style={styles.barWrap}>
              <View style={[styles.bar, { height: 12 + (88 * w.v) / maxWeek }]} />
              <Text style={styles.barLabel}>{w.d}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Categories</Text>
        <View style={styles.grid}>
          {byCategory.map(([name, amt], i) => (
            <View key={i} style={styles.tile}>
              <Text style={styles.tileTitle}>{name}</Text>
              <Text style={styles.tileAmt}>${amt.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7FB', padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  desc: { marginTop: 8, color: '#6B7280' },
  section: { marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionMetric: { color: '#EF4444', fontWeight: '700' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, padding: 8, backgroundColor: 'white', borderRadius: 12 },
  barWrap: { alignItems: 'center', width: `${100 / 7 - 1}%` as any },
  bar: { width: 20, borderRadius: 6, backgroundColor: '#3D6DDF' },
  barLabel: { marginTop: 8, color: '#6B7280', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  tile: { width: '48%', backgroundColor: 'white', borderRadius: 12, padding: 12, elevation: 1 },
  tileTitle: { color: '#374151', fontWeight: '700' },
  tileAmt: { color: '#111827', fontWeight: '800', marginTop: 6 },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { readCsv } from '../storage/files';
import { parseTransactions } from '../storage/csv';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function Reports() {
  const [txText, setTxText] = useState('');
  useEffect(() => { (async () => setTxText(await readCsv('transactions.csv')))(); }, []);
  const txs = useMemo(() => parseTransactions(txText), [txText]);

  // Helpers
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const startOfNextMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

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

  // This Month totals and categories (ALL categories)
  const month = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = startOfNextMonth(now);
    let total = 0;
    const map: Record<string, number> = {};
    for (const t of txs) {
      const d = new Date(t.date_time.replace(' ', 'T'));
      if (d >= start && d < end) {
        const amt = t.net_amount + t.sales_tax;
        total += amt;
        map[t.item_type] = (map[t.item_type] || 0) + amt;
      }
    }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return { total, entries };
  }, [txs]);

  const iconForCategory = useCallback((name: string): string => {
    const n = name.toLowerCase();
    if (/(gas|fuel|gasoline)/.test(n)) return 'local-gas-station';
    if (/(restaurant|dining|food)/.test(n)) return 'restaurant';
    if (/(cafeteria|cafe|coffee)/.test(n)) return 'local-cafe';
    if (/(meat|meal|protein)/.test(n)) return 'set-meal';
    if (/(grocery|supermarket)/.test(n)) return 'local-grocery-store';
    if (/(pantry)/.test(n)) return 'kitchen';
    if (/(produce|vegetable|fruit)/.test(n)) return 'eco';
    if (/(dairy|milk|cheese|yogurt)/.test(n)) return 'breakfast-dining';
    if (/(bakery|bread|bake)/.test(n)) return 'bakery-dining';
    if (/(beverage|drink|juice|soda)/.test(n)) return 'local-drink';
    if (/(transport|bus|metro|subway)/.test(n)) return 'directions-bus';
    if (/(taxi|uber|lyft|ride)/.test(n)) return 'local-taxi';
    if (/(entertainment|movie|cinema)/.test(n)) return 'movie';
    if (/(pharmacy|drug|medicine)/.test(n)) return 'local-pharmacy';
    if (/(electronics|device|phone)/.test(n)) return 'devices';
    return 'category';
  }, []);

  // Month-over-month comparison
  const monthComparison = useMemo(() => {
    const now = new Date();
    const startThis = startOfMonth(now);
    const startNext = startOfNextMonth(now);
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrev = startThis;
    let cur = 0, prev = 0;
    for (const t of txs) {
      const d = new Date(t.date_time.replace(' ', 'T'));
      const amt = t.net_amount + t.sales_tax;
      if (d >= startThis && d < startNext) cur += amt;
      else if (d >= startPrev && d < endPrev) prev += amt;
    }
    const delta = cur - prev;
    const pct = prev > 0 ? (delta / prev) * 100 : 100;
    return { cur, prev, delta, pct };
  }, [txs]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 120 }}>
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <Text style={styles.sectionMetric}>${month.total.toFixed(2)}</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelText}>Spending from the 1st to today.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comparison</Text>
        <View style={styles.panel}>
          <View style={styles.panelRow}>
            <Text style={styles.panelLabel}>This month</Text>
            <Text style={styles.panelValue}>${monthComparison.cur.toFixed(2)}</Text>
          </View>
          <View style={styles.panelRow}>
            <Text style={styles.panelLabel}>Previous month</Text>
            <Text style={styles.panelValue}>${monthComparison.prev.toFixed(2)}</Text>
          </View>
          <View style={styles.panelRow}>
            <Text style={styles.panelLabel}>Change</Text>
            <Text style={[styles.panelValue, monthComparison.delta >= 0 ? styles.deltaUp : styles.deltaDown]}>
              {monthComparison.delta >= 0 ? '+' : ''}${monthComparison.delta.toFixed(2)} ({monthComparison.pct.toFixed(1)}%)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories (This Month)</Text>
        <View style={styles.grid}>
          {month.entries.map(([name, amt], i) => (
            <View key={i} style={styles.tile}>
              <Icon name={iconForCategory(name)} size={72} color="#9CA3AF" style={styles.tileIconBg} />
              <Text style={styles.tileTitle}>{name}</Text>
              <Text style={styles.tileAmt}>${amt.toFixed(1)}</Text>
              <Text style={styles.tilePct}>
                {month.total > 0 ? Math.round((amt / month.total) * 100) : 0}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
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
  tile: { width: '48%', backgroundColor: 'white', borderRadius: 12, padding: 12, elevation: 1, overflow: 'hidden' },
  tileIconBg: { position: 'absolute', right: -6, bottom: -8, opacity: 0.12 },
  tileTitle: { color: '#374151', fontWeight: '700' },
  tileAmt: { color: '#111827', fontWeight: '800', marginTop: 6 },
  tilePct: { color: '#6B7280', marginTop: 2 },
  panel: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginTop: 8 },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  panelLabel: { color: '#6B7280' },
  panelValue: { color: '#111827', fontWeight: '700' },
  panelText: { color: '#6B7280' },
  deltaUp: { color: '#059669' },
  deltaDown: { color: '#DC2626' },
});

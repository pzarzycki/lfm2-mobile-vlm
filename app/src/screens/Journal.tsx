import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { readCsv } from '../storage/files';
import { parseReceipts, parseTransactions } from '../storage/csv';

export default function Journal() {
  const [receiptsText, setReceiptsText] = useState('');
  const [txText, setTxText] = useState('');

  useEffect(() => {
    (async () => {
      setReceiptsText(await readCsv('receipts.csv'));
      setTxText(await readCsv('transactions.csv'));
    })();
  }, []);

  const receipts = useMemo(() => parseReceipts(receiptsText), [receiptsText]);
  const txs = useMemo(() => parseTransactions(txText), [txText]);

  const byReceipt = useMemo(() => {
    const map: Record<string, typeof txs> = {};
    for (const t of txs) {
      (map[t.receipt_id] ||= []).push(t);
    }
    return map;
  }, [txs]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.desc}>Your receipts with line items.</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {receipts.map(r => {
          const items = byReceipt[r.receipt_id] || [];
          return (
            <View key={r.receipt_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.vendor}>{r.vendor}</Text>
                <Text style={styles.total}>${(r.total_net + r.total_sales).toFixed(2)}</Text>
              </View>
              <Text style={styles.meta}>{r.date_time} • {r.receipt_id}</Text>
              <View style={{ height: 8 }} />
              {items.slice(0, 6).map((t, i) => (
                <View key={i} style={styles.row}> 
                  <Text style={styles.itemName} numberOfLines={1}>{t.item_name}</Text>
                  <Text style={styles.itemAmt}>${(t.net_amount + t.sales_tax).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7FB', padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  desc: { marginTop: 8, color: '#6B7280', marginBottom: 12 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendor: { fontWeight: '700', color: '#111827' },
  total: { fontWeight: '800', color: '#111827' },
  meta: { color: '#6B7280', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  itemName: { color: '#374151', flex: 1, paddingRight: 8 },
  itemAmt: { color: '#374151', fontWeight: '600' },
});

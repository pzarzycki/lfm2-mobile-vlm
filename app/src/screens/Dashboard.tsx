import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import { loadModel, prepareBundledModel, startStream } from '../leap';
import type { Msg } from '../leap/types';
import { readCsv } from '../storage/files';
import { parseTransactions, sumBy } from '../storage/csv';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Props = {
  onReceipt?: (summary: string) => void;
};

export default function Dashboard({ onReceipt }: Props) {
  const [modelReady, setModelReady] = useState(false);
  const [status, setStatus] = useState<string>('');
  const loadingRef = useRef(false);

  const ensureModelLoaded = useCallback(async () => {
    if (modelReady || loadingRef.current) return;
    if (Platform.OS !== 'android') return; // Android bridge only for now
    try {
      loadingRef.current = true;
      setStatus('Preparing and loading model...');
      const localPath = await prepareBundledModel('LFM2-VL-1_6B_8da4w.bundle');
      await loadModel(localPath);
      setModelReady(true);
      setStatus('Model ready.');
    } catch (e: any) {
      const msg = e?.message || 'Failed to load model. Please ensure the model bundle is present.';
      setStatus(msg);
      Alert.alert('Model Load Error', msg);
    } finally {
      loadingRef.current = false;
    }
  }, [modelReady]);

  const runScan = useCallback(async (source: 'camera' | 'gallery') => {
    await ensureModelLoaded();

    const pickerOpts: ImagePicker.ImageLibraryOptions & ImagePicker.CameraOptions = {
      mediaType: 'photo',
      includeBase64: true,
      saveToPhotos: false,
    };

    const res =
      source === 'camera'
        ? await ImagePicker.launchCamera(pickerOpts)
        : await ImagePicker.launchImageLibrary(pickerOpts);

    const base64 = res.assets?.[0]?.base64;
    if (!base64) return;

    const msgs: Msg[] = [
      { type: 'image_base64', data: base64, mime: 'image/jpeg' },
      {
        type: 'text',
        text:
          'You are a receipt parser. Extract date, merchant, subtotal, tax, tip, total and top 5 line items (name, qty, price). Return a concise plain-English summary under 80 words.',
      },
    ];

    setStatus('Scanning receipt...');
    let acc = '';
    const stop = await startStream(msgs, {
      onChunk: t => {
        acc += t;
        setStatus(acc);
      },
      onDone: () => {
        stop();
        setStatus(acc || 'Done');
        onReceipt?.(acc);
      },
      onError: e => setStatus(prev => prev + `\n[error] ${e}`),
    });
  }, [ensureModelLoaded, onReceipt]);

  // Load transactions CSV for dashboard summaries
  const [txText, setTxText] = useState('');
  useEffect(() => { (async () => setTxText(await readCsv('transactions.csv')))(); }, []);
  const txs = useMemo(() => parseTransactions(txText), [txText]);

  // Last 7 days spending by weekday label (Mon..Sun) in chronological order
  const weekly = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const sums = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    for (const t of txs) {
      const d = new Date(t.date_time.replace(' ', 'T'));
      if (d >= new Date(sevenDaysAgo.toDateString())) {
        const i = (d.getDay() + 6) % 7; // Mon=0..Sun=6
        sums[i] += t.net_amount + t.sales_tax;
      }
    }
    return labels.map((d, i) => ({ d, v: sums[i] }));
  }, [txs]);
  const maxV = useMemo(() => Math.max(...weekly.map(w => w.v), 1), [weekly]);
  const weekTotal = useMemo(() => weekly.reduce((a, b) => a + b.v, 0), [weekly]);

  // Top 4 categories by amount in the last 30 days with percentages
  const categories = useMemo(() => {
    const cutoff = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const map: Record<string, number> = {};
    for (const t of txs) {
      const d = new Date(t.date_time.replace(' ', 'T'));
      if (d >= new Date(cutoff.toDateString())) {
        const amt = t.net_amount + t.sales_tax;
        map[t.item_type] = (map[t.item_type] || 0) + amt;
      }
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, amt]) => ({ name, amt, pct: Math.round((amt / total) * 100) }));
  }, [txs]);

  const iconForCategory = useCallback((name: string): string => {
    const n = name.toLowerCase();
    // Common app categories
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
    // Other generics
    if (/(transport|bus|metro|subway)/.test(n)) return 'directions-bus';
    if (/(taxi|uber|lyft|ride)/.test(n)) return 'local-taxi';
    if (/(entertainment|movie|cinema)/.test(n)) return 'movie';
    if (/(pharmacy|drug|medicine)/.test(n)) return 'local-pharmacy';
    if (/(electronics|device|phone)/.test(n)) return 'devices';
    return 'category';
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 112 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Private Expense Tracker</Text>
          <Text style={styles.subtitle}>
            Track your spending <Text style={styles.subtitleStrong}>privately</Text> and <Text style={styles.subtitleStrong}>securely</Text> with smart scanner.
          </Text>
          <Text style={[styles.subtitle, { marginTop: 2 }]}>No Internet access needed!</Text>
        </View>

        {/* Scan card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Start Scanning</Text>
          <Text style={styles.cardDesc}>Capture receipts instantly and track your expenses automatically</Text>
          <View style={{ height: 12 }} />
          <View style={styles.row}>
            <PrimaryButton label="Take Photo" icon="photo-camera" onPress={() => runScan('camera')} />
            <View style={{ width: 12 }} />
            <SecondaryButton label="Gallery" icon="photo-library" onPress={() => runScan('gallery')} />
          </View>
          {!!status && (
            <Text style={styles.status} numberOfLines={3}>
              {status}
            </Text>
          )}
        </View>

        {/* Weekly chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <Text style={styles.sectionMetric}>${weekTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.chartRow}>
            {weekly.map((w, i) => (
              <View key={i} style={styles.barWrap}>
                <View style={[styles.bar, { height: 12 + (88 * w.v) / maxV }]} />
                <Text style={styles.barLabel}>{w.d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Categories grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.grid}>
            {categories.map((c, i) => (
              <View key={i} style={styles.tile}>
                {/* Background icon */}
                <Icon
                  name={iconForCategory(c.name)}
                  size={72}
                  color="#9CA3AF"
                  style={styles.tileIconBg}
                />
                <Text style={styles.tileTitle}>{c.name}</Text>
                <Text style={styles.tileAmt}>${c.amt.toFixed(1)}</Text>
                <Text style={styles.tilePct}>{c.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PrimaryButton({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.primaryBtn} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={18} color="#fff" />
        <Text style={styles.primaryBtnTxt}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SecondaryButton({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.secondaryBtn} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={18} color="#3156C8" />
        <Text style={styles.secondaryBtnTxt}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7FB' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: '#4F46E5',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  title: { color: 'white', fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'white', opacity: 0.95, marginTop: 6 },
  subtitleStrong: { color: 'white', fontWeight: '800' },
  card: {
    marginHorizontal: 16,
    marginTop: -12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardDesc: { color: '#6B7280', marginTop: 4 },
  status: { marginTop: 12, color: '#4B5563' },
  row: { flexDirection: 'row' },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#3D6DDF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: 'white', fontWeight: '700' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#E7EEFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnTxt: { color: '#3156C8', fontWeight: '700' },
  section: { marginTop: 20, marginHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionMetric: { color: '#EF4444', fontWeight: '700' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, padding: 8, backgroundColor: 'white', borderRadius: 12 },
  barWrap: { alignItems: 'center', width: `${100 / 7 - 1}%` as any },
  bar: { width: 20, borderRadius: 6, backgroundColor: '#3D6DDF' },
  barLabel: { marginTop: 8, color: '#6B7280', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  tile: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden'
  },
  tileIconBg: { position: 'absolute', right: -6, bottom: -8, opacity: 0.12 },
  tileTitle: { color: '#374151', fontWeight: '700' },
  tileAmt: { color: '#111827', fontWeight: '800', marginTop: 6 },
  tilePct: { color: '#6B7280', marginTop: 2 },
});

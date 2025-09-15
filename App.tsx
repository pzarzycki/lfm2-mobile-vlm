/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme, View, Text, TouchableOpacity } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import Dashboard from './app/src/screens/Dashboard';
import Journal from './app/src/screens/Journal';
import Reports from './app/src/screens/Reports';
import { seedFromAssetsIfMissing } from './app/src/storage/files';
import { areAllModelsDownloaded } from './app/src/storage/model';
import ModelDownloadOverlay from './app/src/screens/ModelDownloadOverlay';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

type TabKey = 'dashboard' | 'journal' | 'reports';

function AppContent() {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [needsModel, setNeedsModel] = useState(false);
  useEffect(() => {
    // Seed starter CSVs on first app open
    seedFromAssetsIfMissing('receipts.csv');
    seedFromAssetsIfMissing('transactions.csv');
    // Check model presence
    (async () => {
      const all = await areAllModelsDownloaded();
      setNeedsModel(!all);
    })();
  }, []);
  const Screen = useMemo(() => {
    switch (tab) {
      case 'journal':
        return Journal;
      case 'reports':
        return Reports;
      case 'dashboard':
      default:
        return Dashboard;
    }
  }, [tab]);

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <Screen />
      </View>
      <BottomTabs value={tab} onChange={setTab} />
      <ModelDownloadOverlay visible={needsModel} onDone={() => setNeedsModel(false)} />
    </View>
  );
}

function BottomTabs({ value, onChange }: { value: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <View style={styles.tabs}>
  <TabButton label="Dashboard" icon="home" active={value === 'dashboard'} onPress={() => onChange('dashboard')} />
  <TabButton label="Journal" icon="receipt" active={value === 'journal'} onPress={() => onChange('journal')} />
  <TabButton label="Reports" icon="bar-chart" active={value === 'reports'} onPress={() => onChange('reports')} />
    </View>
  );
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Icon name={icon} size={20} color={active ? '#4F46E5' : '#6B7280'} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingBottom: 10,
    paddingTop: 8,
    justifyContent: 'space-around',
  },
  tabBtn: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#EEF2FF' },
  tabIcon: { fontSize: 18, color: '#6B7280' },
  tabIconActive: { color: '#4F46E5' },
  tabLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tabLabelActive: { color: '#4F46E5', fontWeight: '700' },
});

export default App;

/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View, Text, TouchableOpacity } from 'react-native';
import Playground from './app/src/screens/Playground';
import React, { useState } from 'react';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [screen, setScreen] = useState<'home' | 'play'>('home');

  if (screen === 'play') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('home')}><Text style={styles.backTxt}>◀ Back</Text></TouchableOpacity>
        <Playground />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NewAppScreen templateFileName="App.tsx" safeAreaInsets={safeAreaInsets} />
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.cta} onPress={() => setScreen('play')}>
          <Text style={styles.ctaTxt}>Open LEAP Playground</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center'
  },
  cta: {
    backgroundColor: '#3D6DDF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    elevation: 2
  },
  ctaTxt: { color: 'white', fontSize: 16, fontWeight: '600' },
  backBtn: { padding: 12 },
  backTxt: { fontSize: 14, color: '#3D6DDF' }
});

export default App;

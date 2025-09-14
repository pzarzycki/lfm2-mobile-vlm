import React, { useState } from 'react';
import { View, Text, Button, ScrollView, Platform, Alert } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import { loadModel, startStream, prepareBundledModel } from '../leap';
import type { Msg } from '../leap/types';

export default function Playground() {
  const [out, setOut] = useState('');

  async function onLoad() {
    if (Platform.OS !== 'android') return;
    try {
  setOut('Preparing bundled model...');
  const localPath = await prepareBundledModel('lfm2-vl-450m.bundle');
  setOut(o => o + `\nCopied to: ${localPath}\nLoading model...`);
  await loadModel(localPath);
  setOut(o => o + '\nModel loaded. Tap "Ask" to run a vision prompt.');
    } catch (e: any) {
      const msg = e?.message || 'Failed to load model. Ensure the bundle exists at /sdcard/Download/lfm2-vl-450m.bundle (push it with adb).';
      setOut(msg);
      Alert.alert('Model Load Error', msg);
    }
  }

  async function onAsk() {
    const img = await ImagePicker.launchImageLibrary({ mediaType: 'photo', includeBase64: true });
    const base64 = img.assets?.[0]?.base64;
    if (!base64) return;

    const msgs: Msg[] = [
      { type: 'image_base64', data: base64, mime: 'image/jpeg' },
      { type: 'text', text: 'Describe the scene briefly.' }
    ];

    setOut('');
    const stop = await startStream(msgs, {
      onChunk: t => setOut(p => p + t),
      onDone: () => stop(),
      onError: e => setOut(p => p + `\n[error] ${e}`)
    });
  }

  async function onAskCamera() {
    const img = await ImagePicker.launchCamera({ mediaType: 'photo', includeBase64: true, saveToPhotos: false });
    const base64 = img.assets?.[0]?.base64;
    if (!base64) return;

    const msgs: Msg[] = [
      { type: 'image_base64', data: base64, mime: 'image/jpeg' },
      { type: 'text', text: 'Describe the scene briefly.' }
    ];

    setOut('');
    const stop = await startStream(msgs, {
      onChunk: t => setOut(p => p + t),
      onDone: () => stop(),
      onError: e => setOut(p => p + `\n[error] ${e}`)
    });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
  <Button title="Load LFM2-VL model (from /Download)" onPress={onLoad} />
      <View style={{ height: 12 }} />
  <Button title="Ask (Gallery)" onPress={onAsk} />
      <View style={{ height: 12 }} />
  <Button title="From Camera" onPress={onAskCamera} />
  <View style={{ height: 12 }} />
      <Text>{out}</Text>
    </ScrollView>
  );
}

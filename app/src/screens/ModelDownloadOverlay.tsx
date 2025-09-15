import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  MODEL_1_6B,
  MODEL_450M,
  downloadLfm2Large,
  downloadLfm2Small,
  isModelDownloaded,
  missingModels,
} from '../storage/model';

type Props = {
  visible: boolean;
  onDone: () => void;
};

export default function ModelDownloadOverlay({ visible, onDone }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [which, setWhich] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If it became visible but model already exists (race), auto close
    if (visible) {
      (async () => {
        const ok = await isModelDownloaded(MODEL_1_6B);
        if (ok) onDone();
      })();
    }
  }, [visible, onDone]);

  const start = async () => {
    setError(null);
    setDownloading(true);
    try {
      const miss = await missingModels();
      // Download small first, then large, if missing
      if (miss.includes(MODEL_450M)) {
        setWhich('LFM2-VL-450M');
        setProgress(0);
        await downloadLfm2Small({ onProgress: setProgress });
      }
      if (miss.includes(MODEL_1_6B)) {
        setWhich('LFM2-VL-1.6B');
        setProgress(0);
        await downloadLfm2Large({ onProgress: setProgress });
      }
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Download failed');
    } finally {
      setDownloading(false);
      setWhich(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="download" size={22} color="#111827" />
            <Text style={styles.title}>Download LFM2-VL models</Text>
          </View>
          <Text style={styles.desc}>
            To continue I need to download local LFM2-VL models. Please click "Continue" to proceed.
          </Text>

          {downloading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.loadingTxt}>
                Downloading {which ?? 'files'}... {progress}%
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} disabled={downloading} onPress={start}>
              <Text style={styles.primaryBtnTxt}>Continue</Text>
            </TouchableOpacity>
          )}

          {!!error && <Text style={styles.err}>{error}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  desc: { color: '#4B5563', marginTop: 8 },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: 'white', fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  loadingTxt: { color: '#111827' },
  err: { color: '#DC2626', marginTop: 10 },
});

import { NativeModules, NativeEventEmitter } from 'react-native';
import { MODEL_450M, MODEL_1_6B, localModelPathOrThrow } from '../storage/model';
import type { Msg } from './types';

const { RNLeap } = NativeModules;
const emitter = new NativeEventEmitter(RNLeap);

type Handlers = {
  onChunk?: (text: string) => void;
  onReasoning?: (text: string) => void;
  onFunctionCalls?: (count: number) => void;
  onDone?: (stats: { tps?: number }) => void;
  onError?: (err: string) => void;
};

export async function loadModel(bundlePath: string) {
  return RNLeap.loadModel(bundlePath);
}
export async function unloadModel() {
  return RNLeap.unloadModel();
}
export async function prepareBundledModel(assetFileName: string) {
  // returns absolute path for later loadModel
  // Both supported models must be present in local models directory
  if (assetFileName === MODEL_450M) {
    return localModelPathOrThrow(MODEL_450M);
  }
  if (assetFileName === MODEL_1_6B) {
    return localModelPathOrThrow(MODEL_1_6B);
  }
  // Unknown name: attempt asset copy as last resort
  return RNLeap.ensureAssetCopied(assetFileName);
}

export async function startStream(messages: Msg[], h: Handlers = {}) {
  const subs = [
    emitter.addListener('leap:chunk', (e: any) => h.onChunk?.(e.text)),
    emitter.addListener('leap:reasoning', (e: any) => h.onReasoning?.(e.text)),
    emitter.addListener('leap:function_calls', (e: any) => h.onFunctionCalls?.(Number(e.count || 0))),
    emitter.addListener('leap:done', (e: any) => h.onDone?.({ tps: e.tps })),
    emitter.addListener('leap:error', (e: any) => h.onError?.(e.error)),
  ];

  const id = await RNLeap.startStream(messages, {});
  return () => { subs.forEach(s => s.remove()); };
}

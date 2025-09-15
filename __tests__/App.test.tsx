/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// Mock only the NativeEventEmitter module to avoid requiring a native module instance
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return function MockNativeEventEmitter() {
    return { addListener: jest.fn(() => ({ remove: jest.fn() })) };
  };
});

// Provide a mock RNLeap native module before importing App
const RN = require('react-native');
RN.NativeModules.RNLeap = {
  loadModel: jest.fn(async () => undefined),
  unloadModel: jest.fn(async () => undefined),
  ensureAssetCopied: jest.fn(async () => '/mock/path/model.bundle'),
  startStream: jest.fn(async () => 'stream-1'),
};

import App from '../App';

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ assets: [] })),
  launchImageLibrary: jest.fn(async () => ({ assets: [] })),
}));

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

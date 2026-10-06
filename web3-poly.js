import { Buffer } from 'buffer';
import nacl from 'tweetnacl';

global.Buffer = global.Buffer || Buffer;
global.process = global.process || require('process');

// Полифил crypto.getRandomValues для Solana Web3
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = function (array) {
    const bytes = nacl.randomBytes(array.length);
    for (let i = 0; i < array.length; i++) {
      array[i] = bytes[i];
    }
    return array;
  };
}

// Заглушка для TurboModules
try {
  const RN = require('react-native');
  if (RN.TurboModuleRegistry) {
    const orig = RN.TurboModuleRegistry.getEnforcing;
    RN.TurboModuleRegistry.getEnforcing = function (name) {
      if (name === 'QuickBase64' || name === 'QuickCrypto') {
        return {
          byteLength: (str) => Buffer.from(str, 'base64').length,
          btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
          atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
          toByteArray: (b64) => new Uint8Array(Buffer.from(b64, 'base64')),
          fromByteArray: (uint8) => Buffer.from(uint8).toString('base64'),
          getRandomBytes: (size) => nacl.randomBytes(size),
        };
      }
      return orig(name);
    };
  }
} catch (e) {}
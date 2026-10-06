import { decode, encode } from 'base-64';

const byteArrayToBase64 = (byteArray) => {
  let binary = '';
  const len = byteArray.byteLength || byteArray.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(byteArray[i]);
  }
  return encode(binary);
};

const base64ToByteArray = (b64) => {
  const binary = decode(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export function byteLength(b64) {
  return base64ToByteArray(b64).length;
}

export function btoa(data) {
  return encode(data);
}

export function atob(b64) {
  return decode(b64);
}

export function toByteArray(b64) {
  return base64ToByteArray(b64);
}

export function fromByteArray(uint8) {
  return byteArrayToBase64(uint8);
}

export default {
  byteLength,
  btoa,
  atob,
  toByteArray,
  fromByteArray,
};
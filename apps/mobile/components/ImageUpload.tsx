import { createElement, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { secureStorage } from '../lib/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Cover-image picker for the post create/edit forms.
 *
 * On web (the build deployed to Netlify) it renders a hidden HTML
 * <input type="file"> via React.createElement, which react-native-web passes
 * through to react-dom. On native it falls back to a message — the project
 * does not currently depend on expo-image-picker.
 */
export function ImageUpload({
  value,
  onChange,
  label = 'Cover image',
  disabled,
}: ImageUploadProps) {
  const inputRef = useRef<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image is larger than 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const token = await secureStorage.getItem('accessToken');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'covers');
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url) {
        setError(json.error ?? `Upload failed (HTTP ${res.status})`);
        return;
      }
      onChange(json.url);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current && 'value' in inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  const openPicker = () => {
    if (Platform.OS === 'web' && inputRef.current?.click) {
      inputRef.current.click();
    }
  };

  const handleRemove = () => {
    setError(null);
    onChange(null);
  };

  // Hidden <input type="file"> — web only. createElement bypasses RN's
  // intrinsic-element checks; react-native-web forwards it to react-dom.
  const hiddenInput =
    Platform.OS === 'web'
      ? createElement('input', {
          ref: inputRef,
          type: 'file',
          accept: ACCEPT,
          style: { display: 'none' },
          onChange: (e: any) => {
            const file = e?.target?.files?.[0];
            if (file) void uploadFile(file);
          },
        })
      : null;

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.nativeHint}>
          Image upload is currently available in the web version of BlogHub.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      {value ? (
        <View>
          <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={openPicker}
              disabled={disabled || uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#374151" />
              ) : (
                <Text style={styles.btnGhostText}>Replace</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={handleRemove}
              disabled={disabled || uploading}
            >
              <Text style={styles.btnDangerText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.dropzone}
          onPress={openPicker}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.dropzoneText}>
              Click to upload (JPG, PNG, WebP, GIF — up to 5 MB)
            </Text>
          )}
        </TouchableOpacity>
      )}

      {hiddenInput}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  preview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  dropzoneText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  btnGhostText: { color: '#374151', fontWeight: '600' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnDangerText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b91c1c', marginTop: 8, fontSize: 13 },
  nativeHint: { color: '#6b7280', fontSize: 13 },
});

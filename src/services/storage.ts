import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

export const uploadImage = async (uri: string, bucket: string = 'shop-images') => {
  try {
    const fileName = `${Date.now()}.jpg`;
    let fileBody;

    // 1. Handle Web vs Mobile differences
    if (Platform.OS === 'web') {
      // WEB: Fetch the blob directly from the URI
      const response = await fetch(uri);
      fileBody = await response.blob();
    } else {
      // MOBILE: Read file as Base64 using FileSystem
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      fileBody = decode(base64);
    }

    // 2. Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBody, {
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    // 3. Get the Public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};
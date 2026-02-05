import { supabase } from './supabase';
// import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer'; // Ensure this package is installed
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export const uploadImage = async (uri: string, bucket: string = 'shop-images') => {
  try {
    const ext = uri.substring(uri.lastIndexOf('.') + 1);
    const fileName = `${Date.now()}.${ext}`;

    // 1. Read the file into memory
    // We use the string literal 'base64' to avoid the "Property 'Base64' of undefined" error
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64', 
    });

    // 2. Convert Base64 string to ArrayBuffer (Raw Binary)
    // This bypasses the Android FormData network issues entirely.
    const fileData = decode(base64);

    // 3. Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      });

    if (error) {
      console.log("Supabase Storage Error:", error);
      throw error;
    }

    // 4. Get the Public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;

  } catch (error) {
    console.error("Upload Logic Error:", error);
    throw error;
  }
};
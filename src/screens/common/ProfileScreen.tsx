import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, Avatar } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../services/storage';

export default function ProfileScreen() {
  const { userProfile, signOut, isBarber } = useAuth();
  
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Barber Only Fields
  const [shopName, setShopName] = useState('');
  const [shopImage, setShopImage] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [userProfile]);

  const loadProfile = async () => {
    if (!userProfile) return;
    setFullName(userProfile.full_name || '');
    setPhone(userProfile.phone || '');
    setAvatarUrl(userProfile?.avatar_url ?? null);

    if (isBarber) {
      const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', userProfile.id)
        .single();
        
      if (shop) {
        setShopName(shop.shop_name);
        setShopImage(shop.image_url); // <--- Now correctly loading from DB
      }
    }
  };

  const pickImage = async (type: 'avatar' | 'shop') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9], 
      quality: 0.5,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        const publicUrl = await uploadImage(result.assets[0].uri);
        
        // FIX: We ONLY update local state here. We DO NOT save to DB yet.
        if (type === 'avatar') {
            setAvatarUrl(publicUrl);
        } else {
            setShopImage(publicUrl);
        }
      } catch (error: any) {
        Alert.alert("Upload Failed", error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    // 1. Update User Profile (Including Avatar)
    const { error: profileError } = await supabase.from('profiles').update({
        full_name: fullName,
        phone: phone,
        avatar_url: avatarUrl // <--- Saving Avatar here now
    }).eq('id', userProfile?.id);

    if (profileError) {
        setLoading(false);
        Alert.alert("Error", profileError.message);
        return;
    }

    // 2. Update Shop Details (Including Banner)
    if (isBarber) {
        const { error: shopError } = await supabase.from('shops').update({ 
            shop_name: shopName,
            image_url: shopImage // <--- Saving Banner here now
        }).eq('owner_id', userProfile?.id);

        if (shopError) {
            setLoading(false);
            Alert.alert("Error", shopError.message);
            return;
        }
    }

    setLoading(false);
    Alert.alert("Success", "Profile updated successfully!");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 50}}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Profile</Text>
        <Button onPress={signOut} textColor={Colors.error}>Logout</Button>
      </View>

      <View style={styles.form}>
        {/* AVATAR UPLOAD */}
        <View style={{alignItems: 'center', marginBottom: 20}}>
            <TouchableOpacity onPress={() => pickImage('avatar')}>
                {avatarUrl ? (
                    <Avatar.Image size={100} source={{ uri: avatarUrl }} />
                ) : (
                    <Avatar.Icon size={100} icon="camera" backgroundColor="#eee" color="gray" />
                )}
                <Text style={{color: Colors.primary, marginTop: 5}}>Change Photo</Text>
            </TouchableOpacity>
        </View>

        <TextInput label="Full Name" value={fullName} onChangeText={setFullName} style={styles.input} />
        <TextInput label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />

        {isBarber && (
            <>
                <Text style={styles.sectionTitle}>Shop Details</Text>
                <TextInput label="Shop Name" value={shopName} onChangeText={setShopName} style={styles.input} />
                
                <Text style={{marginBottom: 5, color: 'gray'}}>Shop Banner</Text>
                <TouchableOpacity onPress={() => pickImage('shop')} style={styles.shopBannerBtn}>
                    {shopImage ? (
                        <Image source={{ uri: shopImage }} style={styles.shopBanner} />
                    ) : (
                        <View style={styles.shopBannerPlaceholder}>
                            <Text>+ Upload Shop Banner</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </>
        )}

        <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={loading} 
            buttonColor={Colors.primary}
            style={{marginTop: 20}}
        >
            Save Changes
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' },
  title: { fontSize: 24, fontWeight: 'bold' },
  form: { padding: 20 },
  input: { marginBottom: 15, backgroundColor: 'white' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  shopBannerBtn: { height: 150, borderRadius: 10, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  shopBanner: { width: '100%', height: '100%' },
  shopBannerPlaceholder: { width: '100%', height: '100%', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }
});
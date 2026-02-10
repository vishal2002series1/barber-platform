import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { Text, TextInput, Button, Avatar, Chip, Surface, Switch } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../services/storage';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function ProfileScreen() {
  const { userProfile, signOut, isBarber } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Basic Info
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Barber: Shop Info
  const [shopName, setShopName] = useState('');
  const [shopImage, setShopImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, long: number} | null>(null);

  // Barber: Schedule
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [offDays, setOffDays] = useState<number[]>([]); // 0=Sun, 1=Mon...

  useEffect(() => {
    loadProfile();
  }, [userProfile]);

  const loadProfile = async () => {
    if (!userProfile) return;
    setFullName(userProfile.full_name || '');
    setPhone(userProfile.phone || '');
    setAvatarUrl(userProfile.avatar_url || null);

    if (isBarber) {
      const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', userProfile.id)
        .single();
        
      if (shop) {
        setShopName(shop.shop_name);
        setShopImage(shop.image_url);
        if (shop.latitude && shop.longitude) {
            setLocation({ lat: shop.latitude, long: shop.longitude });
        }
        // Load Schedule
        if (shop.opening_time) setOpenTime(shop.opening_time.slice(0, 5)); // HH:MM
        if (shop.closing_time) setCloseTime(shop.closing_time.slice(0, 5));
        if (shop.weekly_off_days) setOffDays(shop.weekly_off_days);
      }
    }
  };

  const pickImage = async (type: 'avatar' | 'shop') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: type === 'avatar' ? [1, 1] : [16, 9], quality: 0.5,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        const publicUrl = await uploadImage(result.assets[0].uri);
        if (type === 'avatar') setAvatarUrl(publicUrl);
        else setShopImage(publicUrl);
      } catch (error: any) {
        Alert.alert("Upload Failed", error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const getLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert("Permission Denied"); return; }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, long: loc.coords.longitude });
    } catch (e) { Alert.alert("Error", "Could not fetch location"); }
    finally { setLoading(false); }
  };

  const toggleDay = (dayIndex: number) => {
    if (offDays.includes(dayIndex)) {
        setOffDays(offDays.filter(d => d !== dayIndex));
    } else {
        setOffDays([...offDays, dayIndex]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    // 1. Profile Update
    const { error: profileError } = await supabase.from('profiles').update({
        full_name: fullName, phone: phone, avatar_url: avatarUrl 
    }).eq('id', userProfile?.id);

    if (profileError) { setLoading(false); Alert.alert("Error", profileError.message); return; }

    // 2. Shop Update (Barber)
    if (isBarber) {
        const { error: shopError } = await supabase.from('shops').update({ 
            shop_name: shopName,
            image_url: shopImage,
            latitude: location?.lat,
            longitude: location?.long,
            opening_time: openTime,
            closing_time: closeTime,
            weekly_off_days: offDays
        }).eq('owner_id', userProfile?.id);

        if (shopError) { setLoading(false); Alert.alert("Error", shopError.message); return; }
    }

    setLoading(false);
    Alert.alert("Success", "Profile updated successfully!");
  };

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 50}}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Profile</Text>
        <Button onPress={signOut} textColor={Colors.error}>Logout</Button>
      </View>

      <View style={styles.form}>
        {/* Avatar */}
        <View style={{alignItems: 'center', marginBottom: 20}}>
            <TouchableOpacity onPress={() => pickImage('avatar')}>
                {avatarUrl ? <Avatar.Image size={100} source={{ uri: avatarUrl }} /> : <Avatar.Icon size={100} icon="camera" backgroundColor="#eee" />}
                <Text style={{color: Colors.primary, marginTop: 5}}>Change Photo</Text>
            </TouchableOpacity>
        </View>

        <TextInput label="Full Name" value={fullName} onChangeText={setFullName} style={styles.input} mode="outlined"/>
        <TextInput label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} mode="outlined"/>

        {isBarber && (
            <>
                <Text style={styles.sectionTitle}>Shop Details</Text>
                <TextInput label="Shop Name" value={shopName} onChangeText={setShopName} style={styles.input} mode="outlined"/>
                
                <TouchableOpacity onPress={() => pickImage('shop')} style={styles.shopBannerBtn}>
                    {shopImage ? <Image source={{ uri: shopImage }} style={styles.shopBanner} /> : <Text>+ Upload Banner</Text>}
                </TouchableOpacity>

                {/* --- SCHEDULE --- */}
                <Text style={styles.sectionTitle}>Shop Schedule (IST)</Text>
                <View style={{flexDirection: 'row', gap: 10, marginBottom: 15}}>
                    <TextInput label="Opens (HH:MM)" value={openTime} onChangeText={setOpenTime} style={{flex:1}} mode="outlined" placeholder="09:00"/>
                    <TextInput label="Closes (HH:MM)" value={closeTime} onChangeText={setCloseTime} style={{flex:1}} mode="outlined" placeholder="21:00"/>
                </View>

                <Text style={{marginBottom: 10}}>Weekly Off Days</Text>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
                    {days.map((d, i) => (
                        <TouchableOpacity 
                            key={i} 
                            onPress={() => toggleDay(i)}
                            style={[
                                styles.dayCircle, 
                                offDays.includes(i) ? {backgroundColor: Colors.error} : {backgroundColor: '#f0f0f0'}
                            ]}
                        >
                            <Text style={{color: offDays.includes(i) ? 'white' : 'black', fontWeight: 'bold'}}>{d}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* --- LOCATION MAP --- */}
                <Text style={styles.sectionTitle}>Location</Text>
                {!location ? (
                    <Button mode="contained" onPress={getLocation} buttonColor={Colors.secondary}>Get Location</Button>
                ) : (
                    <View style={styles.mapContainer}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.map}
                            region={{
                                latitude: location.lat,
                                longitude: location.long,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            }}
                        >
                            <Marker
                                coordinate={{ latitude: location.lat, longitude: location.long }}
                                draggable
                                title="My Shop"
                                onDragEnd={(e) => setLocation({ 
                                    lat: e.nativeEvent.coordinate.latitude, 
                                    long: e.nativeEvent.coordinate.longitude 
                                })}
                            />
                        </MapView>
                        <Text style={styles.mapHint}>Long press & drag pin to adjust</Text>
                    </View>
                )}
            </>
        )}

        <Button mode="contained" onPress={handleSave} loading={loading} buttonColor={Colors.primary} style={{marginTop: 30, paddingVertical: 5}}>
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  shopBannerBtn: { height: 150, borderRadius: 10, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  shopBanner: { width: '100%', height: '100%' },
  
  dayCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  mapContainer: { height: 250, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  map: { width: '100%', height: '100%' },
  mapHint: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: 5, borderRadius: 5, fontSize: 12 }
});
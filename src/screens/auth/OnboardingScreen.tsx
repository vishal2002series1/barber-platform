import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, ProgressBar, Portal, Modal, Chip, Avatar } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { uploadImage } from '../../services/storage'; // Add this

export default function OnboardingScreen() {
  const { userProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 

  // --- FORM STATE ---
  const [role, setRole] = useState<'customer' | 'barber'>('customer');
  const [phone, setPhone] = useState('');
  
  // Shop State
  const [shopName, setShopName] = useState('');
  const [shopImage, setShopImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, long: number} | null>(null);

  // Services State
  const [services, setServices] = useState<{name: string, price: string, duration: string}[]>([]);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const [tempDuration, setTempDuration] = useState('30');

  // --- 1. BULLETPROOF IMAGE UPLOAD (Fixes Base64 Error) ---
  // --- 1. BULLETPROOF IMAGE UPLOAD (Actually works on Android) ---
// const uploadImageRobust = async (uri: string): Promise<string> => {
//     const ext = uri.substring(uri.lastIndexOf('.') + 1);
//     const fileName = `${Date.now()}.${ext}`;
  
//     try {
//       console.log("Starting upload for:", uri);
  
//       // Method 1: XMLHttpRequest (Most reliable on Android)
//       const blob = await new Promise<Blob>((resolve, reject) => {
//         const xhr = new XMLHttpRequest();
//         xhr.onload = function() {
//           resolve(xhr.response);
//         };
//         xhr.onerror = function(e) {
//           console.log("XHR Error:", e);
//           reject(new TypeError('Network request failed'));
//         };
//         xhr.responseType = 'blob';
//         xhr.open('GET', uri, true);
//         xhr.send(null);
//       });
  
//       console.log("Blob created, size:", blob.size);
  
//       // 2. Upload to Supabase
//       const { data, error } = await supabase.storage
//         .from('avatars')
//         .upload(fileName, blob, {
//           contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
//           upsert: false
//         });
  
//       if (error) {
//         console.log("Supabase error:", error);
//         throw error;
//       }
  
//       console.log("Upload successful:", data);
  
//       // 3. Get Public URL
//       const { data: urlData } = supabase.storage
//         .from('avatars')
//         .getPublicUrl(fileName);
  
//       console.log("Public URL:", urlData.publicUrl);
//       return urlData.publicUrl;
  
//     } catch (error: any) {
//       console.error("Upload Logic Error:", error);
//       throw error;
//     }
//   }; 

  const pickShopImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.5,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        // USE THE FIXED SERVICE HERE
        const url = await uploadImage(result.assets[0].uri, 'shop-images'); 
        setShopImage(url);
      } catch (e: any) { 
        Alert.alert("Upload Failed", e.message || "Could not upload image."); 
      } finally { 
        setLoading(false); 
      }
    }
  };

  // --- 2. LOCATION ---
  const getInitialLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location is required for barbers.");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, long: loc.coords.longitude });
    } catch (e: any) {
      Alert.alert("Error", "Could not fetch location.");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. SERVICES LOGIC ---
  const addService = () => {
    if (!tempName || !tempPrice) { Alert.alert("Missing Info", "Name and Price required."); return; }
    setServices([...services, { name: tempName, price: tempPrice, duration: tempDuration }]);
    setServiceModalVisible(false);
  };

  const removeService = (index: number) => {
    const newServices = [...services];
    newServices.splice(index, 1);
    setServices(newServices);
  };

  // --- 4. SUBMIT VIA RPC ---
  const finishOnboarding = async () => {
    if (role === 'barber' && services.length < 3) {
      Alert.alert("Wait!", "Please add at least 3 services to continue.");
      return;
    }

    setLoading(true);
    try {
      const servicesJson = role === 'barber' ? services.map(s => ({
        name: s.name,
        price: parseFloat(s.price),
        duration: parseInt(s.duration)
      })) : null;

      const { error } = await supabase.rpc('complete_onboarding', {
        p_role: role,
        p_phone: phone,
        p_shop_name: shopName || null,
        p_shop_image: shopImage || null,
        p_lat: location?.lat || null,
        p_long: location?.long || null,
        p_services: servicesJson
      });

      if (error) throw error;
      
      // SUCCESS: Alert the user and then Sign Out to force them back to Login
      Alert.alert(
        "Setup Complete", 
        "Your profile is ready! Please login again to start using the app.",
        [{ text: "OK", onPress: () => signOut() }] // This clears the session and closes the screen
      );

    } catch (error: any) {
      Alert.alert("Setup Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!phone.trim()) { Alert.alert("Required", "Phone number is required."); return; }
      if (role === 'customer') { finishOnboarding(); } else { setStep(2); }
    } else if (step === 2) {
      if (!shopName.trim() || !location) { Alert.alert("Required", "Shop Name and Location are required."); return; }
      setStep(3);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        
        <View style={{ marginTop: 50, marginBottom: 20 }}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Let's set up your profile.</Text>
          <ProgressBar progress={step / 3} color={Colors.primary} style={{ marginTop: 20, height: 6, borderRadius: 3 }} />
        </View>

        {/* STEP 1 */}
        {step === 1 && (
          <View>
            <Text style={styles.label}>I am a...</Text>
            <SegmentedButtons
              value={role}
              onValueChange={(val) => setRole(val as any)}
              buttons={[
                { value: 'customer', label: 'Customer', icon: 'account' },
                { value: 'barber', label: 'Barber', icon: 'content-cut' },
              ]}
              style={{ marginBottom: 20 }}
            />
            <TextInput label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" mode="outlined" style={styles.input} />
          </View>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <View>
            <Text style={styles.label}>Shop Details</Text>
            <TextInput label="Shop Name" value={shopName} onChangeText={setShopName} mode="outlined" style={styles.input} />
            <TouchableOpacity onPress={pickShopImage} style={styles.imageBtn}>
               {shopImage ? (
                 <Image source={{ uri: shopImage }} style={{ width: '100%', height: '100%' }} />
               ) : (
                 <View style={{alignItems: 'center'}}>
                    <Avatar.Icon size={50} icon="camera" style={{backgroundColor: '#ddd'}} />
                    <Text style={{ color: 'gray', marginTop: 10 }}>+ Upload Shop Banner</Text>
                 </View>
               )}
            </TouchableOpacity>

            <Text style={styles.label}>Shop Location</Text>
            {!location ? (
               <Button mode="contained" onPress={getInitialLocation} loading={loading} buttonColor={Colors.secondary} icon="map-marker">
                 Get Current Location
               </Button>
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
                        title="Your Shop"
                        onDragEnd={(e) => setLocation({ 
                            lat: e.nativeEvent.coordinate.latitude, 
                            long: e.nativeEvent.coordinate.longitude 
                        })}
                    />
                  </MapView>
                  <Text style={styles.mapHint}>📍 Drag pin to adjust</Text>
              </View>
            )}
          </View>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <View>
            <Text style={styles.label}>Add Services (Min 3)</Text>
            <Text style={{color:'gray', marginBottom:15}}>You need {Math.max(0, 3 - services.length)} more.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {services.map((s, index) => (
                <Chip 
                  key={index} 
                  onClose={() => removeService(index)} 
                  style={{backgroundColor: '#E0E0E0'}}
                  textStyle={{ color: 'black' }} // FIX: VISIBLE TEXT
                  icon="content-cut"
                >
                  {s.name} (${s.price})
                </Chip>
              ))}
            </View>
            <Button mode="outlined" onPress={() => {
                setTempName(''); setTempPrice(''); setTempDuration('30'); setServiceModalVisible(true);
            }} icon="plus">
                Add Service
            </Button>
          </View>
        )}

        <View style={{ marginTop: 40 }}>
          <Button 
            mode="contained" 
            onPress={step === 3 || (step === 1 && role === 'customer') ? finishOnboarding : handleNext}
            loading={loading}
            buttonColor={Colors.primary}
            contentStyle={{ height: 50 }}
          >
            {step === 3 || (step === 1 && role === 'customer') ? "Finish Setup" : "Next"}
          </Button>
          {step > 1 && <Button onPress={() => setStep(step - 1)} style={{ marginTop: 10 }}>Back</Button>}
          <Button onPress={signOut} textColor="gray" style={{ marginTop: 20 }}>Logout</Button>
        </View>

      </ScrollView>

      <Portal>
        <Modal visible={serviceModalVisible} onDismiss={() => setServiceModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 15}}>Add Service</Text>
          <TextInput label="Service Name" value={tempName} onChangeText={setTempName} mode="outlined" style={styles.input} />
          <View style={{flexDirection: 'row', gap: 10}}>
             <TextInput label="Price ($)" value={tempPrice} onChangeText={setTempPrice} keyboardType="numeric" mode="outlined" style={[styles.input, {flex: 1}]} />
             <TextInput label="Duration (min)" value={tempDuration} onChangeText={setTempDuration} keyboardType="numeric" mode="outlined" style={[styles.input, {flex: 1}]} />
          </View>
          <Button mode="contained" onPress={addService} style={{marginTop: 10}} buttonColor={Colors.primary}>Add to List</Button>
        </Modal>
      </Portal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.primary },
  subtitle: { fontSize: 18, color: 'gray' },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  input: { marginBottom: 15, backgroundColor: 'white' },
  imageBtn: { height: 180, backgroundColor: '#f0f0f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  mapContainer: { height: 250, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  map: { width: '100%', height: '100%' },
  mapHint: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: 5, borderRadius: 5, overflow: 'hidden', fontSize: 12 },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 12 }
});
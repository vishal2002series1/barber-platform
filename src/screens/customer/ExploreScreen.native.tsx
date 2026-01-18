import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Alert, TouchableOpacity, FlatList, Image } from 'react-native';
import { Text, Searchbar, ActivityIndicator, FAB, Card, Chip, IconButton } from 'react-native-paper';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map'); // TOGGLE STATE
  
  // Default to a central location (e.g., Lucknow or San Francisco) if GPS fails
  const [userLocation, setUserLocation] = useState({
    latitude: 26.8467, 
    longitude: 80.9462,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    fetchLocation();
    fetchShops();
  }, []);

  const fetchLocation = async () => {
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
           console.log("Location permission denied");
           return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
    } catch (err) {
        console.log("Error getting location:", err);
    }
  };

  const fetchShops = async () => {
    // 1. CLEAN QUERY (No comments inside string)
    console.log("Fetching shops...");
    const { data, error } = await supabase
      .from('shops')
      .select(`
        id, 
        shop_name, 
        is_open,
        image_url,
        latitude,
        longitude,
        profiles:owner_id ( full_name ) 
      `);
      
    if (error) {
      console.error("Error fetching shops:", error.message);
      Alert.alert("Error", "Could not load shops.");
    } else if (data) {
      console.log(`Found ${data.length} shops.`);
      setShops(data);
    }
    setLoading(false);
  };

  const handleShopPress = (shop: any) => {
    navigation.navigate('Booking', { shopId: shop.id, shopName: shop.shop_name });
  };

  // --- RENDER MAP VIEW ---
  const renderMap = () => (
    <MapView
      style={styles.map}
      provider={PROVIDER_DEFAULT} 
      region={userLocation}
      showsUserLocation={true}
      showsMyLocationButton={true}
    >
      {shops.map((shop) => (
        shop.latitude && shop.longitude ? (
          <Marker
            key={shop.id}
            coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
            title={shop.shop_name}
          >
            <Callout onPress={() => handleShopPress(shop)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{shop.shop_name}</Text>
                <Text style={{ color: Colors.primary }}>Tap to Book</Text>
              </View>
            </Callout>
          </Marker>
        ) : null
      ))}
    </MapView>
  );

  // --- RENDER LIST VIEW ---
  const renderList = () => (
    <FlatList
      data={shops}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleShopPress(item)}>
          <Card style={styles.card}>
            <Card.Cover source={{ uri: item.image_url || 'https://placehold.co/600x400/1A1A1A/FFF?text=Barber+Shop' }} />
            <Card.Content style={styles.cardContent}>
              <View>
                <Text style={styles.shopName}>{item.shop_name}</Text>
                <Text style={styles.ownerName}>{item.profiles?.full_name}</Text>
              </View>
              <Chip icon={item.is_open ? "check" : "clock"} textStyle={{fontSize: 12}}>
                {item.is_open ? "Open" : "Closed"}
              </Chip>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      )}
    />
  );

  return (
    <View style={styles.container}>
      {/* HEADER WITH TOGGLE */}
      <View style={styles.header}>
        <Searchbar
          placeholder="Search shops..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <IconButton 
            icon={viewMode === 'map' ? "format-list-bulleted" : "map"} 
            mode="contained"
            containerColor={Colors.primary}
            iconColor="white"
            size={24}
            style={{marginLeft: 10}}
            onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
        />
      </View>

      {/* CONTENT */}
      {loading ? (
        <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} />
      ) : viewMode === 'map' ? (
        renderMap()
      ) : (
        renderList()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
    paddingTop: 50, // Safe area for notch
    backgroundColor: 'white', 
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4
  },
  searchBar: { flex: 1, borderRadius: 10, backgroundColor: '#f4f4f4', height: 45 },
  
  // Map Styles
  map: { width: Dimensions.get('window').width, flex: 1 },
  callout: { width: 140, padding: 5, alignItems: 'center' },
  calloutTitle: { fontWeight: 'bold', marginBottom: 5 },

  // List Styles
  card: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: 'white', elevation: 2 },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  shopName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  ownerName: { color: 'gray', fontSize: 14 },
});
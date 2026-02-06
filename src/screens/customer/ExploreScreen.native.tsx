import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Alert, TouchableOpacity, FlatList } from 'react-native';
import { Text, Searchbar, ActivityIndicator, Card, Chip, IconButton } from 'react-native-paper';
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
  // const [viewMode, setViewMode] = useState<'map' | 'list'>('map'); 
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list'); // Changed from 'map' to 'list'
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Default Map Region (Central View)
  const [userLocation, setUserLocation] = useState({
    latitude: 26.8467, 
    longitude: 80.9462,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    initializeExplore();
  }, []);

  const initializeExplore = async () => {
    try {
        // 1. Ask Permission
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
           console.log("Permission denied. Showing standard list.");
           fetchShopsFallback(); // Fallback if no location
           return;
        }

        // 2. Get Coords
        setPermissionGranted(true);
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        setUserLocation({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });

        // 3. Call The "Nearby Engine" (RPC)
        fetchNearbyShops(latitude, longitude);

    } catch (err) {
        console.log("Error init explore:", err);
        fetchShopsFallback();
    }
  };

  // const fetchNearbyShops = async (lat: number, long: number) => {
  //   console.log("Fetching nearby shops...");
    
  //   // CALLING YOUR NEW DATABASE FUNCTION
  //   const { data, error } = await supabase.rpc('get_nearby_shops', {
  //       user_lat: lat, 
  //       user_long: long
  //   });

  //   if (error) {
  //       console.error("RPC Error:", error);
  //       Alert.alert("Error", "Could not load nearby shops.");
  //   } else if (data) {
  //       setShops(data);
  //   }
  //   setLoading(false);
  // };
  const fetchNearbyShops = async (lat: number, long: number) => {
    console.log("Fetching nearby shops...");
    
    const { data, error } = await supabase.rpc('get_nearby_shops', {
        user_lat: lat, 
        user_long: long
    });
  
    if (error) {
        console.error("RPC Error:", error);
        Alert.alert("Error", "Could not load nearby shops.");
    } else if (data) {
        // Filter shops within 10km
        const within10km = data.filter((shop: any) => shop.dist_meters && shop.dist_meters <= 10000);
        
        // If less than 10 shops within 10km, show 10 nearest shops
        const finalShops = within10km.length > 0 ? within10km : data.slice(0, 10);
        
        setShops(finalShops);
    }
    setLoading(false);
  };

  const fetchShopsFallback = async () => {
    // Standard fetch if GPS fails (Sorted by best rating)
    const { data, error } = await supabase
      .from('shops')
      .select('id, shop_name, is_open, image_url, latitude, longitude, rating, review_count, profiles:owner_id(full_name)')
      .order('rating', { ascending: false }); // Show best shops first
      
    if (data) setShops(data);
    if (error) Alert.alert("Error", "Could not load shops.");
    setLoading(false);
  };

  const handleShopPress = (shop: any) => {
    navigation.navigate('Booking', { shopId: shop.id, shopName: shop.shop_name });
  };

  // Helper: Format Distance
  const getDistanceLabel = (meters?: number) => {
      if (!meters) return null;
      if (meters < 1000) return `${Math.round(meters)}m`;
      return `${(meters / 1000).toFixed(1)} km`;
  };

  // --- RENDER MAP VIEW ---
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
  description={`⭐ ${shop.rating ? shop.rating.toFixed(1) : "New"} ${shop.dist_meters ? `• ${getDistanceLabel(shop.dist_meters)} away` : ""}`}
  onCalloutPress={() => handleShopPress(shop)}
/>
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
              
              {/* Left Side: Name & Location */}
              <View style={{flex: 1}}>
                <Text style={styles.shopName}>{item.shop_name}</Text>
                
                {/* Rating Row */}
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                    <MaterialCommunityIcons name="star" size={16} color="#FFB100" />
                    <Text style={{fontWeight: 'bold', marginLeft: 4, marginRight: 10}}>
                        {item.rating ? item.rating.toFixed(1) : "New"}
                        <Text style={{color: 'gray', fontWeight: 'normal'}}> ({item.review_count || 0})</Text>
                    </Text>
                </View>

                {/* Distance Badge */}
                {item.dist_meters && (
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                        <MaterialCommunityIcons name="map-marker-radius" size={14} color={Colors.primary} />
                        <Text style={{color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginLeft: 2}}>
                            {getDistanceLabel(item.dist_meters)} away
                        </Text>
                    </View>
                )}
              </View>

              {/* Right Side: Status Chip */}
              <Chip 
                icon={item.is_open ? "check" : "clock"} 
                textStyle={{fontSize: 12}}
                style={{backgroundColor: item.is_open ? '#E6FFFA' : '#FFF5F5'}}
              >
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
      {/* HEADER */}
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
    flexDirection: 'row', alignItems: 'center', 
    padding: 10, paddingTop: 50, 
    backgroundColor: 'white', zIndex: 10, elevation: 4 
  },
  searchBar: { flex: 1, borderRadius: 10, backgroundColor: '#f4f4f4', height: 45 },
  
  // Map Styles
  map: { width: Dimensions.get('window').width, flex: 1 },
  // callout: { width: 150, padding: 5, alignItems: 'center' },
  // calloutTitle: { fontWeight: 'bold', marginBottom: 2 },

  // calloutContainer: {
  //   backgroundColor: 'white',
  //   borderRadius: 8,
  //   padding: 0,
  //   elevation: 4,
  // },
  
  // callout: {
  //   width: 160,
  //   padding: 8,
  //   alignItems: 'center',
  // },

  customCallout: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    minWidth: 180,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  calloutTitle: { 
    fontWeight: 'bold', 
    fontSize: 14, 
    marginBottom: 4,
    color: Colors.text 
  },

  // List Styles
  card: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: 'white', elevation: 3 },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10 },
  shopName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
});
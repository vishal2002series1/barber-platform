import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Text, Card, Searchbar, ActivityIndicator, Chip, IconButton } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps'; // <--- Import Map

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list'); // <--- Toggle State

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    const { data } = await supabase
      .from('shops')
      .select(`
        id, 
        shop_name, 
        is_open,
        image_url,    // <--- ADD THIS
        latitude,
        longitude,
        profiles:owner_id ( full_name ) 
      `);
      
    if (data) setShops(data);
    setLoading(false);
  };

  const handleShopPress = (shop: any) => {
    navigation.navigate('Booking', { shopId: shop.id, shopName: shop.shop_name });
  };

  const renderMap = () => {
    // Default region (San Francisco) - In a real app, use user's location
    const initialRegion = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    // Note for Web: Maps on web require a Google API Key in app.json. 
    // If it shows blank on localhost, test on your phone!
    return (
        <MapView style={styles.map} initialRegion={initialRegion}>
            {shops.map((shop) => (
                shop.latitude && shop.longitude ? (
                    <Marker
                        key={shop.id}
                        coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
                        title={shop.shop_name}
                        description={shop.is_open ? "Open Now" : "Closed"}
                    >
                        <Callout onPress={() => handleShopPress(shop)}>
                            <View style={styles.callout}>
                                <Text style={styles.calloutTitle}>{shop.shop_name}</Text>
                                <Text style={{color: Colors.primary}}>Tap to Book</Text>
                            </View>
                        </Callout>
                    </Marker>
                ) : null
            ))}
        </MapView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
            <Text style={styles.title}>Find a Barber</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {/* TOGGLE BUTTON */}
                <IconButton 
                    icon={viewMode === 'list' ? "map" : "format-list-bulleted"} 
                    iconColor={Colors.primary}
                    size={28}
                    onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                />
                <TouchableOpacity onPress={signOut} style={{marginLeft: 10}}>
                    <MaterialCommunityIcons name="logout" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>

        {viewMode === 'list' && (
            <Searchbar
            placeholder="Search shops..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            />
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} />
      ) : viewMode === 'list' ? (
        // --- LIST VIEW ---
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{padding: 16}}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleShopPress(item)}>
              <Card style={styles.card}>
              <Card.Cover 
    // Use the real image if it exists, otherwise fall back to placeholder
    source={{ uri: item.image_url || 'https://placehold.co/600x400/1A1A1A/FFF?text=Barber+Shop' }} 
/>
                <Card.Content style={styles.cardContent}>
                  <View>
                    <Text style={styles.shopName}>{item.shop_name}</Text>
                    <Text style={styles.ownerName}>{item.profiles?.full_name}</Text>
                  </View>
                  <Chip 
                    icon={item.is_open ? "check-circle" : "clock-outline"} 
                    style={{backgroundColor: item.is_open ? '#E6FFFA' : '#F3F4F6'}}
                    textStyle={{color: item.is_open ? Colors.success : Colors.textSecondary}}
                  >
                    {item.is_open ? "Open" : "Closed"}
                  </Chip>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          )}
        />
      ) : (
        // --- MAP VIEW ---
        renderMap()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 60, backgroundColor: Colors.surface, paddingBottom: 15, zIndex: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  searchBar: { borderRadius: 10, backgroundColor: '#F3F4F6' },
  
  // List Styles
  card: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: 'white' },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  shopName: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  ownerName: { color: Colors.textSecondary, fontSize: 14 },

  // Map Styles
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height - 150 },
  callout: { width: 150, padding: 5, alignItems: 'center' },
  calloutTitle: { fontWeight: 'bold', marginBottom: 5 }
});
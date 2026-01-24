import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, ActivityIndicator, Chip } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    // WEB FALLBACK: Fetch best rated shops (Since geolocation is tricky on some browsers)
    const { data, error } = await supabase
      .from('shops')
      .select('id, shop_name, is_open, image_url, rating, review_count, profiles:owner_id ( full_name )')
      .order('rating', { ascending: false });
      
    if (data) setShops(data);
    if (error) console.error("Error:", error.message);
    setLoading(false);
  };

  const handleShopPress = (shop: any) => {
    navigation.navigate('Booking', { shopId: shop.id, shopName: shop.shop_name });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
            <Text style={styles.title}>Find a Barber</Text>
            <TouchableOpacity onPress={signOut}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{color: 'gray', marginRight: 5}}>Logout</Text>
                    <MaterialCommunityIcons name="logout" size={24} color="gray" />
                </View>
            </TouchableOpacity>
        </View>
        <Searchbar placeholder="Search..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />
      </View>

      {loading ? (
        <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} />
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{padding: 16}}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleShopPress(item)}>
              <Card style={styles.card}>
                <Card.Cover source={{ uri: item.image_url || 'https://placehold.co/600x400/1A1A1A/FFF?text=Shop' }} />
                <Card.Content style={styles.cardContent}>
                  <View>
                    <Text style={styles.shopName}>{item.shop_name}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
                        <MaterialCommunityIcons name="star" size={16} color="#FFB100" />
                        <Text style={{fontWeight: 'bold', marginLeft: 4}}>
                            {item.rating ? item.rating.toFixed(1) : "New"}
                            <Text style={{color: 'gray', fontWeight: 'normal'}}> ({item.review_count || 0} reviews)</Text>
                        </Text>
                    </View>
                  </View>
                  <Chip icon={item.is_open ? "check-circle" : "clock"} style={{backgroundColor: item.is_open ? '#E6FFFA' : '#F3F4F6'}}>
                    {item.is_open ? "Open" : "Closed"}
                  </Chip>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 20, paddingTop: 60, backgroundColor: 'white', paddingBottom: 15 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 28, fontWeight: 'bold' },
  searchBar: { borderRadius: 10, backgroundColor: '#F3F4F6' },
  card: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: 'white' },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  shopName: { fontSize: 18, fontWeight: 'bold' },
});
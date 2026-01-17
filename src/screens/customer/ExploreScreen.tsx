import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, ActivityIndicator, Chip } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';
import { useNavigation } from '@react-navigation/native';
// 1. Add Imports for Auth and Icons
import { useAuth } from '../../auth/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth(); // 2. Get signOut function
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    const { data, error } = await supabase
      .from('shops')
      .select(`
        id, 
        shop_name, 
        is_open,
        profiles:owner_id ( full_name ) 
      `);
      
    if (data) setShops(data);
    setLoading(false);
  };

  const handleShopPress = (shop: any) => {
    navigation.navigate('Booking', { shopId: shop.id, shopName: shop.shop_name });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* 3. Wrap Title and Logout in a Row */}
        <View style={styles.topRow}>
            <Text style={styles.title}>Find a Barber</Text>
            <TouchableOpacity onPress={signOut}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{color: Colors.primary, marginRight: 5}}>Logout</Text>
                    <MaterialCommunityIcons name="logout" size={24} color={Colors.primary} />
                </View>
            </TouchableOpacity>
        </View>

        <Searchbar
          placeholder="Search shops..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
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
                <Card.Cover source={{ uri: 'https://placehold.co/600x400/1A1A1A/FFF?text=Barber+Shop' }} />
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 60, backgroundColor: Colors.surface, paddingBottom: 15 },
  // 4. New Style for the top row
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  searchBar: { borderRadius: 10, backgroundColor: '#F3F4F6' },
  card: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: 'white' },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  shopName: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  ownerName: { color: Colors.textSecondary, fontSize: 14 }
});
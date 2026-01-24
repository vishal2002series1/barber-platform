import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, IconButton, Surface } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

type FilterType = 'Today' | 'Week' | 'Month' | 'All';

export default function EarningsHistoryScreen() {
  const { userProfile } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<any>();

  // Default to filter passed from Dashboard, or 'Today'
  const [filter, setFilter] = useState<FilterType>(route.params?.initialFilter || 'Today');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ revenue: 0, count: 0 });

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    setLoading(true);
    let query = supabase
      .from('bookings')
      .select(`
        id,
        final_price,
        slot_start,
        profiles:customer_id(full_name),
        booking_services ( services ( name ) )
      `)
      .eq('barber_id', userProfile!.id)
      .eq('status', 'completed') // Only show money actually earned
      .order('slot_start', { ascending: false });

    // Apply Date Filters
    const now = new Date();
    if (filter === 'Today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('slot_start', start);
    } else if (filter === 'Week') {
        // Start of current week (Sunday)
        const start = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
        query = query.gte('slot_start', start);
    } else if (filter === 'Month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('slot_start', start);
    }

    const { data, error } = await query;

    if (data) {
        setHistory(data);
        // Calculate Totals locally
        const totalRev = data.reduce((sum, item) => sum + (item.final_price || 0), 0);
        setStats({ revenue: totalRev, count: data.length });
    }
    setLoading(false);
  };

  const getServiceNames = (item: any) => {
    if (!item.booking_services) return "Service";
    return item.booking_services.map((s: any) => s.services?.name).join(", ");
  };

  const filters: FilterType[] = ['Today', 'Week', 'Month', 'All'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="white" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Earnings & History</Text>
        <View style={{width: 40}} />
      </View>

      {/* Summary Card */}
      <Surface style={styles.summaryCard} elevation={4}>
          <View style={{alignItems: 'center'}}>
              <Text style={{color: Colors.textSecondary, marginBottom: 5}}>Total Earnings ({filter})</Text>
              <Text style={styles.bigNumber}>${stats.revenue.toFixed(2)}</Text>
              <Text style={{color: Colors.success, fontWeight: 'bold'}}>{stats.count} Jobs Completed</Text>
          </View>
      </Surface>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
          {filters.map(f => (
              <Chip 
                key={f} 
                mode="flat" 
                selected={filter === f} 
                onPress={() => setFilter(f)}
                style={{backgroundColor: filter === f ? Colors.secondary : '#eee', marginRight: 8}}
                textStyle={{color: filter === f ? 'white' : 'black'}}
              >
                  {f}
              </Chip>
          ))}
      </View>

      {/* List */}
      {loading ? (
          <ActivityIndicator style={{marginTop: 50}} color={Colors.primary} />
      ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{padding: 16, paddingBottom: 50}}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20, color:'gray'}}>No completed jobs in this period.</Text>}
            renderItem={({ item }) => (
                <Card style={styles.itemCard}>
                    <Card.Content style={styles.row}>
                        <View style={{flex: 1}}>
                            <Text style={styles.dateText}>
                                {new Date(item.slot_start).toLocaleDateString()} • {new Date(item.slot_start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </Text>
                            <Text style={styles.nameText}>{item.profiles?.full_name || 'Customer'}</Text>
                            <Text style={styles.serviceText}>{getServiceNames(item)}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                             <Text style={styles.priceText}>+${item.final_price}</Text>
                             <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} style={{marginTop: 5}} />
                        </View>
                    </Card.Content>
                </Card>
            )}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
      paddingTop: 50, paddingBottom: 15, paddingHorizontal: 10,
      backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' 
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  summaryCard: { margin: 16, padding: 20, borderRadius: 12, backgroundColor: 'white', alignItems: 'center' },
  bigNumber: { fontSize: 36, fontWeight: 'bold', color: Colors.primary, marginVertical: 5 },
  
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10 },
  
  itemCard: { marginBottom: 12, backgroundColor: 'white', borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 12, color: 'gray', marginBottom: 2 },
  nameText: { fontSize: 16, fontWeight: 'bold' },
  serviceText: { fontSize: 14, color: Colors.secondary, marginTop: 2 },
  priceText: { fontSize: 18, fontWeight: 'bold', color: Colors.success }
});
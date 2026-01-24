import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Switch, Chip, Avatar, IconButton } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Colors } from '../../config/colors';
import { Strings } from '../../config/strings';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import BookingAlertModal from '../../components/BookingAlertModal'; 

export default function DashboardScreen() {
  const { userProfile, signOut } = useAuth(); 
  const navigation = useNavigation<any>();

  // State
  const [isOnline, setIsOnline] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({ todayEarnings: 0, jobsDone: 0 });
  const [loading, setLoading] = useState(true);

  // Alarm State
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // REF: To track "Online" status inside the Realtime Listener
  const isOnlineRef = useRef(isOnline);
  const userRef = useRef(userProfile); // Keep user ref for listener

  useEffect(() => {
    isOnlineRef.current = isOnline;
    userRef.current = userProfile;
  }, [isOnline, userProfile]);

  useEffect(() => {
    if (userProfile?.id) {
      fetchDashboardData();
      const unsubscribe = subscribeToBookings();
      return () => { unsubscribe(); };
    }
  }, [userProfile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // 1. Get Shop Status
    const { data: shop } = await supabase
      .from('shops')
      .select('is_open, id')
      .eq('owner_id', userProfile!.id)
      .single();
    if (shop) setIsOnline(shop.is_open);

    // 2. Get INCOMING Requests (Pending)
    const { data: pending } = await supabase
      .from('bookings')
      .select('*, profiles:customer_id(full_name)')
      .eq('barber_id', userProfile!.id)
      .eq('status', 'requested')
      .order('created_at', { ascending: false });
    if (pending) setRequests(pending);

    // 3. Get ACTIVE Jobs
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: active } = await supabase
      .from('bookings')
      .select('*, profiles:customer_id(full_name)')
      .eq('barber_id', userProfile!.id)
      .eq('status', 'accepted')
      .gte('slot_start', todayStr) 
      .order('slot_start', { ascending: true });
    if (active) setActiveJobs(active);

    // 4. Get Stats
    const { data: earnings } = await supabase
      .rpc('get_barber_stats', { 
        p_barber_id: userProfile!.id, 
        p_start_date: todayStr, 
        p_end_date: todayStr 
      });
    if (earnings) setStats({ todayEarnings: earnings.revenue, jobsDone: earnings.completed });
    
    setLoading(false);
  };

  // --- ROBUST REAL-TIME LISTENER ---
  const subscribeToBookings = () => {
    // 1. Create a unique channel key to ensure fresh connection
    const channelKey = `dashboard-${userProfile!.id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelKey) 
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (Insert/Update)
          schema: 'public',
          table: 'bookings'
          // REMOVED FILTER: We filter in JS below for reliability
        },
        async (payload) => {
          // JS FILTER: Is this for me?
          const newRecord = payload.new as any;
          if (!newRecord || newRecord.barber_id !== userRef.current?.id) {
             return; // Not for this barber, ignore.
          }

          console.log("Signal Received:", payload.eventType);

          // Handle INSERT (New Booking Alarm)
          if (payload.eventType === 'INSERT') {
            if (!isOnlineRef.current) return;
            
            // Check for conflict
            const { count } = await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('barber_id', userRef.current?.id)
              .eq('status', 'accepted')
              .eq('slot_start', newRecord.slot_start);

            if (count && count > 0) return; // Busy

            // Fetch details for Modal
            const { data } = await supabase
              .from('bookings')
              .select('*, profiles:customer_id(full_name)')
              .eq('id', newRecord.id)
              .single();
              
            if (data && data.status === 'requested') {
               setIncomingRequest(data);
               setModalVisible(true); 
            }
          }
          
          // Refresh Data on ANY change
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const toggleOnline = async (val: boolean) => {
    setIsOnline(val); 
    await supabase.from('shops').update({ is_open: val }).eq('owner_id', userProfile!.id);
  };

  const handleBookingAction = async (bookingId: string, action: 'accept' | 'reject') => {
    setModalVisible(false);
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    setLoading(true);

    try {
        const { error } = await supabase.rpc('manage_booking', {
          p_booking_id: bookingId,
          p_status: newStatus
        });
        setLoading(false);
        if (error) {
            Alert.alert("Notice", "This request is no longer valid.");
        }
        fetchDashboardData();
    } catch (e) {
        setLoading(false);
        fetchDashboardData();
    }
  };

  const handleCompleteJob = (bookingId: string) => {
      navigation.navigate('ReceiptBuilder', { bookingId });
  };

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDashboardData} />}
    >
      <BookingAlertModal 
        visible={modalVisible} 
        booking={incomingRequest}
        onAccept={() => handleBookingAction(incomingRequest?.id, 'accept')}
        onReject={() => handleBookingAction(incomingRequest?.id, 'reject')}
      />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: isOnline ? Colors.success : Colors.textSecondary }]}>
        <View>
          <Text style={styles.headerTitle}>{isOnline ? Strings.goOnline : Strings.goOffline}</Text>
          <Text style={styles.headerSubtitle}>{userProfile?.full_name}'s Shop</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Switch value={isOnline} onValueChange={toggleOnline} color="white" style={{marginRight: 15}} />
            <TouchableOpacity onPress={signOut}>
                <MaterialCommunityIcons name="logout" size={24} color="white" />
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* STATS */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text style={styles.statLabel}>Today's Earnings</Text>
              <Text style={styles.statValue}>${stats.todayEarnings}</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text style={styles.statLabel}>Jobs Done</Text>
              <Text style={styles.statValue}>{stats.jobsDone}</Text>
            </Card.Content>
          </Card>
        </View>

        {/* ACTIVE JOBS */}
        {activeJobs.length > 0 && (
            <>
                <Text style={styles.sectionTitle}>Upcoming Appointments ({activeJobs.length})</Text>
                {activeJobs.map((job) => (
                    <Card key={job.id} style={[styles.requestCard, { borderLeftColor: Colors.primary }]}>
                        <Card.Title 
                            title={job.profiles?.full_name || "Customer"} 
                            subtitle={new Date(job.slot_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            left={(props) => <Avatar.Icon {...props} icon="calendar-check" backgroundColor={Colors.primary} />}
                        />
                        <Card.Actions>
                            <Button 
                                mode="contained" 
                                buttonColor={Colors.secondary} 
                                icon="check-all"
                                style={{width: '100%'}}
                                onPress={() => handleCompleteJob(job.id)}
                            >
                                Complete Job
                            </Button>
                        </Card.Actions>
                    </Card>
                ))}
                <View style={{height: 20}} />
            </>
        )}

        {/* INCOMING REQUESTS */}
        <Text style={styles.sectionTitle}>Incoming Requests ({requests.length})</Text>
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{color: Colors.textSecondary}}>No pending requests.</Text>
          </View>
        ) : (
          requests.map((req) => (
            <Card key={req.id} style={styles.requestCard}>
              <Card.Title 
                title={req.profiles?.full_name || "New Customer"} 
                subtitle={`Requested: ${new Date(req.slot_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                left={(props) => <Avatar.Icon {...props} icon="account-clock" backgroundColor={Colors.secondary} />}
              />
              <Card.Content>
                 <Text style={{fontSize: 12, color: 'gray', marginBottom: 5}}>
                    Received: {new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </Text>
                 <Chip icon="cash" style={{alignSelf: 'flex-start'}}>${req.price}</Chip>
              </Card.Content>
              <Card.Actions>
                <Button textColor={Colors.error} onPress={() => handleBookingAction(req.id, 'reject')}>Reject</Button>
                <Button mode="contained" buttonColor={Colors.success} onPress={() => handleBookingAction(req.id, 'accept')}>Accept</Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'white', opacity: 0.8 },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { flex: 0.48, backgroundColor: Colors.surface },
  statLabel: { color: Colors.textSecondary, fontSize: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  requestCard: { marginBottom: 12, backgroundColor: Colors.surface, borderLeftWidth: 4, borderLeftColor: Colors.secondary },
  emptyState: { padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }
});
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, List, FAB, Portal, Modal, TextInput, Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext'; // 1. Import Auth
import { Colors } from '../../config/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // 2. Import Icons

export default function ServicesScreen() {
  const { userProfile, signOut } = useAuth(); // 3. Get signOut
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', userProfile!.id).single();
    if (!shop) return;

    const { data } = await supabase.from('services').select('*').eq('shop_id', shop.id);
    if (data) setServices(data);
    setLoading(false);
  };

  const handleAddService = async () => {
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', userProfile!.id).single();
    
    const { error } = await supabase.from('services').insert({
      shop_id: shop.id,
      name,
      price: parseFloat(price),
      duration_min: parseInt(duration)
    });

    if (error) Alert.alert("Error", error.message);
    else {
      setVisible(false);
      setName(''); setPrice('');
      fetchServices(); 
    }
  };

  return (
    <View style={styles.container}>
      {/* 4. Add the Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Services</Text>
        <TouchableOpacity onPress={signOut}>
            <MaterialCommunityIcons name="logout" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <List.Section>
        <List.Subheader>Your Menu</List.Subheader>
        {services.length === 0 && <Text style={{padding: 20}}>No services added yet.</Text>}
        
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={fetchServices}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={`${item.duration_min} mins`}
              right={() => <Text style={styles.priceTag}>${item.price}</Text>}
              left={props => <List.Icon {...props} icon="content-cut" />}
              style={styles.item}
            />
          )}
        />
      </List.Section>

      <FAB
        icon="plus"
        style={styles.fab}
        color="white"
        onPress={() => setVisible(true)}
      />

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Add New Service</Text>
          <TextInput label="Service Name" value={name} onChangeText={setName} style={styles.input} />
          <TextInput label="Price ($)" value={price} onChangeText={setPrice} keyboardType="numeric" style={styles.input} />
          <TextInput label="Duration (mins)" value={duration} onChangeText={setDuration} keyboardType="numeric" style={styles.input} />
          <Button mode="contained" onPress={handleAddService} style={{marginTop: 10}} buttonColor={Colors.primary}>
            Save Service
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  // 5. Add Header Styles
  header: { 
    padding: 20, 
    paddingTop: 60, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: Colors.primary // Dark header to match dashboard
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  
  item: { backgroundColor: Colors.surface, marginBottom: 1, paddingVertical: 8 },
  priceTag: { fontWeight: 'bold', fontSize: 16, alignSelf: 'center', marginRight: 10, color: Colors.primary },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: Colors.secondary },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { marginBottom: 12, backgroundColor: 'white' }
});
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Text, List, FAB, Portal, Modal, TextInput, Button, IconButton } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../auth/AuthContext'; 
import { Colors } from '../../config/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 

export default function ServicesScreen() {
  const { userProfile, signOut } = useAuth(); 
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Track if editing
  
  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', userProfile!.id).single();
    if (!shop) return;

    const { data } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('is_active', true) // Only show active services
        .order('name');
        
    if (data) setServices(data);
    setLoading(false);
  };

  const openAddModal = () => {
      setEditingId(null);
      setName('');
      setPrice('');
      setDuration('30');
      setVisible(true);
  };

  const openEditModal = (item: any) => {
      setEditingId(item.id);
      setName(item.name);
      setPrice(item.price.toString());
      setDuration(item.duration_min.toString());
      setVisible(true);
  };

  const handleSave = async () => {
    if (!name || !price) {
        Alert.alert("Error", "Please enter name and price");
        return;
    }

    setSaving(true);
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', userProfile!.id).single();

    let error;

    if (editingId) {
        // UPDATE Existing
        const { error: updateError } = await supabase
            .from('services')
            .update({
                name,
                price: parseFloat(price),
                duration_min: parseInt(duration)
            })
            .eq('id', editingId);
        error = updateError;
    } else {
        // INSERT New
        const { error: insertError } = await supabase
            .from('services')
            .insert({
                shop_id: shop.id,
                name,
                price: parseFloat(price),
                duration_min: parseInt(duration),
                is_active: true
            });
        error = insertError;
    }

    setSaving(false);

    if (error) {
        Alert.alert("Error", error.message);
    } else {
        setVisible(false);
        fetchServices(); 
    }
  };

  const handleDelete = async () => {
      if (!editingId) return;

      Alert.alert(
          "Delete Service",
          "Are you sure you want to remove this service?",
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Delete", 
                  style: "destructive", 
                  onPress: async () => {
                      // Soft Delete (set is_active = false) to keep booking history intact
                      const { error } = await supabase
                        .from('services')
                        .update({ is_active: false })
                        .eq('id', editingId);
                      
                      if (!error) {
                          setVisible(false);
                          fetchServices();
                      } else {
                          Alert.alert("Error", error.message);
                      }
                  } 
              }
          ]
      );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Services</Text>
        <TouchableOpacity onPress={signOut}>
            <MaterialCommunityIcons name="logout" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <List.Section>
        <List.Subheader>Tap items to edit</List.Subheader>
        
        {services.length === 0 && !loading && (
            <Text style={{textAlign: 'center', marginTop: 20, color: 'gray'}}>
                No services yet. Tap + to add one.
            </Text>
        )}
        
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={fetchServices}
          contentContainerStyle={{paddingBottom: 80}}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              titleStyle={{fontWeight: 'bold'}}
              description={`${item.duration_min} mins`}
              right={() => <Text style={styles.priceTag}>${item.price}</Text>}
              left={props => <List.Icon {...props} icon="content-cut" color={Colors.primary} />}
              style={styles.item}
              onPress={() => openEditModal(item)} // <--- Tap to Edit
            />
          )}
        />
      </List.Section>

      <FAB
        icon="plus"
        style={styles.fab}
        color="white"
        onPress={openAddModal} // <--- Tap to Add
      />

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? "Edit Service" : "New Service"}</Text>
            <IconButton icon="close" size={20} onPress={() => setVisible(false)} />
          </View>
          
          <TextInput label="Service Name" value={name} onChangeText={setName} style={styles.input} mode="outlined" />
          
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <TextInput 
                label="Price ($)" 
                value={price} 
                onChangeText={setPrice} 
                keyboardType="numeric" 
                style={[styles.input, {flex: 0.48}]} 
                mode="outlined"
            />
            <TextInput 
                label="Duration (mins)" 
                value={duration} 
                onChangeText={setDuration} 
                keyboardType="numeric" 
                style={[styles.input, {flex: 0.48}]} 
                mode="outlined"
            />
          </View>

          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={saving} 
            style={{marginTop: 10}} 
            buttonColor={Colors.primary}
          >
            {editingId ? "Update Service" : "Add Service"}
          </Button>

          {/* Delete Button (Only in Edit Mode) */}
          {editingId && (
              <Button 
                mode="text" 
                textColor={Colors.error} 
                onPress={handleDelete} 
                style={{marginTop: 10}}
              >
                Delete Service
              </Button>
          )}

        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    padding: 20, 
    paddingTop: 60, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: Colors.primary 
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  
  item: { backgroundColor: 'white', marginBottom: 1, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  priceTag: { fontWeight: 'bold', fontSize: 16, alignSelf: 'center', marginRight: 10, color: Colors.success },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 20, backgroundColor: Colors.secondary },
  
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { marginBottom: 12, backgroundColor: 'white' }
});
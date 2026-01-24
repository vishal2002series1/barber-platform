import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Linking, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton, Switch, Surface, HelperText } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Colors } from '../../config/colors';

export default function ReceiptBuilderScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookingId } = route.params;

  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ id: string; name: string; price: string }[]>([]);
  const [discount, setDiscount] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  
  // Autocomplete State
  const [allServices, setAllServices] = useState<any[]>([]); 
  const [activeRowId, setActiveRowId] = useState<string | null>(null); 
  const [suggestions, setSuggestions] = useState<any[]>([]); 

  // Customer info for WhatsApp
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('Customer');

  // 1. Initialize
  useEffect(() => {
    fetchBookingAndServices();
  }, []);

  const fetchBookingAndServices = async () => {
    try {
        // A. Get Booking Info (Customer & Shop ID)
        const { data: booking } = await supabase
          .from('bookings')
          .select('price, shop_id, profiles:customer_id(full_name, phone)')
          .eq('id', bookingId)
          .single();

        if (booking) {
          setCustomerPhone(booking.profiles?.phone);
          setCustomerName(booking.profiles?.full_name || 'Customer');

          // B. Get Selected Services (The Fix)
          // Join booking_services -> services to get the names
          const { data: bookedServices } = await supabase
            .from('booking_services')
            .select(`
                price_at_booking,
                services ( name )
            `)
            .eq('booking_id', bookingId);

          if (bookedServices && bookedServices.length > 0) {
              // Pre-fill with actual services booked
              const mappedItems = bookedServices.map((bs: any, index: number) => ({
                  id: index.toString(),
                  name: bs.services?.name || 'Service',
                  price: bs.price_at_booking.toString()
              }));
              setItems(mappedItems);
          } else {
              // Fallback: If no specific services found (Legacy), use total price
              setItems([{ id: '1', name: 'Service', price: booking.price.toString() }]);
          }

          // C. Fetch Shop Services (For Autocomplete)
          if (booking.shop_id) {
            const { data: services } = await supabase
                .from('services')
                .select('name, price')
                .eq('shop_id', booking.shop_id)
                .eq('is_active', true);
            
            if (services) setAllServices(services);
          }
        }
    } catch (e) {
        console.log("Error fetching receipt data", e);
    }
  };

  // --- LOGIC: CALCULATE TOTALS ---
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const discVal = parseFloat(discount) || 0;
    const afterDiscount = Math.max(0, subtotal - discVal);

    const taxPercent = parseFloat(taxRate) || 0;
    let taxAmount = 0;
    let finalTotal = afterDiscount;

    if (taxPercent > 0) {
        if (isTaxInclusive) {
            const base = afterDiscount / (1 + taxPercent / 100);
            taxAmount = afterDiscount - base;
            finalTotal = afterDiscount; 
        } else {
            taxAmount = afterDiscount * (taxPercent / 100);
            finalTotal = afterDiscount + taxAmount;
        }
    }

    return { subtotal, discVal, taxAmount, finalTotal };
  };

  const { finalTotal, taxAmount, subtotal } = calculateTotals();

  // --- ACTIONS ---
  const updateItem = (id: string, field: 'name' | 'price', value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    
    // Autocomplete Logic
    if (field === 'name') {
        setActiveRowId(id);
        if (value.length > 0) {
            const matches = allServices.filter(s => 
                s.name.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(matches);
        } else {
            setSuggestions([]);
        }
    }
  };

  const selectSuggestion = (item: any) => {
    if (activeRowId) {
        // Update Name AND Price
        setItems(prev => prev.map(row => 
            row.id === activeRowId 
            ? { ...row, name: item.name, price: item.price.toString() } 
            : row
        ));
        // Clear suggestions
        setActiveRowId(null);
        setSuggestions([]);
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now().toString(), name: '', price: '' }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const navigateHome = () => {
      navigation.navigate('BarberApp', { screen: 'Dashboard' });
  };

  const handleComplete = async () => {
    setLoading(true);

    const receiptData = {
        items: items.map(i => ({ name: i.name || 'Service', price: parseFloat(i.price) || 0 })),
        discount: parseFloat(discount) || 0,
        tax_rate: parseFloat(taxRate) || 0,
        is_tax_inclusive: isTaxInclusive,
        tax_amount: taxAmount,
        subtotal: subtotal
    };

    const { error } = await supabase
        .from('bookings')
        .update({
            status: 'completed',
            final_price: finalTotal,
            receipt_data: receiptData,
            payment_method: 'cash'
        })
        .eq('id', bookingId);

    setLoading(false);

    if (error) {
        Alert.alert("Error", error.message);
    } else {
        Alert.alert(
            "Success",
            "Job marked as complete!",
            [
                { text: "Done", onPress: navigateHome }, 
                { 
                    text: "Send WhatsApp Receipt", 
                    onPress: () => sendWhatsApp(receiptData, finalTotal) 
                }
            ]
        );
    }
  };

  const sendWhatsApp = (receipt: any, total: number) => {
    let msg = `Hi ${customerName}! 👋\nHere is your receipt:\n\n`;
    
    receipt.items.forEach((i: any) => {
        msg += `▪️ ${i.name}: $${i.price}\n`;
    });

    if (receipt.discount > 0) msg += `🎉 Discount: -$${receipt.discount}\n`;
    if (receipt.tax_amount > 0) msg += `🏛️ Tax (${taxRate}%): $${receipt.tax_amount.toFixed(2)}\n`;
    
    msg += `\n*TOTAL: $${total.toFixed(2)}*\n\n`;
    msg += `Thanks for visiting! Please rate your experience in the app.`;

    const link = `whatsapp://send?phone=${customerPhone}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(link).catch(() => Alert.alert("Error", "WhatsApp not installed"));
    
    navigateHome(); 
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="close" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Build Receipt</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* --- 1. ITEMS LIST --- */}
        <Surface style={styles.section} elevation={1}>
            <Text style={styles.sectionHeader}>Services</Text>
            {items.map((item, index) => (
                <View key={item.id} style={{marginBottom: 10, zIndex: 100 - index}}>
                    <View style={styles.itemRow}>
                        <TextInput 
                            mode="outlined"
                            placeholder="Service Name"
                            value={item.name}
                            onFocus={() => setActiveRowId(item.id)}
                            onChangeText={t => updateItem(item.id, 'name', t)}
                            style={{flex: 2, height: 40, backgroundColor:'white'}}
                        />
                        <TextInput 
                            mode="outlined"
                            placeholder="Price"
                            value={item.price}
                            keyboardType="numeric"
                            onChangeText={t => updateItem(item.id, 'price', t)}
                            style={{flex: 1, height: 40, marginHorizontal: 5, backgroundColor:'white'}}
                            left={<TextInput.Affix text="$" />}
                        />
                        <IconButton icon="delete" size={20} iconColor={Colors.error} onPress={() => removeItem(item.id)} />
                    </View>

                    {/* SUGGESTION LIST */}
                    {activeRowId === item.id && suggestions.length > 0 && (
                        <View style={styles.suggestionBox}>
                            {suggestions.map((s, i) => (
                                <TouchableOpacity key={i} onPress={() => selectSuggestion(s)} style={styles.suggestionItem}>
                                    <Text style={{fontWeight: 'bold'}}>{s.name}</Text>
                                    <Text style={{color: Colors.primary}}>${s.price}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            ))}
            <Button mode="text" icon="plus" onPress={addItem} style={{alignSelf:'flex-start'}}>Add Item</Button>
        </Surface>

        {/* --- 2. ADJUSTMENTS --- */}
        <Surface style={styles.section} elevation={1}>
            <Text style={styles.sectionHeader}>Adjustments</Text>
            
            <View style={styles.row}>
                <TextInput 
                    label="Discount"
                    value={discount}
                    onChangeText={setDiscount}
                    keyboardType="numeric"
                    style={styles.inputHalf}
                    mode="outlined"
                    left={<TextInput.Affix text="-$" />}
                />
                <TextInput 
                    label="Tax Rate %"
                    value={taxRate}
                    onChangeText={setTaxRate}
                    keyboardType="numeric"
                    style={styles.inputHalf}
                    mode="outlined"
                    right={<TextInput.Affix text="%" />}
                />
            </View>

            <View style={styles.switchRow}>
                <Text>Tax is included in price?</Text>
                <Switch value={isTaxInclusive} onValueChange={setIsTaxInclusive} color={Colors.primary} />
            </View>
            <HelperText type="info">
                {isTaxInclusive ? "Math: Backward Calculation (Total stays same)" : "Math: Forward Calculation (Tax added to Total)"}
            </HelperText>
        </Surface>

      </ScrollView>

      {/* --- 3. FOOTER TOTAL --- */}
      <Surface style={styles.footer} elevation={4}>
          <View>
              <Text style={{color: 'gray'}}>Total to Pay</Text>
              <Text style={styles.totalText}>${finalTotal.toFixed(2)}</Text>
          </View>
          <Button 
            mode="contained" 
            buttonColor={Colors.success} 
            onPress={handleComplete}
            loading={loading}
            contentStyle={{paddingHorizontal: 20}}
          >
            Complete & Send
          </Button>
      </Surface>

    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    paddingTop: 50, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 100 },
  
  section: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 20 },
  sectionHeader: { fontWeight: 'bold', marginBottom: 10, color: 'gray' },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  
  // Suggestions
  suggestionBox: { 
      backgroundColor: '#fff', 
      borderWidth: 1, borderColor: '#eee', 
      borderRadius: 4, 
      marginTop: 2, marginLeft: 0, marginRight: 50, // Align with text inputs
      elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4
  },
  suggestionItem: { 
      padding: 10, 
      flexDirection: 'row', justifyContent: 'space-between',
      borderBottomWidth: 1, borderBottomColor: '#f0f0f0' 
  },

  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputHalf: { flex: 0.48, backgroundColor: 'white' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  
  footer: { 
      position: 'absolute', bottom: 0, left: 0, right: 0, 
      backgroundColor: 'white', padding: 20, paddingBottom: 40,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderTopWidth: 1, borderTopColor: '#eee'
  },
  totalText: { fontSize: 28, fontWeight: 'bold', color: Colors.primary }
});
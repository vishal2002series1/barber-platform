import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Alert, Image 
} from 'react-native';
import { TextInput, Button, Divider } from 'react-native-paper';
import { Colors } from '../../config/colors';
import { Strings } from '../../config/strings';
import { useAuth } from '../../auth/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { signup, signInWithGoogle } = useAuth(); // <--- Get Google Func
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'customer' | 'barber'>('customer');

  const handleAuth = async () => {
    setLoading(true);
    if (isLogin) {
        const { supabase } = require('../../services/supabase'); 
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) Alert.alert("Login Failed", error.message);
    } else {
        if (!fullName.trim()) {
            Alert.alert("Error", "Please enter your full name.");
            setLoading(false);
            return;
        }
        const result = await signup(email, password, role, fullName);
        if (!result.success) {
            Alert.alert("Signup Failed", result.error);
        } else {
            Alert.alert("Success", "Account created! Please verify email.");
            setIsLogin(true); 
        }
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        
        <View style={styles.header}>
          <View style={styles.logoPlaceholder}>
             <Text style={styles.logoText}>✂️</Text>
          </View>
          <Text style={styles.title}>{isLogin ? Strings.loginBtn : "Create Account"}</Text>
        </View>

        {!isLogin && (
            <View style={styles.roleContainer}>
            <TouchableOpacity style={[styles.roleBtn, role === 'customer' && styles.roleBtnActive]} onPress={() => setRole('customer')}>
                <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleBtn, role === 'barber' && styles.roleBtnActive]} onPress={() => setRole('barber')}>
                <Text style={[styles.roleText, role === 'barber' && styles.roleTextActive]}>Barber</Text>
            </TouchableOpacity>
            </View>
        )}

        {!isLogin && (
            <TextInput label="Full Name" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} />
        )}

        <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        <TextInput label="Password" value={password} onChangeText={setPassword} mode="outlined" style={styles.input} secureTextEntry />

        <Button mode="contained" onPress={handleAuth} loading={loading} style={styles.mainBtn} buttonColor={Colors.primary}>
          {loading ? "Processing..." : (isLogin ? Strings.loginBtn : "Sign Up")}
        </Button>

        {/* --- GOOGLE BUTTON --- */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 20}}>
            <Divider style={{flex: 1}} />
            <Text style={{marginHorizontal: 10, color: 'gray'}}>OR</Text>
            <Divider style={{flex: 1}} />
        </View>

        <Button 
            mode="outlined" 
            onPress={signInWithGoogle} 
            icon="google"
            textColor="black"
            style={{borderColor: '#ddd', borderRadius: 8}}
        >
            Continue with Google
        </Button>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.secondaryAction}>
          <Text style={styles.secondaryText}>
            {isLogin ? "New here? " : "Already have an account? "}
            <Text style={{fontWeight: 'bold'}}>{isLogin ? "Create Account" : "Login"}</Text>
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { flex: 1, justifyContent: 'center', padding: 24, maxWidth: 500, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: 30 },
  logoPlaceholder: { width: 80, height: 80, backgroundColor: Colors.secondary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { fontSize: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  roleContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4, marginBottom: 20 },
  roleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  roleBtnActive: { backgroundColor: Colors.surface, elevation: 2 },
  roleText: { fontWeight: '600', color: Colors.textSecondary },
  roleTextActive: { color: Colors.primary },
  input: { marginBottom: 16, backgroundColor: Colors.surface },
  mainBtn: { paddingVertical: 6, marginTop: 8, borderRadius: 8 },
  secondaryAction: { marginTop: 20, alignItems: 'center' },
  secondaryText: { color: Colors.textSecondary },
});
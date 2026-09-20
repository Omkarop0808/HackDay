import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../config/api';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [userData, setUserData] = useState(null);
  const [pendingTokens, setPendingTokens] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Modals state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  
  // Payment Flow State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [scannedUser, setScannedUser] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [pin, setPin] = useState('');
  const [paymentStep, setPaymentStep] = useState('amount'); // 'amount' | 'pin' | 'success'

  useEffect(() => {
    async function initWallet() {
      try {
        const uid = await AsyncStorage.getItem('firebaseUid');
        const userStr = await AsyncStorage.getItem('userData');
        setFirebaseUid(uid);
        if (userStr) setUserData(JSON.parse(userStr));
        
        if (uid) {
          const res = await api.get(`/api/offline/balance/${uid}`);
          setBalance(res.data.data.balance || 0);
        } else {
          setBalance(50);
        }
      } catch (e) {
        setBalance(50);
      } finally {
        setLoading(false);
      }
    }
    initWallet();
  }, []);

  const openScanner = async () => {
    setIsProcessingScan(false); // Reset state every time camera opens
    // Simulated Bluetooth Check for realism
    Alert.alert(
      "Bluetooth Required",
      "FinSage Pay wants to turn on Bluetooth to detect nearby receivers for offline transfer.",
      [
        { text: "Deny", style: "cancel" },
        { 
          text: "Allow", 
          onPress: async () => {
            if (!permission?.granted) {
              const res = await requestPermission();
              if (!res.granted) {
                Alert.alert("Permission Required", "Camera access is needed to scan QR codes.");
                return;
              }
            }
            setShowScannerModal(true);
          }
        }
      ]
    );
  };

  const [isProcessingScan, setIsProcessingScan] = useState(false);

  const handleBarcodeScanned = ({ type, data }) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);

    try {
      const parsed = JSON.parse(data);
      if (parsed.uid && parsed.name) {
        setShowScannerModal(false);
        setScannedUser(parsed);
        setPaymentStep('amount');
        setPaymentAmount('');
        setPin('');
        setShowPaymentModal(true);
      } else {
        Alert.alert(
          "Invalid QR Code", 
          "This QR code does not belong to a FinSage user.",
          [{ text: "Scan Again", onPress: () => setIsProcessingScan(false) }]
        );
      }
    } catch (e) {
       Alert.alert(
          "Unrecognized QR", 
          "This is not a valid FinSage QR code format.",
          [{ text: "Scan Again", onPress: () => setIsProcessingScan(false) }]
        );
    }
  };

  const processPayment = () => {
    if (pin !== '1234') { // Dummy PIN for demo
      Alert.alert("Invalid PIN", "Please enter the correct 4-digit PIN (Hint: 1234)");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      Alert.alert("Error", "Invalid amount or insufficient balance.");
      return;
    }

    // Generate cryptographic token
    const newToken = {
      tokenId: `offline_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      amount: amount,
      type: 'expense',
      category: 'Transfer',
      merchantName: scannedUser.name,
      timestamp: new Date().toISOString(),
      signature: 'simulated_hmac_signature',
      recipientUid: scannedUser.uid
    };
    
    setPendingTokens([...pendingTokens, newToken]);
    setBalance(prev => prev - amount);
    setPaymentStep('success');
  };

  const handleSync = async () => {
    if (pendingTokens.length === 0) {
      Alert.alert("Already Synced", "No pending transactions to upload.");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await api.post('/api/offline/sync', {
        firebaseUid: firebaseUid,
        offlineTokens: pendingTokens
      });

      if (response.data.success) {
        Alert.alert("Sync Complete ☁️", "Your offline payments were verified and synced to the FinSage Cloud.");
        setPendingTokens([]);
      }
    } catch (e) {
      Alert.alert("Sync Failed", "Could not reach the server.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#02569B" /></View>;

  const qrData = JSON.stringify({ uid: firebaseUid || 'demo', name: userData?.name || 'FinSage User' });

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "FinSage Pay", headerStyle: { backgroundColor: '#02569B' }, headerTintColor: '#fff' }} />
      
      <View style={styles.card}>
        {/* Linked Bank Account UI */}
        <View style={styles.bankContainer}>
          <MaterialCommunityIcons name="bank" size={16} color="#bbdefb" />
          <Text style={styles.bankText}>Chase Checking •••• 1234</Text>
        </View>

        <Text style={styles.title}>Digital Token Balance</Text>
        <Text style={styles.balance}>${balance.toFixed(2)}</Text>
        <Text style={styles.subtitle}>Secure Offline Ledger</Text>
        
        {pendingTokens.length > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{pendingTokens.length} Offline Payment(s) Pending Sync</Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={openScanner}>
          <View style={[styles.iconCircle, { backgroundColor: '#e3f2fd' }]}>
            <Ionicons name="scan-outline" size={32} color="#02569B" />
          </View>
          <Text style={styles.actionText}>Scan & Pay</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => setShowReceiveModal(true)}>
          <View style={[styles.iconCircle, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="qr-code-outline" size={32} color="#2e7d32" />
          </View>
          <Text style={styles.actionText}>Receive QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSync} disabled={isSyncing}>
          <View style={[styles.iconCircle, { backgroundColor: pendingTokens.length > 0 ? '#fff3e0' : '#f5f5f5' }]}>
            {isSyncing ? <ActivityIndicator color="#f57c00" /> : <Ionicons name="cloud-upload-outline" size={32} color={pendingTokens.length > 0 ? "#f57c00" : "#bdbdbd"} />}
          </View>
          <Text style={styles.actionText}>Sync Cloud</Text>
        </TouchableOpacity>
      </View>

      {/* History Section */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Offline Ledger</Text>
        {pendingTokens.length === 0 ? (
          <Text style={styles.emptyText}>No unsynced offline transactions.</Text>
        ) : (
          pendingTokens.map(token => (
            <View key={token.tokenId} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="arrow-up" size={20} color="#d32f2f" />
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyName}>To: {token.merchantName}</Text>
                <Text style={styles.historyDate}>Pending Wi-Fi Sync</Text>
              </View>
              <Text style={styles.historyAmount}>-${token.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      {/* RECEIVE MODAL (My QR Code) */}
      <Modal visible={showReceiveModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReceiveModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Receive Offline</Text>
            <TouchableOpacity onPress={() => setShowReceiveModal(false)}>
              <Ionicons name="close" size={32} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.qrContainer}>
            <Text style={styles.qrSubtitle}>Have your friend scan this QR code to send you offline tokens via FinSage Pay.</Text>
            <View style={styles.qrWrapper}>
              <QRCode value={qrData} size={250} color="#000" backgroundColor="#fff" />
            </View>
            <Text style={styles.qrName}>{userData?.name || 'FinSage User'}</Text>
          </View>
        </View>
      </Modal>

      {/* SCANNER MODAL */}
      <Modal visible={showScannerModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView 
            style={{ flex: 1 }} 
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          >
            <View style={styles.scannerHeader}>
              <TouchableOpacity onPress={() => setShowScannerModal(false)}>
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Scan to Pay</Text>
              <View style={{ width: 32 }} />
            </View>

            {/* Target Box Overlay */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: 250, height: 250, borderWidth: 2, borderColor: '#4CAF50', backgroundColor: 'transparent', borderRadius: 20 }} />
              <Text style={{ color: '#fff', marginTop: 20, fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 }}>Align QR code within the frame</Text>
            </View>
            
            {/* Minimal Emulator Bypass Button at the bottom */}
            <View style={{ position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' }}>
              <TouchableOpacity 
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#fff' }}
                onPress={() => {
                  handleBarcodeScanned({ type: 'simulated', data: JSON.stringify({ uid: 'ALICE_DEMO_UID_999', name: 'Alice (Simulated)' }) });
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>💻 Tap to Simulate Scan (For Emulators)</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* PAYMENT FLOW MODAL */}
      <Modal visible={showPaymentModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.paymentModalOverlay}>
          <View style={styles.paymentModalContent}>
            {paymentStep === 'amount' && (
              <>
                <View style={styles.paymentHeader}>
                  <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                    <Ionicons name="close" size={28} color="#333" />
                  </TouchableOpacity>
                </View>
                <View style={styles.paymentProfile}>
                  <View style={styles.paymentAvatar}><Text style={styles.avatarText}>{scannedUser?.name?.[0]}</Text></View>
                  <Text style={styles.paymentName}>Paying {scannedUser?.name}</Text>
                  <Text style={styles.paymentBank}>FinSage Pay Offline Transfer</Text>
                </View>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput 
                    style={styles.amountInput}
                    keyboardType="decimal-pad"
                    autoFocus={true}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder="0"
                    placeholderTextColor="#ccc"
                  />
                </View>
                <TouchableOpacity style={styles.proceedButton} onPress={() => setPaymentStep('pin')}>
                  <Text style={styles.proceedText}>Proceed to Pay</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {paymentStep === 'pin' && (
              <>
                <Text style={styles.pinTitle}>Enter FinSage PIN</Text>
                <Text style={styles.pinSubtitle}>Authenticate offline token generation</Text>
                <TextInput 
                  style={styles.pinInput}
                  keyboardType="numeric"
                  secureTextEntry
                  autoFocus={true}
                  maxLength={4}
                  value={pin}
                  onChangeText={setPin}
                />
                <TouchableOpacity style={styles.proceedButton} onPress={processPayment}>
                  <Text style={styles.proceedText}>Authorize ${paymentAmount}</Text>
                </TouchableOpacity>
              </>
            )}

            {paymentStep === 'success' && (
              <View style={styles.successContainer}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={60} color="#fff" />
                </View>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successAmount}>${paymentAmount} sent to {scannedUser?.name}</Text>
                <Text style={styles.successSubtitle}>Token generated offline and saved to device.</Text>
                <TouchableOpacity style={[styles.proceedButton, { marginTop: 40 }]} onPress={() => setShowPaymentModal(false)}>
                  <Text style={styles.proceedText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#02569B',
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    paddingTop: 50,
  },
  bankContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15 },
  bankText: { color: '#bbdefb', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  title: { fontSize: 16, color: '#e0e0e0', marginBottom: 5 },
  balance: { fontSize: 56, fontWeight: 'bold', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: '#bbdefb', marginTop: 5 },
  pendingBadge: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  pendingText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 25, marginTop: -20 },
  actionButton: { alignItems: 'center' },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, marginBottom: 8 },
  actionText: { fontSize: 14, fontWeight: '600', color: '#333' },

  historyContainer: { padding: 25 },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  historyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffebee', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  historyDetails: { flex: 1 },
  historyName: { fontSize: 16, fontWeight: '600', color: '#333' },
  historyDate: { fontSize: 12, color: '#f57c00', marginTop: 3 },
  historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#d32f2f' },

  modalContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  qrContainer: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  qrSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  qrWrapper: { padding: 20, backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  qrName: { fontSize: 22, fontWeight: 'bold', color: '#02569B', marginTop: 30 },

  scannerHeader: { position: 'absolute', top: 50, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' },
  scannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scannerBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#4CAF50', backgroundColor: 'transparent', borderRadius: 20 },
  scannerText: { color: '#fff', marginTop: 30, fontSize: 16, fontWeight: '600' },

  paymentModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  paymentModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, minHeight: '60%' },
  paymentHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  paymentProfile: { alignItems: 'center', marginBottom: 30 },
  paymentAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#02569B', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  paymentName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  paymentBank: { fontSize: 14, color: '#666', marginTop: 5 },
  amountInputContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  currencySymbol: { fontSize: 40, fontWeight: 'bold', color: '#333', marginRight: 5 },
  amountInput: { fontSize: 50, fontWeight: 'bold', color: '#02569B', minWidth: 100 },
  proceedButton: { backgroundColor: '#02569B', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 15, gap: 10 },
  proceedText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  pinTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, marginTop: 20 },
  pinSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  pinInput: { fontSize: 32, letterSpacing: 20, textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#02569B', marginHorizontal: 50, paddingBottom: 10, marginBottom: 50 },

  successContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  successAmount: { fontSize: 18, color: '#02569B', fontWeight: '600', marginBottom: 10 },
  successSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 }
});

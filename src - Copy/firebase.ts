import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
console.log("Firebase Project ID:", firebaseConfig.projectId);
console.log('[FIREBASE] API Key present:', !!firebaseConfig.apiKey);
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const storage = getStorage(app);

// IMPORTANT: This project uses a named database. Use the ID from config.
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

export const db = getFirestore(app, dbId);

// Diagnostic log to confirm the shared database instance
console.log("DB CHECK (init):", db);
console.log('[FIREBASE] Using Firestore Database ID:', dbId || '(default)');

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Simple test to verify the config is working
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log('[FIREBASE] Connection test successful.');
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error('[FIREBASE] Configuration Error: The client is offline. Check your API key and Auth Domain.');
    } else {
      console.log('[FIREBASE] Connection test completed (expected error if doc missing, but connection is alive).');
    }
  }
}

testConnection();

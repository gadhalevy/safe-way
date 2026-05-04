import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCGBbLRy19hyKjMBEGgF0SH5Jlv2eVIHlE',
  authDomain: 'safe-way-504b4.firebaseapp.com',
  projectId: 'safe-way-504b4',
  storageBucket: 'safe-way-504b4.firebasestorage.app',
  messagingSenderId: '366634986777',
  appId: '1:366634986777:web:89c373076a6da3464aa988',
  measurementId: 'G-TJT5VJW6RM',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

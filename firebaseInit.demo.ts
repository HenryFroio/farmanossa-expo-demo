// Demo Firebase Configuration
// This is a sanitized version for portfolio demonstration
// Production keys are securely stored and excluded from public repositories

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Demo configuration - Replace with actual keys in production
const firebaseConfig = {
  apiKey: "demo-api-key-for-portfolio",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:demo-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };

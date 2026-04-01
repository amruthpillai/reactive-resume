import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDlOmdtav-Nzo_JAE9GmBWjHvmCtavQTVY",
  authDomain: "resumebuilder-xyz.firebaseapp.com",
  projectId: "resumebuilder-xyz",
  storageBucket: "resumebuilder-xyz.firebasestorage.app",
  messagingSenderId: "1083077531880",
  appId: "1:1083077531880:web:d9c0a7b4032a682af3d15d",
  measurementId: "G-LWX1B3GH7C"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

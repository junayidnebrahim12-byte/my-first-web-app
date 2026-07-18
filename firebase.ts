import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQx38U0G-JEKQ69LOfFdJmlGnbJI-tz84",
  authDomain: "ultimate-atom-t8gvj.firebaseapp.com",
  projectId: "ultimate-atom-t8gvj",
  storageBucket: "ultimate-atom-t8gvj.firebasestorage.app",
  messagingSenderId: "79613260947",
  appId: "1:79613260947:web:dbf1b0a13d931908a80966"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, "ai-studio-2aacffdb-ad65-4f92-a72f-87ae65344c00");

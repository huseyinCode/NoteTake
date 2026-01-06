import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// CONFIGURATION & SETUP
// ==========================================
let firebaseConfig;
try {
    firebaseConfig = JSON.parse(__firebase_config);
} catch (e) {
    console.warn("Firebase config not found in __firebase_config, using placeholder");
    firebaseConfig = {}; // This will likely fail initialization if not set
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

export {
    auth,
    db,
    appId,
    signInAnonymously,
    onAuthStateChanged,
    signInWithCustomToken,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy
};

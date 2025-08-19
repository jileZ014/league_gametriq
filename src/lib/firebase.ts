import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'

// Your existing GameTriq Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSy4GsjVhHnvXCcRdqiJGWpBcZXFoYIz0jjQ",
  authDomain: "gametriq-32ed1.firebaseapp.com",
  projectId: "gametriq-32ed1",
  storageBucket: "gametriq-32ed1.firebasestorage.app",
  messagingSenderId: "829481448856",
  appId: "1:829481448856:web:2cc7d900B57f295fccd9d1"
}

// Initialize Firebase (prevent multiple initialization)
let app: FirebaseApp
let auth: Auth

if (!getApps().length) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

auth = getAuth(app)

// Set persistence for SSO across subdomains
setPersistence(auth, browserLocalPersistence)

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account',
  // Add hosted domain if you want to restrict to specific domain
  // hd: 'gametriq.com'
})

// Auth functions
export const signInWithGoogle = async () => {
  try {
    // Try popup first (better UX)
    const result = await signInWithPopup(auth, googleProvider)
    return { user: result.user, error: null }
  } catch (error: any) {
    // If popup blocked, fallback to redirect
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      try {
        await signInWithRedirect(auth, googleProvider)
        return { user: null, error: null } // Will handle in redirect callback
      } catch (redirectError: any) {
        console.error('Redirect sign-in error:', redirectError)
        return { user: null, error: redirectError }
      }
    }
    console.error('Sign-in error:', error)
    return { user: null, error }
  }
}

export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
    // Clear any local storage or session data if needed
    if (typeof window !== 'undefined') {
      // Clear any app-specific data
      localStorage.removeItem('userRole')
      localStorage.removeItem('leagueId')
    }
    return { success: true, error: null }
  } catch (error) {
    console.error('Sign-out error:', error)
    return { success: false, error }
  }
}

// Helper to get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser
}

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

// Export auth instance for use in other components
export { auth }

// Helper to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser
}

// Helper to get user token for API calls
export const getUserToken = async (): Promise<string | null> => {
  const user = auth.currentUser
  if (!user) return null
  
  try {
    const token = await user.getIdToken()
    return token
  } catch (error) {
    console.error('Error getting user token:', error)
    return null
  }
}

// Helper for SSO - check if user is logged in to main domain
export const checkSSOStatus = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(!!user)
    })
    
    // Timeout after 3 seconds
    setTimeout(() => {
      unsubscribe()
      resolve(false)
    }, 3000)
  })
}

export default app
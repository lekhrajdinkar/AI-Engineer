import { getApp, getApps, initializeApp } from 'firebase/app'
import { browserSessionPersistence, getAuth, setPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
)

export const firebaseApp = firebaseEnabled
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null
export const firebaseAuthReady = firebaseAuth
  ? setPersistence(firebaseAuth, browserSessionPersistence)
  : Promise.resolve()

import React from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { firebaseAuth, firebaseAuthReady, firebaseEnabled } from '../firebase'
import {
  getYouTubeConnectionStatus,
  startYouTubeConnection,
} from '../api/client'

export default function Profile() {
  const [user, setUser] = React.useState(firebaseAuth?.currentUser || null)
  const [error, setError] = React.useState('')
  const [youtube, setYoutube] = React.useState(null)

  React.useEffect(() => {
    if (!firebaseAuth) return undefined
    return firebaseAuth.onIdTokenChanged(setUser)
  }, [])

  React.useEffect(() => {
    if (!user) {
      setYoutube(null)
      return
    }
    getYouTubeConnectionStatus().then(setYoutube).catch(() => setYoutube(null))
  }, [user])

  React.useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return undefined
    let listener
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        getYouTubeConnectionStatus().then(setYoutube).catch(() => setYoutube(null))
      }
    }).then(handle => {
      listener = handle
    })
    return () => listener?.remove()
  }, [user])

  if (!firebaseEnabled) {
    return (
      <div className="card profile-card">
        <h1>Profile</h1>
        <p>Firebase is not configured for this environment yet.</p>
      </div>
    )
  }

  const signIn = async () => {
    setError('')
    try {
      await firebaseAuthReady
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle({
          skipNativeAuth: true,
        })
        const idToken = result.credential?.idToken
        if (!idToken) throw new Error('Google did not return an ID token.')
        const credential = GoogleAuthProvider.credential(
          idToken,
          result.credential?.accessToken,
        )
        await signInWithCredential(firebaseAuth, credential)
      } else {
        await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
      }
    } catch (requestError) {
      setError(requestError.message || 'Google sign-in failed.')
    }
  }

  const signUserOut = async () => {
    setError('')
    try {
      if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut()
      await signOut(firebaseAuth)
    } catch (requestError) {
      setError(requestError.message || 'Sign out failed.')
    }
  }

  const connectYouTube = async () => {
    setError('')
    try {
      const { authorize_url } = await startYouTubeConnection()
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: authorize_url })
      } else {
        window.location.assign(authorize_url)
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to start YouTube connection.')
    }
  }

  return (
    <section className="profile-card card">
      <h1>Profile</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {user ? (
        <>
          <div className="profile-identity">
            {user.photoURL
              ? <img src={user.photoURL} alt="" />
              : <span>{user.displayName?.charAt(0).toUpperCase() || '?'}</span>}
            <div>
              <strong>{user.displayName || 'Google user'}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <p>
            Your learning plans and source-sync metadata are private to this
            signed-in account.
          </p>
          <section className="profile-youtube">
            <div>
              <strong>YouTube connection</strong>
              <small>
                {youtube?.connected
                  ? `Connected${youtube.connected_at
                    ? ` · ${new Date(youtube.connected_at).toLocaleString()}`
                    : ''}`
                  : 'Not connected'}
              </small>
            </div>
            <button className="btn btn-secondary" onClick={connectYouTube}>
              {youtube?.connected ? 'Reconnect YouTube' : 'Connect YouTube'}
            </button>
          </section>
          <button className="btn btn-secondary" onClick={signUserOut}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <p>Sign in with Google to access your private learning plans.</p>
          <button className="btn btn-primary" onClick={signIn}>
            Continue with Google
          </button>
        </>
      )}
    </section>
  )
}

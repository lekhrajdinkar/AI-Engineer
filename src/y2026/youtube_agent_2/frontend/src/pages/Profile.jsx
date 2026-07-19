import React from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { firebaseAuth, firebaseEnabled } from '../firebase'

export default function Profile() {
  const [user, setUser] = React.useState(firebaseAuth?.currentUser || null)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!firebaseAuth) return
    return firebaseAuth.onIdTokenChanged(setUser)
  }, [])

  if (!firebaseEnabled) return <div className="card profile-card"><h1>Profile</h1><p>Firebase is not configured for this environment yet.</p></div>

  const signIn = async () => {
    setError('')
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
    } catch (requestError) {
      setError(requestError.message || 'Google sign-in failed.')
    }
  }

  return <section className="profile-card card"><h1>Profile</h1>{error && <div className="alert alert-error">{error}</div>}{user ? <><div className="profile-identity">{user.photoURL ? <img src={user.photoURL} alt="" /> : <span>{user.displayName?.charAt(0).toUpperCase() || '?'}</span>}<div><strong>{user.displayName || 'Google user'}</strong><small>{user.email}</small></div></div><p>Your learning plans and source-sync metadata are private to this signed-in account.</p><button className="btn btn-secondary" onClick={() => signOut(firebaseAuth)}>Sign out</button></> : <><p>Sign in with Google to access your private learning plans.</p><button className="btn btn-primary" onClick={signIn}>Continue with Google</button></>}</section>
}

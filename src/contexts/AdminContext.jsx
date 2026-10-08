import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { configured, fbAuth, fbDb } from '../services/firebase'

// Admin = a browser that signed in (anonymous Firebase account, no personal data) AND whose uid the machine owner has
// approved by adding  admins/<uid> = true  in the database. Only admins may save labels and publish a model
// (enforced by database.rules.json, not by this page).
const Ctx = createContext({ uid: null, isAdmin: false, requested: false, busy: false, signIn: () => {}, request: () => {}, signOut: () => {} })

export function AdminProvider({ children }) {
  const [uid, setUid] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [requested, setRequested] = useState(false)
  const [busy, setBusy] = useState(false)

  // restore an earlier session without creating a new account for ordinary visitors
  useEffect(() => {
    if (!configured) return undefined
    let known = false
    try { known = localStorage.getItem('adminDevice') === '1' } catch { /* ignore */ }
    if (!known) return undefined
    let off = () => {}
    fbAuth().then(({ auth, onAuthStateChanged }) => { off = onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null)) }).catch(() => {})
    return () => off()
  }, [])

  useEffect(() => {
    if (!uid) { setIsAdmin(false); setRequested(false); return undefined }
    let off1 = () => {}, off2 = () => {}
    fbDb().then(({ db, ref, onValue }) => {
      off1 = onValue(ref(db, 'admins/' + uid), (s) => setIsAdmin(s.val() === true), () => setIsAdmin(false))
      off2 = onValue(ref(db, 'admin_requests/' + uid), (s) => setRequested(s.exists()), () => {})
    }).catch(() => {})
    return () => { off1(); off2() }
  }, [uid])

  const signIn = useCallback(async () => {
    setBusy(true)
    try {
      const { auth, signInAnonymously, onAuthStateChanged } = await fbAuth()
      onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null))
      if (!auth.currentUser) await signInAnonymously(auth)
      try { localStorage.setItem('adminDevice', '1') } catch { /* ignore */ }
    } finally { setBusy(false) }
  }, [])

  const request = useCallback(async (name) => {
    if (!uid) return
    const { db, ref, set } = await fbDb()
    await set(ref(db, 'admin_requests/' + uid), { name: String(name || '').slice(0, 60), t: Date.now() })
  }, [uid])

  const signOut = useCallback(async () => {
    const { auth, signOut: so } = await fbAuth()
    await so(auth)
    try { localStorage.removeItem('adminDevice') } catch { /* ignore */ }
    setUid(null)
  }, [])

  return <Ctx.Provider value={{ uid, isAdmin, requested, busy, signIn, request, signOut, available: configured }}>{children}</Ctx.Provider>
}

export const useAdmin = () => useContext(Ctx)

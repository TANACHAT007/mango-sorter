import { firebaseConfig } from '../config'

// One lazily created Firebase app for the whole site (database for everyone, auth only when an admin signs in).
export const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL)
let dbPromise = null
let authPromise = null
let appPromise = null

function app() {
  if (!appPromise) appPromise = import('firebase/app').then(({ initializeApp }) => initializeApp(firebaseConfig))
  return appPromise
}

/** → { db, ref, onValue, get, set, update, remove, query, limitToLast, orderByChild } */
export function fbDb() {
  if (!configured) return Promise.reject(new Error('firebase not configured'))
  if (!dbPromise) {
    dbPromise = Promise.all([app(), import('firebase/database')]).then(([a, m]) => ({
      db: m.getDatabase(a), ref: m.ref, onValue: m.onValue, get: m.get, set: m.set, update: m.update, remove: m.remove,
      query: m.query, limitToLast: m.limitToLast, orderByChild: m.orderByChild,
    }))
  }
  return dbPromise
}

/** → { auth, signInAnonymously, onAuthStateChanged, signOut } */
export function fbAuth() {
  if (!configured) return Promise.reject(new Error('firebase not configured'))
  if (!authPromise) {
    authPromise = Promise.all([app(), import('firebase/auth')]).then(([a, m]) => ({
      auth: m.getAuth(a), signInAnonymously: m.signInAnonymously, onAuthStateChanged: m.onAuthStateChanged, signOut: m.signOut,
    }))
  }
  return authPromise
}

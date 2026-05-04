import { useState } from 'react';
import {
  signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';

const googleProvider = new GoogleAuthProvider();

export default function AuthPanel({ user }) {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'register') {
        const { user: u } = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(u, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      const msgs = {
        'auth/email-already-in-use': 'כתובת דוא"ל כבר רשומה',
        'auth/wrong-password': 'סיסמה שגויה',
        'auth/user-not-found': 'משתמש לא נמצא',
        'auth/weak-password': 'סיסמה חלשה מדי (מינימום 6 תווים)',
        'auth/invalid-email': 'כתובת דוא"ל לא תקינה',
      };
      setError(msgs[e.code] || e.message);
    } finally { setLoading(false); }
  };

  // ── Logged in ──────────────────────────────────────────────────────────
  if (user) {
    const initial = (user.displayName || user.email || '?')[0].toUpperCase();
    return (
      <div className="auth-user">
        {user.photoURL
          ? <img src={user.photoURL} alt="avatar" className="auth-avatar-lg" />
          : <div className="auth-avatar-letter-lg">{initial}</div>}
        <div className="auth-user-name">{user.displayName || 'משתמש רשום'}</div>
        <div className="auth-user-email">{user.email}</div>
        <div className="auth-user-score">✓ מחובר</div>
        <hr className="divider" style={{ width: '100%' }} />
        <p className="auth-note">
          כמשתמש מחובר, המקלטים שתוסיף יזוהו עמך.<br />
          בעתיד תוכל לצבור משוב חיובי מהקהילה.
        </p>
        <button
          className="btn btn-outline"
          style={{ width: '100%', marginTop: 10 }}
          onClick={() => signOut(auth)}
        >
          התנתקות
        </button>
      </div>
    );
  }

  // ── Not logged in ──────────────────────────────────────────────────────
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 16 }}>
        כניסה מאפשרת לעקוב אחר תרומותיך ולצבור משוב מהקהילה
      </p>

      {/* Google */}
      <button className="btn btn-outline" onClick={handleGoogle} disabled={loading} style={{ marginBottom: 14 }}>
        <span style={{ marginLeft: 8 }}>G</span> כניסה עם Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--c-muted)', fontSize: 13 }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--c-border)' }} />
        או עם דוא"ל
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--c-border)' }} />
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['login', 'register'].map((m) => (
          <button
            key={m}
            type="button"
            className={`type-btn ${mode === m ? 'selected-public' : ''}`}
            onClick={() => { setMode(m); setError(''); }}
            style={{ flex: 1 }}
          >
            {m === 'login' ? 'כניסה' : 'הרשמה'}
          </button>
        ))}
      </div>

      <form onSubmit={handleEmailAuth}>
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">שם מלא</label>
            <input className="form-input" placeholder="שמך" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">דוא"ל</label>
          <input className="form-input" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">סיסמה</label>
          <input className="form-input" type="password" placeholder="לפחות 6 תווים" value={password} onChange={(e) => setPass(e.target.value)} required />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '...' : mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
        </button>
      </form>

      <p className="auth-note" style={{ marginTop: 12 }}>
        ניתן גם להשתמש ביישום ולהוסיף מקלטים ללא כניסה
      </p>
    </div>
  );
}

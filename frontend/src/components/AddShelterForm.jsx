import { useState, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { geocodeAddress } from '../utils/geocode';

export default function AddShelterForm({ user, userPos, apiUrl, onSuccess }) {
  const [type, setType]           = useState('public');
  const [address, setAddress]     = useState('');
  const [floor, setFloor]         = useState('');
  const [capacity, setCapacity]   = useState('');
  const [notes, setNotes]         = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImgPrev]= useState(null);
  const [loading, setLoading]     = useState(false);
  const [status, setStatus]       = useState(null);
  const fileRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImgPrev(URL.createObjectURL(file));
  };

  const uploadImage = async (file) => {
    const ext = file.name.split('.').pop();
    const path = `shelters/${Date.now()}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setStatus({ type: 'error', msg: 'יש להזין כתובת' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      // גיאוקודינג ישירות מהדפדפן
      const { lat, lng, display } = await geocodeAddress(address);

      // העלאת תמונה (אופציונלי)
      let image_url = null;
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      }

      // שמירה ב-Firestore
      await addDoc(collection(db, 'shelters'), {
        address: display || address,
        lat, lng, type,
        floor:    type === 'building' ? floor || null : null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        notes:    notes || null,
        image_url,
        added_by: user ? user.uid : null,
        created_at: serverTimestamp(),
      });

      setStatus({ type: 'success', msg: '✓ המקלט נוסף בהצלחה!' });
      setAddress(''); setFloor(''); setCapacity(''); setNotes('');
      setImageFile(null); setImgPrev(null); setType('public');
      setTimeout(onSuccess, 1200);
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'אירעה שגיאה' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 14 }}>
        הוספת מקלט למאגר — כל אחד יכול לתרום
      </p>

      <div className="form-group">
        <label className="form-label">סוג מקלט</label>
        <div className="type-buttons">
          <button type="button" className={`type-btn ${type === 'public' ? 'selected-public' : ''}`} onClick={() => setType('public')}>
            🔴 ציבורי
          </button>
          <button type="button" className={`type-btn ${type === 'building' ? 'selected-building' : ''}`} onClick={() => setType('building')}>
            🟢 בית משותף
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">כתובת *</label>
        <input className="form-input" placeholder="לדוגמה: הרצל 10 תל אביב" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>

      {type === 'building' && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">קומה</label>
            <input className="form-input" placeholder="לדוגמה: −1" value={floor} onChange={(e) => setFloor(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">קיבולת</label>
            <input className="form-input" type="number" placeholder="מס' אנשים" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">הערות</label>
        <textarea className="form-textarea" placeholder="מידע נוסף שעשוי לסייע..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">תמונת מקלט (אופציונלי)</label>
        <div className="upload-area" onClick={() => fileRef.current.click()}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview
            ? <img src={imagePreview} alt="תצוגה מקדימה" className="upload-preview" />
            : <span>📷 לחץ להעלאת תמונה</span>}
        </div>
      </div>

      {status && <div className={`alert alert-${status.type}`}>{status.msg}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'מעבד...' : 'הוסף מקלט'}
      </button>

      {!user && (
        <p className="auth-note" style={{ marginTop: 10 }}>
          כניסה לחשבון תאפשר לך לצבור נקודות על תרומה למאגר
        </p>
      )}
    </form>
  );
}

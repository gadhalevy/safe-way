import { useState } from 'react';
import { geocodeAddress } from '../utils/geocode';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function distLabel(km) {
  return km < 1 ? `${Math.round(km * 1000)} מ'` : `${km.toFixed(2)} ק"מ`;
}

function findNearest(shelters, lat, lng) {
  let best = null, bestKm = Infinity;
  for (const s of shelters) {
    if (!s.lat || !s.lng) continue;
    const km = haversine(lat, lng, s.lat, s.lng);
    if (km < bestKm) { bestKm = km; best = s; }
  }
  return best ? { ...best, distance_km: bestKm, distance_label: distLabel(bestKm) } : null;
}

export default function FindNearest({ shelters, userPos, nearest, onNearestFound }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleMyLocation = () => {
    if (!userPos) { setError('המיקום שלך אינו זמין. אפשר גישה למיקום בדפדפן.'); return; }
    const result = findNearest(shelters, userPos.lat, userPos.lng);
    if (!result) { setError('לא נמצאו מקלטים במאגר.'); return; }
    setError('');
    onNearestFound(result);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true); setError('');
    try {
      const { lat, lng } = await geocodeAddress(address);
      const result = findNearest(shelters, lat, lng);
      if (!result) throw new Error('לא נמצאו מקלטים');
      onNearestFound(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPub = nearest?.type === 'public';

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 14 }}>
        מצא את המקלט הקרוב ביותר למיקום שלך או לכתובת מסוימת
      </p>

      <button className="btn btn-outline" onClick={handleMyLocation} style={{ marginBottom: 12 }}>
        📍 השתמש במיקום הנוכחי שלי
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', color: 'var(--c-muted)', fontSize: 13 }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--c-border)' }} />
        או
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--c-border)' }} />
      </div>

      <form onSubmit={handleSearch}>
        <div className="form-group">
          <label className="form-label">חפש לפי כתובת</label>
          <input className="form-input" placeholder="לדוגמה: הרצל 10 תל אביב" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading || !address.trim()}>
          {loading ? 'מחפש...' : 'חפש מקלט קרוב'}
        </button>
      </form>

      {nearest && (
        <div className="nearest-card">
          <h3>המקלט הקרוב ביותר</h3>
          <div className="nearest-address">{nearest.address || 'ללא כתובת'}</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="nearest-distance">{nearest.distance_label}</span>
            <span className={`nearest-type-badge ${isPub ? 'badge-public' : 'badge-building'}`}>
              {isPub ? '🔴 ציבורי' : '🟢 בית משותף'}
            </span>
          </div>
          {nearest.floor    && <div className="popup-detail" style={{ marginTop: 6 }}>קומה: {nearest.floor}</div>}
          {nearest.capacity && <div className="popup-detail">קיבולת: {nearest.capacity} אנשים</div>}
          {nearest.notes    && <div className="popup-detail">{nearest.notes}</div>}
          {nearest.image_url && <img src={nearest.image_url} alt="מקלט" className="popup-img" style={{ marginTop: 10 }} />}
          <p style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 8 }}>המפה מוצגת לפי מיקום המקלט</p>
        </div>
      )}
    </div>
  );
}

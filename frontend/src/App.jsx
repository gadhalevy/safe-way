import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function App() {
  const [user, setUser] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('add'); // 'add' | 'find' | 'auth'
  const [nearest, setNearest] = useState(null);
  const [flyTo, setFlyTo] = useState(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Fetch shelters from Firestore via realtime listener (done inside MapView)
  const openTab = useCallback((tab) => {
    setActiveTab(tab);
    setSidebarOpen(true);
  }, []);

  const handleNearestFound = useCallback((shelter) => {
    setNearest(shelter);
    if (shelter) setFlyTo({ lat: shelter.lat, lng: shelter.lng });
    setSidebarOpen(true);
    setActiveTab('find');
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="header-icon">🛡️</span>
          <span className="header-title">Safe Way</span>
          <span className="header-sub">מקלטים</span>
        </div>
        <div className="header-actions">
          <button
            className="btn-icon"
            onClick={() => openTab('auth')}
            title={user ? user.displayName || user.email : 'כניסה'}
          >
            {user
              ? (user.photoURL
                  ? <img src={user.photoURL} alt="avatar" className="avatar" />
                  : <span className="avatar-letter">{(user.displayName || user.email || '?')[0].toUpperCase()}</span>)
              : '👤'}
          </button>
        </div>
      </header>

      {/* Map (full screen under header) */}
      <MapView
        userPos={userPos}
        flyTo={flyTo}
        onSheltersLoaded={setShelters}
      />

      {/* Floating action buttons */}
      <div className="fab-group">
        <button className="fab" onClick={() => openTab('find')} title="מצא מקלט קרוב">
          🔍
        </button>
        <button className="fab fab-primary" onClick={() => openTab('add')} title="הוסף מקלט">
          ＋
        </button>
      </div>

      {/* Sidebar / Bottom sheet */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        userPos={userPos}
        nearest={nearest}
        onNearestFound={handleNearestFound}
        shelters={shelters}
        apiUrl={API}
      />

      {/* Overlay */}
      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

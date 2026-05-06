import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const makeCircleIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -12],
  });

const publicIcon   = makeCircleIcon('#dc2626'); // אדום
const buildingIcon = makeCircleIcon('#16a34a'); // ירוק
const defaultIcon  = makeCircleIcon('#dc2626'); // אדום כברירת מחדל לכל סוג לא מוכר

const myPosIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 5px rgba(37,99,235,0.22)"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

function getIcon(type) {
  if (type === 'building') return buildingIcon;
  if (type === 'public') return publicIcon;
  return defaultIcon; // כל סוג אחר — אדום
}

function FlyController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 17, { duration: 1 });
  }, [target, map]);
  return null;
}

function ShelterPopup({ s }) {
  const isPub = s.type !== 'building';
  return (
    <div className="popup-body">
      <div className="popup-type" style={{ color: isPub ? '#dc2626' : '#16a34a' }}>
        {isPub ? '🔴 מקלט ציבורי' : '🟢 מקלט בית משותף'}
      </div>
      <div className="popup-address">{s.address || s.name || 'ללא כתובת'}</div>
      {s.floor    && <div className="popup-detail">קומה: {s.floor}</div>}
      {s.capacity && <div className="popup-detail">קיבולת: {s.capacity} אנשים</div>}
      {s.notes    && <div className="popup-detail">{s.notes}</div>}
      {s.image_url && <img src={s.image_url} alt="מקלט" className="popup-img" />}
    </div>
  );
}

export default function MapView({ userPos, flyTo, onSheltersLoaded }) {
  const [shelters, setShelters] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shelters'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setShelters(list);
      onSheltersLoaded(list);
    });
    return unsub;
  }, [onSheltersLoaded]);

  const center = userPos ? [userPos.lat, userPos.lng] : [31.7683, 35.2137];

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={false}>
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyController target={flyTo} />

        {userPos && (
          <Marker position={[userPos.lat, userPos.lng]} icon={myPosIcon}>
            <Popup>
              <div className="popup-body">
                <div className="popup-type" style={{ color: '#2563eb' }}>📍 המיקום שלי</div>
              </div>
            </Popup>
          </Marker>
        )}

        {shelters.map((s) =>
          s.lat && s.lng ? (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={getIcon(s.type)}>
              <Popup maxWidth={260}><ShelterPopup s={s} /></Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>

      <div className="map-legend">
        <h4>מקרא</h4>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#dc2626' }} /><span>מקלט ציבורי</span></div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#16a34a' }} /><span>מקלט בית משותף</span></div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#2563eb' }} /><span>המיקום שלי</span></div>
      </div>
    </div>
  );
}

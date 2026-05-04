import AddShelterForm from './AddShelterForm';
import FindNearest from './FindNearest';
import AuthPanel from './AuthPanel';

const TABS = [
  { id: 'add',  label: '＋ הוסף מקלט' },
  { id: 'find', label: '🔍 מצא קרוב' },
  { id: 'auth', label: '👤 חשבון' },
];

export default function Sidebar({
  open, onClose, activeTab, onTabChange,
  user, userPos, nearest, onNearestFound, shelters, apiUrl,
}) {
  return (
    <div className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-handle" />

      <div className="sidebar-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`sidebar-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sidebar-body">
        {activeTab === 'add' && (
          <AddShelterForm
            user={user}
            userPos={userPos}
            apiUrl={apiUrl}
            onSuccess={onClose}
          />
        )}
        {activeTab === 'find' && (
          <FindNearest
            shelters={shelters}
            userPos={userPos}
            nearest={nearest}
            onNearestFound={onNearestFound}
            apiUrl={apiUrl}
          />
        )}
        {activeTab === 'auth' && (
          <AuthPanel user={user} />
        )}
      </div>
    </div>
  );
}

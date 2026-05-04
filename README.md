# 🛡️ Safe Way — מיפוי מקלטים בישראל

אפליקציית מפה אינטראקטיבית למציאת מקלטים ציבוריים ומקלטי בתים משותפים.

---

## ארכיטקטורה

```
safe-way/
├── backend/          # Python + FastAPI
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── serviceAccount.json   ← תוסיף אתה (לא מועלה ל-Git)
│   └── israel_shelters.json  ← קובץ הנתונים הראשוני
└── frontend/         # React
    ├── public/
    └── src/
        ├── firebase.js
        ├── App.jsx / App.css
        └── components/
            ├── MapView.jsx
            ├── Sidebar.jsx
            ├── AddShelterForm.jsx
            ├── FindNearest.jsx
            └── AuthPanel.jsx
```

---

## הגדרה ראשונית

### 1. Firebase Service Account (חובה לבאקאנד)

1. Firebase Console → **Project Settings** → לשונית **Service Accounts**
2. לחץ **Generate new private key** → הורד קובץ JSON
3. שמור אותו כ-`backend/serviceAccount.json`
4. **אל תעלה קובץ זה ל-Git!** (כבר נמצא ב-.gitignore)

### 2. Firebase Console — הגדרות נדרשות

#### Firestore
- צור מסד נתונים במצב **Production**
- העתק את כללי האבטחה מ-`firestore.rules` לתוך Firebase Console → Firestore → Rules

#### Authentication
- Firebase Console → **Authentication** → **Sign-in method**
- הפעל: **Google** + **Email/Password**

#### Storage
- Firebase Console → **Storage** → **Rules**
- העתק את הכללים מ-`storage.rules`

---

## הפעלה מקומית

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # ערוך לפי הצורך
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm start                     # פותח על http://localhost:3000
```

**הגדרת משתנה סביבה לפרונטאנד:**
צור קובץ `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:8000
```

---

## ייבוא נתונים ראשוניים

לאחר שהבאקאנד רץ, הרץ פעם אחת:

```bash
curl -X POST http://localhost:8000/api/import
```

הפקודה תקרא את `israel_shelters.json` ותייבא את כל הרשומות ל-Firestore.

---

## פריסה חינמית (Render + Vercel)

### Backend — Render (Free Tier)

1. העלה את הקוד ל-GitHub (ודא ש-`serviceAccount.json` ב-.gitignore)
2. Render.com → **New Web Service** → חבר ל-GitHub repo
3. הגדרות:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables** ב-Render:
   - `FIREBASE_SERVICE_ACCOUNT` — העתק את **תוכן** ה-JSON כולו כמחרוזת, או:
   - העלה את הקובץ ושמור ב-`/etc/secrets/serviceAccount.json` ועדכן את הנתיב
   - `STORAGE_BUCKET` = `safe-way-504b4.firebasestorage.app`

### Frontend — Vercel (Free)

```bash
cd frontend
npm install -g vercel
vercel
```

או חבר ישירות מ-vercel.com ל-GitHub.

**Environment Variable ב-Vercel:**
```
REACT_APP_API_URL=https://your-render-app.onrender.com
```

---

## API Endpoints

| Method | Path | תיאור |
|--------|------|--------|
| POST | `/api/geocode` | המרת כתובת לקואורדינטות (Nominatim) |
| GET  | `/api/shelters` | כל המקלטים |
| POST | `/api/shelters` | הוספת מקלט |
| GET  | `/api/shelters/nearest?lat=&lng=` | המקלט הקרוב ביותר |
| POST | `/api/upload` | העלאת תמונה ל-Storage |
| POST | `/api/import` | ייבוא israel_shelters.json |

---

## מבנה רשומת מקלט ב-Firestore

```json
{
  "address": "רחוב הרצל 10, תל אביב",
  "lat": 32.0853,
  "lng": 34.7818,
  "type": "public",        // "public" | "building"
  "floor": "-1",           // רלוונטי לבית משותף בלבד
  "capacity": 50,
  "notes": "פתוח 24/7",
  "image_url": "https://...",
  "added_by": "uid...",    // null אם לא מחובר
  "created_at": "timestamp"
}
```

---

## .gitignore מומלץ

```
backend/serviceAccount.json
backend/__pycache__/
backend/venv/
backend/.env
frontend/node_modules/
frontend/build/
frontend/.env
```

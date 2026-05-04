// src/utils/geocode.js

function cleanAddress(nominatimResult, userInput) {
  const addr = nominatimResult.address || {};
  const road = addr.road || addr.pedestrian || addr.footway || "";
  const city = addr.city || addr.town || addr.village || addr.suburb || "";

  // נסה לחלץ מספר בית מהקלט של המשתמש
  const numberMatch = userInput.match(/\b(\d+)\b/);
  const number = addr.house_number || (numberMatch ? numberMatch[1] : "");

  if (road && city) {
    return number ? `${road} ${number}, ${city}` : `${road}, ${city}`;
  }
  if (road) return number ? `${road} ${number}` : road;
  if (city) return city;
  return userInput;
}

export async function geocodeAddress(address) {
  const base = address.trim();

  const variants = [base];
  if (!base.toLowerCase().includes("israel") && !base.includes("ישראל")) {
    variants.push(`${base}, ישראל`);
    variants.push(`${base}, Israel`);
  }
  const withoutNumber = base.replace(/\s+\d+\s*$/, "").trim();
  if (withoutNumber !== base && withoutNumber.length > 2) {
    variants.push(withoutNumber);
    variants.push(`${withoutNumber}, ישראל`);
  }

  const headers = { "User-Agent": "SafeWayApp/1.0 (shelter-locator)" };

  for (const query of variants) {
    for (const extra of [{ countrycodes: "il" }, {}]) {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("accept-language", "he");
      if (extra.countrycodes) url.searchParams.set("countrycodes", extra.countrycodes);

      try {
        const resp = await fetch(url.toString(), { headers });
        const data = await resp.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            display: cleanAddress(data[0], base),
          };
        }
      } catch (_) {}
    }
  }

  throw new Error("הכתובת לא נמצאה. נסה: שם רחוב + מספר + עיר");
}
// lib/locations.ts
// Indian cities and pincode database with serviceability tags

export interface LocationInfo {
  pincode: string;
  area: string;
  city: string;
  state: string;
  quickCommerceAvailable: boolean; // Blinkit, Zepto, Swiggy Instamart 10-20 min delivery
  sameDayPharma: boolean;          // Apollo, 1mg, Netmeds same-day
}

export const PRESET_LOCATIONS: LocationInfo[] = [
  {
    pincode: "411017",
    area: "Pimpri / Rahatani",
    city: "Pune",
    state: "Maharashtra",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "411038",
    area: "Kothrud",
    city: "Pune",
    state: "Maharashtra",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "400050",
    area: "Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "400053",
    area: "Andheri West",
    city: "Mumbai",
    state: "Maharashtra",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "560034",
    area: "Koramangala",
    city: "Bengaluru",
    state: "Karnataka",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "560066",
    area: "Whitefield",
    city: "Bengaluru",
    state: "Karnataka",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "110001",
    area: "Connaught Place",
    city: "New Delhi",
    state: "Delhi",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "122002",
    area: "DLF Phase 1",
    city: "Gurugram",
    state: "Haryana",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "500081",
    area: "Hitec City / Madhapur",
    city: "Hyderabad",
    state: "Telangana",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "600028",
    area: "R.A. Puram / Mylapore",
    city: "Chennai",
    state: "Tamil Nadu",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
  {
    pincode: "700091",
    area: "Salt Lake Sector V",
    city: "Kolkata",
    state: "West Bengal",
    quickCommerceAvailable: true,
    sameDayPharma: true,
  },
];

const DEFAULT_LOCATION = PRESET_LOCATIONS[0];
const LOCATION_STORAGE_KEY = "wiseshopper_selected_location";

export function getSavedLocation(): LocationInfo {
  if (typeof window === "undefined") return DEFAULT_LOCATION;
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return DEFAULT_LOCATION;
    return JSON.parse(raw) as LocationInfo;
  } catch {
    return DEFAULT_LOCATION;
  }
}

export function saveSelectedLocation(loc: LocationInfo): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
}

export interface LatLon {
  lat: number;
  lon: number;
}

// Compass bearings in degrees clockwise from north; null = line not drawn
export interface MapBearings {
  sunrise: number | null;
  sunset: number | null;
  sun: number | null;
  shadow: number | null;
}

export interface SunReading {
  altitudeDeg: number;
  // 0-360 clockwise from north
  bearingDeg: number;
}

// Either end is null when the sun never reaches that altitude on the day
export interface TimeRange {
  start: Date | null;
  end: Date | null;
}

export type Daylight = 'normal' | 'polar-day' | 'polar-night';

export interface DayTimes {
  solarNoon: Date;
  sunrise: Date | null;
  sunset: Date | null;
  goldenMorning: TimeRange;
  goldenEvening: TimeRange;
  blueMorning: TimeRange;
  blueEvening: TimeRange;
  // Minutes between sunrise and sunset; 1440 in polar day, 0 in polar night
  dayLengthMin: number;
  daylight: Daylight;
}

// What the URL carries: place plus local date and time of day
export interface ViewState extends LatLon {
  // YYYY-MM-DD, device zone
  date: string;
  // HH:mm, 24 h, device zone
  time: string;
}

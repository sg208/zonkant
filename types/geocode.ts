export interface GeocodePlace {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export type SearchStatus = 'idle' | 'loading' | 'results' | 'empty' | 'error';

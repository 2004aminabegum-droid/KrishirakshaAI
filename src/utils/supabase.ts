import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if credentials exist
export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

// Real Supabase client instance (or null)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mock database data for offline/mock fallback
const MOCK_STORAGE_KEY_REQUESTS = 'krishirakshak_mock_requests';
const MOCK_STORAGE_KEY_HOTSPOTS = 'krishirakshak_mock_hotspots';

export interface ValidationRequest {
  id: string;
  scan_id: string;
  image: string;
  crop: string;
  type: 'disease' | 'pest';
  original_diagnosis: string;
  confidence: number;
  status: 'pending' | 'resolved';
  expert_verdict?: string | null;
  expert_notes?: string | null;
  farmer_name: string;
  farmer_location: string;
  farmer_id?: string;
  created_at: string;
}

export interface FarmRecord {
  id: string;
  farmer_id: string;
  name: string;
  crop: string;
  area_acres: number;
  village: string;
  created_at: string;
}

export interface HotspotRecord {
  id: string;
  crop: string;
  disease: string;
  severity: 'high' | 'medium' | 'low';
  latitude: number; // custom map simulation coordinates
  longitude: number;
  village: string;
  created_at: string;
}

// Initial mock hotspots for premium demonstration
const INITIAL_HOTSPOTS: HotspotRecord[] = [
  { id: 'h1', crop: 'Rice', disease: 'Rice Blast', severity: 'high', latitude: 22.5, longitude: 88.3, village: 'Dhaniakhali', created_at: new Date().toISOString() },
  { id: 'h2', crop: 'Potato', disease: 'Late Blight', severity: 'medium', latitude: 22.8, longitude: 88.1, village: 'Singur', created_at: new Date().toISOString() },
  { id: 'h3', crop: 'Tomato', disease: 'Tomato Yellow Leaf Curl', severity: 'high', latitude: 23.1, longitude: 88.5, village: 'Ranaghat', created_at: new Date().toISOString() },
  { id: 'h4', crop: 'Wheat', disease: 'Brown Leaf Rust', severity: 'low', latitude: 22.6, longitude: 87.8, village: 'Kolaghat', created_at: new Date().toISOString() },
  { id: 'h5', crop: 'Cotton', disease: 'Cotton Bollworm Infestation', severity: 'medium', latitude: 23.0, longitude: 87.9, village: 'Ghatal', created_at: new Date().toISOString() }
];

// Helper functions for Database interactions
export const dbService = {
  // --- Expert Validation Requests ---
  async getValidationRequests(): Promise<ValidationRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('validation_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data as ValidationRequest[];
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local simulation', err);
      }
    }

    // Fallback: localStorage
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(MOCK_STORAGE_KEY_REQUESTS);
    return stored ? JSON.parse(stored) : [];
  },

  async submitValidationRequest(request: Omit<ValidationRequest, 'created_at' | 'status'>): Promise<void> {
    const fullRequest: ValidationRequest = {
      ...request,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('validation_requests').insert([fullRequest]);
        if (!error) return;
        console.error('Supabase error inserting request', error);
      } catch (err) {
        console.warn('Supabase insert failed, caching locally', err);
      }
    }

    // Fallback: localStorage
    if (typeof window === 'undefined') return;
    const current = await this.getValidationRequests();
    // Check duplicate
    if (current.some(r => r.id === request.id)) return;
    
    current.unshift(fullRequest);
    localStorage.setItem(MOCK_STORAGE_KEY_REQUESTS, JSON.stringify(current));
  },

  async getFarms(farmerId?: string): Promise<FarmRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('farms').select('*').order('created_at', { ascending: false });
        if (farmerId) query = query.eq('farmer_id', farmerId);
        const { data, error } = await query;
        if (!error && data) return data as FarmRecord[];
      } catch (err) {
        console.warn('Supabase farms fetch failed', err);
      }
    }
    return [];
  },

  async createFarm(farm: Omit<FarmRecord, 'id' | 'created_at'>): Promise<FarmRecord | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase.from('farms').insert(farm).select().single();
    if (error) throw error;
    return data as FarmRecord;
  },

  async updateValidationVerdict(id: string, verdict: string, notes: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('validation_requests')
          .update({ expert_verdict: verdict, expert_notes: notes, status: 'resolved' })
          .eq('id', id);
        if (!error) return;
        console.error('Supabase error updating verdict', error);
      } catch (err) {
        console.warn('Supabase update failed, falling back to local simulation', err);
      }
    }

    // Fallback: localStorage
    if (typeof window === 'undefined') return;
    const current = await this.getValidationRequests();
    const updated = current.map(req => {
      if (req.id === id) {
        // Also mock adding a hotspot if severity was high or moderate
        if (verdict !== 'Flagged') {
          this.addHotspot({
            id: `h_auto_${Date.now()}`,
            crop: req.crop,
            disease: verdict,
            severity: req.confidence < 0.6 ? 'high' : 'medium',
            latitude: 22.4 + Math.random() * 0.8,
            longitude: 88.0 + Math.random() * 0.6,
            village: req.farmer_location || 'Unknown Village',
            created_at: new Date().toISOString()
          });
        }
        return {
          ...req,
          status: 'resolved' as const,
          expert_verdict: verdict,
          expert_notes: notes
        };
      }
      return req;
    });
    localStorage.setItem(MOCK_STORAGE_KEY_REQUESTS, JSON.stringify(updated));
  },

  // --- Geospatial Hotspots ---
  async getHotspots(): Promise<HotspotRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('hotspots')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data as HotspotRecord[];
      } catch (err) {
        console.warn('Supabase fetch hotspots failed, falling back to local simulation', err);
      }
    }

    // Fallback: localStorage
    if (typeof window === 'undefined') return INITIAL_HOTSPOTS;
    const stored = localStorage.getItem(MOCK_STORAGE_KEY_HOTSPOTS);
    if (!stored) {
      localStorage.setItem(MOCK_STORAGE_KEY_HOTSPOTS, JSON.stringify(INITIAL_HOTSPOTS));
      return INITIAL_HOTSPOTS;
    }
    return JSON.parse(stored);
  },

  async addHotspot(hotspot: HotspotRecord): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('hotspots').insert([hotspot]);
        if (!error) return;
      } catch (err) {
        console.warn('Supabase hotspot insert failed', err);
      }
    }

    // Fallback
    if (typeof window === 'undefined') return;
    const current = await this.getHotspots();
    current.unshift(hotspot);
    localStorage.setItem(MOCK_STORAGE_KEY_HOTSPOTS, JSON.stringify(current));
  }
};

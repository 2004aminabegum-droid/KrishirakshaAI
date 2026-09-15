export interface FarmPlot {
  id: string;
  name: string;
  crop: string;
  variety?: string;
  areaAcres: number;
  soilType: 'Alluvial' | 'Black' | 'Red' | 'Clay Loam' | 'Sandy Loam';
  irrigationType: 'Drip' | 'Sprinkler' | 'Canal' | 'Tube Well' | 'Rainfed';
  sowingDate: string;
  harvestTargetDate?: string;
  village: string;
  district: string;
  state: string;
  connectedIotNodeId?: string;
  healthScore?: number;
  createdAt: string;
}

export interface FarmerProfileData {
  id: string;
  kisanId: string;
  fullName: string;
  email: string;
  phone: string;
  altPhone?: string;
  village: string;
  block: string;
  district: string;
  state: string;
  pincode: string;
  primaryLanguage: 'en' | 'hi' | 'bn';
  avatarUrl?: string;
  pmKisanRegistered: boolean;
  soilHealthCardActive: boolean;
  kccActive: boolean;
  smsAlerts: boolean;
  whatsappAlerts: boolean;
  weatherWarningAlerts: boolean;
  farms: FarmPlot[];
  joinedDate: string;
}

export interface OfficerProfileData {
  id: string;
  officerCode: string;
  fullName: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  assignedZone: string;
  jurisdictionDistricts: string[];
  headquarters: string;
  badgeLevel: 'Regional Lead' | 'District Specialist' | 'Senior Agronomist';
  securityClearance: 'Level 4 - Executive' | 'Level 3 - Field Lead';
  onDuty: boolean;
  avatarUrl?: string;
  digitalSignatureVerified: boolean;
  emergencyAlertBroadcasts: number;
  validationsCompleted: number;
  joinedDate: string;
}

const FARMER_PROFILE_KEY = 'krishirakshak_farmer_profile';
const OFFICER_PROFILE_KEY = 'krishirakshak_officer_profile';

export const DEFAULT_FARMER_PROFILE: FarmerProfileData = {
  id: 'far_101',
  kisanId: 'KR-FAR-2026-8831',
  fullName: 'Rameshwar Mahato',
  email: 'kisan.mitra@gmail.com',
  phone: '+91 98321 44520',
  altPhone: '+91 94340 12890',
  village: 'Dhaniakhali',
  block: 'Dhaniakhali Block I',
  district: 'Hooghly',
  state: 'West Bengal',
  pincode: '712302',
  primaryLanguage: 'en',
  avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200',
  pmKisanRegistered: true,
  soilHealthCardActive: true,
  kccActive: true,
  smsAlerts: true,
  whatsappAlerts: true,
  weatherWarningAlerts: true,
  joinedDate: '2025-04-12',
  farms: [
    {
      id: 'farm_01',
      name: 'North Acre - Paddy Field',
      crop: 'Rice',
      variety: 'Swarna (MTU 7029)',
      areaAcres: 3.5,
      soilType: 'Alluvial',
      irrigationType: 'Canal',
      sowingDate: '2026-06-15',
      harvestTargetDate: '2026-11-20',
      village: 'Dhaniakhali',
      district: 'Hooghly',
      state: 'West Bengal',
      connectedIotNodeId: 'NODE-01-WB-HOOGHLY',
      healthScore: 92,
      createdAt: '2026-01-10T10:00:00Z'
    },
    {
      id: 'farm_02',
      name: 'East Polyhouse - Tomato',
      crop: 'Tomato',
      variety: 'Arka Rakshak',
      areaAcres: 1.2,
      soilType: 'Clay Loam',
      irrigationType: 'Drip',
      sowingDate: '2026-08-01',
      harvestTargetDate: '2026-12-15',
      village: 'Dhaniakhali',
      district: 'Hooghly',
      state: 'West Bengal',
      connectedIotNodeId: 'NODE-03-WB-HOOGHLY',
      healthScore: 84,
      createdAt: '2026-02-14T11:30:00Z'
    },
    {
      id: 'farm_03',
      name: 'South Field - Potato Tubers',
      crop: 'Potato',
      variety: 'Kufri Jyoti',
      areaAcres: 2.0,
      soilType: 'Sandy Loam',
      irrigationType: 'Tube Well',
      sowingDate: '2026-09-02',
      harvestTargetDate: '2027-01-10',
      village: 'Dhaniakhali',
      district: 'Hooghly',
      state: 'West Bengal',
      connectedIotNodeId: 'NODE-02-WB-HOOGHLY',
      healthScore: 78,
      createdAt: '2026-03-01T09:00:00Z'
    }
  ]
};

export const DEFAULT_OFFICER_PROFILE: OfficerProfileData = {
  id: 'off_901',
  officerCode: 'GOI-AGRI-OFF-8829',
  fullName: 'Dr. Debabrata Banerjee',
  designation: 'Senior District Agriculture Officer & Plant Pathologist',
  department: 'Department of Agriculture & Farmers Empowerment (Govt of West Bengal)',
  email: 'admin@gmail.com',
  phone: '+91 94330 99881',
  assignedZone: 'Eastern Gangetic Zone (Hooghly, Nadia & Burdwan Sector)',
  jurisdictionDistricts: ['Hooghly', 'Nadia', 'Purba Bardhaman', 'Howrah'],
  headquarters: 'District Agriculture Command Centre, Chinsurah',
  badgeLevel: 'Regional Lead',
  securityClearance: 'Level 4 - Executive',
  onDuty: true,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  digitalSignatureVerified: true,
  emergencyAlertBroadcasts: 14,
  validationsCompleted: 142,
  joinedDate: '2024-08-01'
};

export const profileService = {
  getFarmerProfile(userEmail?: string, userName?: string): FarmerProfileData {
    if (typeof window === 'undefined') return DEFAULT_FARMER_PROFILE;
    try {
      const stored = localStorage.getItem(FARMER_PROFILE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (userEmail && parsed.email !== userEmail && userEmail !== 'admin@gmail.com') {
          parsed.email = userEmail;
        }
        if (userName && userName !== 'Farmer' && parsed.fullName === DEFAULT_FARMER_PROFILE.fullName) {
          parsed.fullName = userName;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached farmer profile', e);
    }
    
    const initial = { ...DEFAULT_FARMER_PROFILE };
    if (userEmail && userEmail !== 'admin@gmail.com') initial.email = userEmail;
    if (userName && userName !== 'Farmer') initial.fullName = userName;
    try {
      localStorage.setItem(FARMER_PROFILE_KEY, JSON.stringify(initial));
    } catch {}
    return initial;
  },

  saveFarmerProfile(profile: FarmerProfileData): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(FARMER_PROFILE_KEY, JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('krishirakshak-farmer-profile-updated', { detail: profile }));
    } catch (e) {
      console.error('Failed to save farmer profile', e);
    }
  },

  getOfficerProfile(userEmail?: string, userName?: string): OfficerProfileData {
    if (typeof window === 'undefined') return DEFAULT_OFFICER_PROFILE;
    try {
      const stored = localStorage.getItem(OFFICER_PROFILE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (userEmail) parsed.email = userEmail;
        if (userName && userName !== 'Agriculture Officer Administrator' && parsed.fullName === DEFAULT_OFFICER_PROFILE.fullName) {
          parsed.fullName = userName;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached officer profile', e);
    }

    const initial = { ...DEFAULT_OFFICER_PROFILE };
    if (userEmail) initial.email = userEmail;
    if (userName && userName !== 'Agriculture Officer Administrator') initial.fullName = userName;
    try {
      localStorage.setItem(OFFICER_PROFILE_KEY, JSON.stringify(initial));
    } catch {}
    return initial;
  },

  saveOfficerProfile(profile: OfficerProfileData): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(OFFICER_PROFILE_KEY, JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('krishirakshak-officer-profile-updated', { detail: profile }));
    } catch (e) {
      console.error('Failed to save officer profile', e);
    }
  },

  addFarmPlot(plot: Omit<FarmPlot, 'id' | 'createdAt'>): FarmPlot {
    const profile = this.getFarmerProfile();
    const newPlot: FarmPlot = {
      ...plot,
      id: `farm_${Date.now()}`,
      createdAt: new Date().toISOString(),
      healthScore: plot.healthScore || Math.floor(80 + Math.random() * 18)
    };
    profile.farms.unshift(newPlot);
    this.saveFarmerProfile(profile);
    return newPlot;
  },

  updateFarmPlot(plotId: string, updated: Partial<FarmPlot>): void {
    const profile = this.getFarmerProfile();
    profile.farms = profile.farms.map(p => p.id === plotId ? { ...p, ...updated } : p);
    this.saveFarmerProfile(profile);
  },

  deleteFarmPlot(plotId: string): void {
    const profile = this.getFarmerProfile();
    profile.farms = profile.farms.filter(p => p.id !== plotId);
    this.saveFarmerProfile(profile);
  }
};

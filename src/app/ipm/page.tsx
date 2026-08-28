'use client';

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Header } from '../../components/Header';
import { 
  BookOpen, 
  Search, 
  Leaf, 
  Sprout, 
  Bug, 
  FlaskConical, 
  ArrowLeft,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

interface IPMSection {
  title: string;
  cultural: string[];
  biological: string[];
  chemical: string[];
}

const IPM_GUIDES: Record<string, IPMSection> = {
  Wheat: {
    title: 'Wheat Disease & Pest Management (गेहूं)',
    cultural: [
      'Practice 2-year crop rotation with legumes (chickpeas, mustard) to break fungal spore cycles.',
      'Sow seeds early (before mid-November) to reduce exposure to peak Rust spore concentrations.',
      'Ensure deep summer tillage to expose soil pathogens to natural solarization.',
      'Use certified seed and remove volunteer wheat plants that can carry rust between seasons.'
    ],
    biological: [
      'Inoculate seeds with Pseudomonas fluorescens or Trichoderma viride biological agents to build root pathogen immunity.',
      'Maintain biodiversity buffers to support ladybugs and hoverflies that eat aphid colonies.',
      'Release Trichogramma cards where caterpillar or armyworm pressure is confirmed.'
    ],
    chemical: [
      'Spray Propiconazole 25% EC (200 ml per acre) if leaf rust pustules cover more than 3% of lower leaf grids.',
      'Apply Tebuconazole fungicide in case of severe Head Blight anomalies.',
      'Rotate fungicide groups and follow the product label and local officer advice to reduce resistance.'
    ]
  },
  Rice: {
    title: 'Rice Blast & Water Management (धान / चावल)',
    cultural: [
      'Keep water depth consistently at 5-10 cm during vegetative cycles to discourage fungal Blast spores.',
      'Avoid excessive nitrogen top-dressing; split urea application into 3 cycles instead of 1.',
      'Remove and destroy stubble from previously infected paddy fields.',
      'Use clean seed, maintain proper spacing, and drain the field briefly when the soil remains saturated.'
    ],
    biological: [
      'Release Trichogramma japonicum egg parasites (50,000 per acre) to neutralize Leaf Folders and Stem Borers naturally.',
      'Apply Bacillus thuringiensis (Bt) sprays during early moth flight detections.',
      'Conserve spiders and beneficial beetles by avoiding broad-spectrum sprays during early crop growth.'
    ],
    chemical: [
      'Spray Tricyclazole 75% WP (120 grams per acre) immediately upon spot detection.',
      'Use Cartap Hydrochloride granules to control Stem Borers if economic threshold limit (ETL) is exceeded.',
      'Do not repeat the same fungicide group; confirm active disease and dosage with an agriculture officer.'
    ]
  },
  Potato: {
    title: 'Potato Late Blight Preventative Protocol (आलू)',
    cultural: [
      'Use certified disease-free seed tubers. Reject any tubers showing brown flesh rot.',
      'Heap soil around potato stems (high earthing-up) to block blight spores from washing down into tubers.',
      'Destroy self-sown wild potato plants in vicinity which act as viral reservoirs.',
      'Avoid working in wet foliage and remove crop debris after harvest.'
    ],
    biological: [
      'Spray bio-control agent Trichoderma harzianum onto leaves every 10 days in high humidity weather.',
      'Apply compost tea sprays to increase leaf canopy microbial competition.',
      'Use healthy compost and beneficial microbial seed treatment to support root-zone protection.'
    ],
    chemical: [
      'Apply preventative Mancozeb 75% WP (1 kg per acre) during cloudy, humid periods.',
      'Switch to curative Metalaxyl 8% + Mancozeb 64% (1.5 kg per acre) if late blight symptoms are validated.',
      'Maintain spray intervals from the product label and stop applications before the stated harvest interval.'
    ]
  },
  Tomato: {
    title: 'Tomato Yellow Leaf Curl Vector Management (टमाटर)',
    cultural: [
      'Install fine-mesh insect-proof netting (40-50 mesh size) over nursery beds.',
      'Place yellow sticky card traps around borders to attract and monitor whitefly vectors.',
      'Ensure fields are clean of weeds like Solanum nigrum (nightshade) which host leaf curl pathogens.',
      'Remove severely infected plants early and disinfect tools between blocks.'
    ],
    biological: [
      'Release predatory mites (Amblyseius swirskii) or lacewings to eat whitefly eggs and nymphs.',
      'Spray azadirachtin (concentrated neem oil extract) to disrupt whitefly feeding and reproductive cycles.',
      'Protect parasitoids and ladybirds by limiting unnecessary broad-spectrum insecticides.'
    ],
    chemical: [
      'Apply systemic insecticides like Imidacloprid 17.8% SL (100 ml per acre) to control whitefly carriers.',
      'Spray Thiamethoxam 25% WG if vector counts exceed 5 insects per leaf cluster.',
      'Rotate insecticide modes of action and follow label safety and pre-harvest instructions.'
    ]
  },
  Cotton: {
    title: 'Cotton Bollworm Integrated Control (कपास)',
    cultural: [
      'Sow early-maturing Bt-Cotton hybrids to bypass late-season bollworm populations.',
      'Sow trap crops like okra or pigeon pea (arhar) around borders to attract bollworm moths away from cotton.',
      'Hand-pick and destroy early-generation caterpillars and damaged bolls.',
      'Scout flowers and bolls twice weekly and remove alternate host weeds from field borders.'
    ],
    biological: [
      'Release Chrysoperla carnea (Green Lacewing) larvae (10,000 per acre) to prey on young bollworms.',
      'Spray Helicoverpa armigera Nuclear Polyhedrosis Virus (HaNPV) compounds in evening hours.',
      'Use pheromone traps to monitor adult moth activity before selecting a control.'
    ],
    chemical: [
      'Apply Chlorantraniliprole 18.5% SC (60 ml per acre) under high larval outbreak counts.',
      'Spray Spinosad 45% SC if insect vectors show resistance to standard pyrethroid compounds.',
      'Avoid calendar spraying and rotate chemical groups only when scouting crosses the local ETL.'
    ]
  },
  Maize: {
    title: 'Maize Leaf Disease & Fall Armyworm Management (मक्का)',
    cultural: [
      'Use clean seed, maintain recommended spacing, and remove volunteer maize before planting.',
      'Scout whorls weekly for shot holes, frass, and elongated blight lesions.',
      'Deeply incorporate infected residue and rotate with legumes after harvest.',
      'Avoid excessive nitrogen and water stress, which can increase disease severity.'
    ],
    biological: [
      'Conserve ladybirds, lacewings, and predatory earwigs in the field.',
      'Apply Beauveria bassiana or Bacillus thuringiensis when young larvae are detected.',
      'Use pheromone traps to monitor fall armyworm moth flights.'
    ],
    chemical: [
      'Use a labeled armyworm treatment only when scouting reaches the local economic threshold.',
      'Apply Mancozeb or a labeled fungicide for confirmed leaf blight and rotate modes of action.',
      'Follow product label, protective equipment, and pre-harvest interval requirements.'
    ]
  },
  Pepper: {
    title: 'Pepper Disease, Thrips & Bacterial Spot Management (মরিচ)',
    cultural: [
      'Use certified seed and sterilized nursery media; avoid planting into waterlogged beds.',
      'Provide airflow with proper spacing and remove weeds that shelter thrips and aphids.',
      'Avoid overhead irrigation and remove heavily spotted leaves from the field.',
      'Rotate pepper with a non-solanaceous crop for at least two seasons.'
    ],
    biological: [
      'Use blue or yellow sticky traps to monitor thrips and whitefly populations.',
      'Conserve Orius bugs, lacewings, and predatory mites in the crop.',
      'Apply neem-based products early and follow pollinator-safe application timing.'
    ],
    chemical: [
      'Use a labeled copper product for confirmed bacterial spot and keep foliage dry.',
      'Rotate registered thrips insecticides only when monitoring crosses the local ETL.',
      'Do not mix products unless the labels permit it; confirm dosage with an agriculture officer.'
    ]
  }
};

export default function IPMPage() {
  const { t } = useLanguage();
  const { role: authenticatedRole } = useAuth();
  const router = useRouter();

  const [selectedCrop, setSelectedCrop] = useState<string>('Wheat');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const role = authenticatedRole ?? 'farmer';

  const currentGuide = IPM_GUIDES[selectedCrop] || {
    title: 'Crop IPM Guide',
    cultural: [],
    biological: [],
    chemical: []
  };

  // Perform search filter on list
  const filterList = (list: string[]) => {
    if (!searchQuery) return list;
    return list.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredCultural = filterList(currentGuide.cultural);
  const filteredBiological = filterList(currentGuide.biological);
  const filteredChemical = filterList(currentGuide.chemical);

  const getLocalizedCrop = (cropName: string) => {
    switch (cropName.toLowerCase()) {
      case 'wheat': return t('cropWheat');
      case 'rice': return t('cropRice');
      case 'potato': return t('cropPotato');
      case 'tomato': return t('cropTomato');
      case 'cotton': return t('cropCotton');
      default: return cropName;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
      <div>
        <Header role={role} />

        <main className="max-w-5xl mx-auto px-4 py-8">
          
          {/* Back button */}
          <button
            onClick={() => router.push(role === 'farmer' ? '/dashboard/farmer' : '/dashboard/officer')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold mb-6 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-amber-500" />
              {t('ipmTitle')}
            </h2>
            <p className="text-slate-400 text-sm mt-1">{t('ipmDesc')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Sidebar selection (1 Col) */}
            <div className="space-y-4">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search methods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-green-600 focus:ring-1 focus:ring-green-950"
                />
              </div>

              {/* Crop selectors list */}
              <div className="glass-card p-4 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-2 mb-2 block">
                  Select Crop
                </span>
                {['Wheat', 'Rice', 'Potato', 'Tomato', 'Cotton', 'Maize', 'Pepper'].map((crop) => (
                  <button
                    key={crop}
                    onClick={() => { setSelectedCrop(crop); setSearchQuery(''); }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
                      selectedCrop === crop
                        ? 'bg-green-600/20 border border-green-500/20 text-green-300'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <Leaf className="h-3.5 w-3.5" />
                    {getLocalizedCrop(crop)}
                  </button>
                ))}
              </div>
            </div>

            {/* Handbook display (3 Cols) */}
            <div className="md:col-span-3 space-y-6">
              
              <div className="glass-card p-6 border border-slate-800 text-left">
                <h3 className="text-xl font-black text-white mb-6 border-b border-slate-900 pb-3 flex items-center gap-2">
                  <Sprout className="h-5.5 w-5.5 text-green-400" />
                  {currentGuide.title}
                </h3>

                <div className="space-y-6">
                  
                  {/* Cultural Control */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Sprout className="h-4.5 w-4.5 text-green-500" />
                      {t('culturalControl')}
                    </h4>
                    {filteredCultural.length === 0 ? (
                      <p className="text-xs text-slate-600 pl-6 italic">No matching methods found.</p>
                    ) : (
                      <ul className="space-y-2 pl-6 list-disc text-xs text-slate-400 leading-relaxed">
                        {filteredCultural.map((item, idx) => <li key={idx}>{item}</li>)}
                      </ul>
                    )}
                  </div>

                  {/* Biological Control */}
                  <div className="space-y-2 border-t border-slate-900 pt-6">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Bug className="h-4.5 w-4.5 text-amber-500" />
                      {t('biologicalControl')}
                    </h4>
                    {filteredBiological.length === 0 ? (
                      <p className="text-xs text-slate-600 pl-6 italic">No matching methods found.</p>
                    ) : (
                      <ul className="space-y-2 pl-6 list-disc text-xs text-slate-400 leading-relaxed">
                        {filteredBiological.map((item, idx) => <li key={idx}>{item}</li>)}
                      </ul>
                    )}
                  </div>

                  {/* Chemical Control */}
                  <div className="space-y-2 border-t border-slate-900 pt-6">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <FlaskConical className="h-4.5 w-4.5 text-rose-500" />
                      {t('chemicalControl')}
                    </h4>
                    {filteredChemical.length === 0 ? (
                      <p className="text-xs text-slate-600 pl-6 italic">No matching methods found.</p>
                    ) : (
                      <ul className="space-y-2 pl-6 list-disc text-xs text-slate-400 leading-relaxed">
                        {filteredChemical.map((item, idx) => <li key={idx}>{item}</li>)}
                      </ul>
                    )}
                  </div>

                </div>

                {/* Info disclaimer */}
                <div className="mt-8 border-t border-slate-900 pt-4 flex items-start gap-2.5 text-[10px] text-slate-500 leading-normal">
                  <Info className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                  <p>
                    Always cross-reference Chemical dosages with your regional block agriculture officer before major applications. Standard ETL values can change dynamically based on seasonal rainfall indices.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </main>
      </div>

      <footer className="w-full py-6 border-t border-slate-900 text-center bg-slate-950">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} KrishiRakshak AI. Sustainable farming guides.
        </p>
      </footer>
    </div>
  );
}

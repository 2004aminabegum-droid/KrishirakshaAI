/**
 * Unified Agricultural Taxonomy & Knowledge Base
 * KrishiRakshak AI Hybrid Engine
 */

import { IP102_PEST_TAXONOMY } from './imageClassifier';

export interface DiseaseKnowledge {
  className: string;
  crop: string;
  displayName: string;
  scientificName: string;
  symptoms: string[];
  organicRemedies: string[];
  chemicalRemedies: string[];
  preventativeMeasures: string[];
  severityDefault: 'Low' | 'Medium' | 'High';
}

export interface PestKnowledge {
  className: string;
  pestName: string;
  scientificName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  symptoms: string[];
  organicControl: string[];
  chemicalControl: string[];
}

export const DISEASE_TAXONOMY_KB: Record<string, DiseaseKnowledge> = {
  'Tomato___Early_blight': {
    className: 'Tomato___Early_blight',
    crop: 'Tomato',
    displayName: 'Tomato - Early Blight',
    scientificName: 'Alternaria solani',
    symptoms: [
      'Concentric target-board dark brown spots on older lower leaves',
      'Yellow chlorotic halo around leaf spots expanding outward',
      'Stem collar rot and dark sunken lesions near soil line'
    ],
    organicRemedies: [
      'Spray Neem Oil (5ml per L water) every 7 days',
      'Prune affected lower leaves 15cm above soil level',
      'Apply Trichoderma viride bio-fungicide to soil root zone'
    ],
    chemicalRemedies: [
      'Spray Chlorothalonil 75% WP @ 2.0g/L water',
      'Apply Mancozeb 75% WP @ 2.5g/L water at first symptom onset'
    ],
    preventativeMeasures: [
      'Maintain 60cm plant spacing for adequate air circulation',
      'Avoid overhead evening sprinkler irrigation',
      'Practice 3-year crop rotation with non-solanaceous crops'
    ],
    severityDefault: 'Medium'
  },
  'Tomato___Late_blight': {
    className: 'Tomato___Late_blight',
    crop: 'Tomato',
    displayName: 'Tomato - Late Blight',
    scientificName: 'Phytophthora infestans',
    symptoms: [
      'Large irregular water-soaked dark brown/black leaf lesions',
      'White fuzzy fungal bloom on lower leaf surface during high humidity',
      'Rapid wilting and collapse of entire foliage'
    ],
    organicRemedies: [
      'Apply Copper Hydroxide / Bordeaux mixture (1%)',
      'Remove and burn severely infected plant foliage immediately'
    ],
    chemicalRemedies: [
      'Spray Metalaxyl 8% + Mancozeb 64% WP @ 2.5g/L water',
      'Apply Cymoxanil + Mancozeb @ 2.0g/L during high risk weather'
    ],
    preventativeMeasures: [
      'Plant certified disease-free seedlings',
      'Destroy solanaceous weed hosts near crop borders'
    ],
    severityDefault: 'High'
  },
  'Potato___Early_blight': {
    className: 'Potato___Early_blight',
    crop: 'Potato',
    displayName: 'Potato - Early Blight',
    scientificName: 'Alternaria solani',
    symptoms: [
      'Dark brown oval leaf spots with characteristic concentric rings',
      'Yellowing of surrounding leaf tissue starting from basal leaves'
    ],
    organicRemedies: [
      'Spray bio-control agent Bacillus subtilis',
      'Mulch soil heavily to prevent rain-splash spore dispersal'
    ],
    chemicalRemedies: [
      'Spray Propineb 70% WP @ 2.0g/L water',
      'Apply Difenoconazole 25% EC @ 0.5ml/L water'
    ],
    preventativeMeasures: [
      'Maintain balanced Nitrogen and Potassium nutrition',
      'Ridge soil high around stems to cover tubers'
    ],
    severityDefault: 'Medium'
  },
  'Potato___Late_blight': {
    className: 'Potato___Late_blight',
    crop: 'Potato',
    displayName: 'Potato - Late Blight',
    scientificName: 'Phytophthora infestans',
    symptoms: [
      'Rapidly expanding dark water-soaked necrotic leaf margins',
      'White cottony spore growth beneath leaves under wet conditions'
    ],
    organicRemedies: [
      'Spray Copper Oxychloride 50% WP @ 3.0g/L',
      'Destroy crop residue after harvest'
    ],
    chemicalRemedies: [
      'Spray Dimethomorph 50% WP @ 1.0g/L water',
      'Apply Mandipropamid 23.4% SC @ 0.8ml/L water'
    ],
    preventativeMeasures: [
      'Kill haulms 10-14 days before harvest',
      'Avoid harvesting tubers during wet soil conditions'
    ],
    severityDefault: 'High'
  },
  'Rice___Leaf_Blast': {
    className: 'Rice___Leaf_Blast',
    crop: 'Rice',
    displayName: 'Rice - Leaf Blast',
    scientificName: 'Magnaporthe oryzae',
    symptoms: [
      'Diamond or spindle-shaped leaf lesions with grey/white centers',
      'Reddish-brown border around blast lesions causing leaf desiccation'
    ],
    organicRemedies: [
      'Spray Pseudomonas fluorescens @ 10g/L water',
      'Apply fresh cow dung slurry extract (5%) to paddy foliage'
    ],
    chemicalRemedies: [
      'Spray Tricyclazole 75% WP @ 0.6g/L water',
      'Apply Isoprothiolane 40% EC @ 1.5ml/L water'
    ],
    preventativeMeasures: [
      'Avoid excessive Nitrogen fertilizer applications',
      'Maintain 5-7cm continuous water standing depth during tillering'
    ],
    severityDefault: 'High'
  },
  'Rice___Brown_Spot': {
    className: 'Rice___Brown_Spot',
    crop: 'Rice',
    displayName: 'Rice - Brown Spot',
    scientificName: 'Bipolaris oryzae',
    symptoms: [
      'Small oval or circular sesame-seed shaped brown spots',
      'Yellow chlorotic halo surrounding reddish-brown spots'
    ],
    organicRemedies: [
      'Soak seeds in 1% Trichoderma harzianum solution before sowing',
      'Apply Vermicompost to correct soil nutrient depletion'
    ],
    chemicalRemedies: [
      'Spray Mancozeb 75% WP @ 2.5g/L water',
      'Apply Edifenphos 50% EC @ 1.0ml/L water'
    ],
    preventativeMeasures: [
      'Apply Potash and Zinc Sulfate top-dressing',
      'Ensure proper land leveling and field drainage'
    ],
    severityDefault: 'Medium'
  },
  'Maize___Common_Rust': {
    className: 'Maize___Common_Rust',
    crop: 'Maize',
    displayName: 'Maize - Common Rust',
    scientificName: 'Puccinia sorghi',
    symptoms: [
      'Cinnamon-brown to golden powdery pustules on upper & lower leaf surfaces',
      'Pustules turn dark brown/black as plant matures'
    ],
    organicRemedies: [
      'Apply Sulfur-based organic bio-fungicide @ 3g/L',
      'Prune severely infected lower leaves'
    ],
    chemicalRemedies: [
      'Spray Azoxystrobin 23% SC @ 1.0ml/L water',
      'Apply Tebuconazole 25.9% EC @ 1.25ml/L water'
    ],
    preventativeMeasures: [
      'Plant rust-resistant hybrid maize varieties',
      'Avoid late sowing dates in rust-endemic zones'
    ],
    severityDefault: 'Medium'
  },
  'Pepper___Bacterial_Spot': {
    className: 'Pepper___Bacterial_Spot',
    crop: 'Pepper',
    displayName: 'Pepper - Bacterial Spot',
    scientificName: 'Xanthomonas euvesicatoria',
    symptoms: [
      'Small dark brown irregular raised spots on leaves',
      'Premature defoliation leaving pepper fruits exposed to sunscald'
    ],
    organicRemedies: [
      'Spray Copper Hydroxide 77% WP @ 2.0g/L',
      'Soak seeds in hot water (50°C for 25 mins) before planting'
    ],
    chemicalRemedies: [
      'Spray Copper Oxychloride + Streptocycline (200 ppm) @ 0.2g/L'
    ],
    preventativeMeasures: [
      'Use certified disease-free seeds',
      'Sanitize farm implements and seedling trays'
    ],
    severityDefault: 'Medium'
  },
  'Wheat___Brown_rust': {
    className: 'Wheat___Brown_rust',
    crop: 'Wheat',
    displayName: 'Wheat - Brown Leaf Rust',
    scientificName: 'Puccinia recondita',
    symptoms: [
      'Small round reddish-orange/brown pustules randomly scattered on leaf blades',
      'Yellow chlorotic halos surrounding rusty brown pustules',
      'Premature leaf drying leading to reduced grain filling'
    ],
    organicRemedies: [
      'Spray Sulfur-based organic bio-fungicide @ 3g/L water',
      'Apply bio-control agent Trichoderma harzianum @ 10g/L'
    ],
    chemicalRemedies: [
      'Spray Propiconazole 25% EC @ 1.0ml/L water at first sign of rust',
      'Apply Tebuconazole 25.9% EC @ 1.25ml/L water'
    ],
    preventativeMeasures: [
      'Sow rust-resistant Wheat varieties (e.g. HD-2967, PBW-550)',
      'Avoid late sowing dates to escape rust peak inoculum period'
    ],
    severityDefault: 'High'
  },
  'Wheat___Yellow_rust': {
    className: 'Wheat___Yellow_rust',
    crop: 'Wheat',
    displayName: 'Wheat - Yellow Stripe Rust',
    scientificName: 'Puccinia striiformis',
    symptoms: [
      'Bright yellow-orange pustules arranged in prominent linear stripes along leaf veins',
      'Powdery yellow spores rubbing off on fingers when leaf is touched',
      'Severe foliar desiccation during cool, moist spring weather'
    ],
    organicRemedies: [
      'Spray bio-fungicide Bacillus subtilis @ 5g/L water',
      'Apply Sulfur 80% WDG @ 3.0g/L water'
    ],
    chemicalRemedies: [
      'Spray Tebuconazole 50% + Trifloxystrobin 25% WG @ 0.7g/L water',
      'Apply Propiconazole 25% EC @ 1.0ml/L at first stripe detection'
    ],
    preventativeMeasures: [
      'Plant stripe rust tolerant wheat varieties (e.g. DBW-187, HD-3226)',
      'Destroy volunteer wheat plants in field borders prior to sowing'
    ],
    severityDefault: 'High'
  },
  'Wheat___Stem_rust': {
    className: 'Wheat___Stem_rust',
    crop: 'Wheat',
    displayName: 'Wheat - Stem Rust',
    scientificName: 'Puccinia graminis',
    symptoms: [
      'Large reddish-brown torn pustules primarily on stems, leaf sheaths & glumes',
      'Epidermal tissue ruptured with dark reddish spore masses'
    ],
    organicRemedies: [
      'Spray bio-agent Pseudomonas fluorescens @ 10g/L',
      'Eradicate alternate barberry host bushes near field borders'
    ],
    chemicalRemedies: [
      'Spray Mancozeb 75% WP @ 2.5g/L water',
      'Apply Azoxystrobin + Cyproconazole @ 1.0ml/L water'
    ],
    preventativeMeasures: [
      'Sow early to avoid late-season stem rust spore showers'
    ],
    severityDefault: 'High'
  },
  'Wheat___Septoria': {
    className: 'Wheat___Septoria',
    crop: 'Wheat',
    displayName: 'Wheat - Septoria Leaf Blotch',
    scientificName: 'Zymoseptoria tritici',
    symptoms: [
      'Irregular greyish-brown specked leaf lesions containing tiny black dots (pycnidia)',
      'Lesions restricted by parallel leaf veins turning straw-colored'
    ],
    organicRemedies: [
      'Apply Copper Oxychloride 50% WP @ 3.0g/L',
      'Prune heavily infected lower canopy leaves'
    ],
    chemicalRemedies: [
      'Spray Epoxiconazole + Pyraclostrobin @ 1.0ml/L water',
      'Apply Chlorothalonil 75% WP @ 2.0g/L water'
    ],
    preventativeMeasures: [
      'Incorporate infected crop residue deeply into soil after harvest'
    ],
    severityDefault: 'Medium'
  },
  'Wheat___Powdery_mildew': {
    className: 'Wheat___Powdery_mildew',
    crop: 'Wheat',
    displayName: 'Wheat - Powdery Mildew',
    scientificName: 'Blumeria graminis',
    symptoms: [
      'White to pale grey powdery fungal patches on upper leaf surfaces',
      'Patches turn dull brown with tiny black fruiting bodies as crop matures'
    ],
    organicRemedies: [
      'Spray Potassium Bicarbonate solution (5g/L water)',
      'Apply Sulfur 80% WP @ 3g/L water'
    ],
    chemicalRemedies: [
      'Spray Fenpropimorph 750 EC @ 1.0ml/L water',
      'Apply Triadimefon 25% WP @ 1.0g/L water'
    ],
    preventativeMeasures: [
      'Avoid dense crop canopy planting to improve sunlight penetration'
    ],
    severityDefault: 'Medium'
  },
  'Wheat___Tan_spot': {
    className: 'Wheat___Tan_spot',
    crop: 'Wheat',
    displayName: 'Wheat - Tan Spot',
    scientificName: 'Pyrenophora tritici-repentis',
    symptoms: [
      'Tan-colored oval lesions with a small dark brown spot in center surrounded by yellow halo',
      'Coalescing lesions causing extensive leaf tip necrosis'
    ],
    organicRemedies: [
      'Apply Trichoderma harzianum bio-control agent to crop residue',
      'Rotate with non-host legumes or mustard'
    ],
    chemicalRemedies: [
      'Spray Propiconazole 25% EC @ 1.0ml/L water'
    ],
    preventativeMeasures: [
      'Practice minimum 2-year crop rotation out of wheat'
    ],
    severityDefault: 'Medium'
  },
  'Wheat___Healthy': {
    className: 'Wheat___Healthy',
    crop: 'Wheat',
    displayName: 'Wheat - Healthy Leaf',
    scientificName: 'Triticum aestivum',
    symptoms: [
      'Vibrant green erect leaf blades, smooth parallel veins, crisp firm tissue'
    ],
    organicRemedies: [
      'Maintain balanced NPK fertilizer schedule'
    ],
    chemicalRemedies: [
      'No chemical treatment needed'
    ],
    preventativeMeasures: [
      'Ensure adequate field irrigation at tillering and flowering stages'
    ],
    severityDefault: 'Low'
  }
};

export const PEST_TAXONOMY_KB: Record<string, PestKnowledge> = {
  'Aphid': {
    className: 'Aphid',
    pestName: 'Cotton & Green Peach Aphid',
    scientificName: 'Aphis gossypii / Myzus persicae',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Clustered tiny green/black insects on tender leaf undersides and shoot tips',
      'Sticky honeydew secretion leading to black sooty mold growth',
      'Curling, crinkling, and distortion of young developing leaves'
    ],
    organicControl: [
      'Spray Neem Oil (10,000 ppm) @ 3ml/L water with mild soap solution',
      'Release predatory Ladybird beetles (Coccinella septempunctata) @ 500/acre',
      'Install yellow sticky traps @ 12-15 traps per acre'
    ],
    chemicalControl: [
      'Spray Imidacloprid 17.8% SL @ 0.5ml/L water',
      'Apply Thiamethoxam 25% WG @ 0.25g/L water'
    ]
  },
  'Bollworm': {
    className: 'Bollworm',
    pestName: 'American & Pink Bollworm',
    scientificName: 'Helicoverpa armigera / Pectinophora gossypiella',
    riskLevel: 'HIGH',
    symptoms: [
      'Bored entrance holes in bolls, pods, buds, and fruits with visible frass',
      'Premature shedding of squares, blossoms, and young fruit structures',
      'Internal tunneling and hollowed seed cavities'
    ],
    organicControl: [
      'Install sex pheromone traps (Helilure/Gossyplure) @ 5-8 traps/acre',
      'Spray Bacillus thuringiensis (Bt var. kurstaki) @ 2.0g/L water',
      'Release Trichogramma chilonis egg parasitoids @ 50,000/acre'
    ],
    chemicalControl: [
      'Spray Chlorantraniliprole 18.5% SC @ 0.3ml/L water',
      'Apply Emamectin Benzoate 5% SG @ 0.4g/L water',
      'Spray Flubendiamide 39.35% SC @ 0.25ml/L water'
    ]
  },
  'Brown_Planthopper': {
    className: 'Brown_Planthopper',
    pestName: 'Brown Planthopper (BPH)',
    scientificName: 'Nilaparvata lugens',
    riskLevel: 'HIGH',
    symptoms: [
      'Circular patches of dried, lodged, straw-colored plants ("Hopperburn")',
      'Nymphs and macropterous adults aggregated at basal stem tillers near water',
      'Severe crop lodging and soot development'
    ],
    organicControl: [
      'Drain standing water from paddy fields for 3-4 days to disrupt nymph development',
      'Maintain 20cm alleyways every 2 meters for aeration ("Skip Row Method")',
      'Conserve natural mirid bug predators (Cyrtorhinus lividipennis)'
    ],
    chemicalControl: [
      'Spray Pymetrozine 50% WDG @ 0.6g/L water directed at plant base',
      'Apply Dinotefuran 20% SG @ 0.4g/L water',
      'Spray Triflumezopyrim 10% SC @ 0.5ml/L water'
    ]
  },
  'Whitefly': {
    className: 'Whitefly',
    pestName: 'Cotton & Tobacco Whitefly',
    scientificName: 'Bemisia tabaci',
    riskLevel: 'HIGH',
    symptoms: [
      'Tiny moth-like white insects fluttering when foliage is shaken',
      'Yellow chlorotic leaf mottling and vector transmission of Gemini viruses (Leaf Curl)',
      'Black sooty mold accumulation covering photosynthetic foliage'
    ],
    organicControl: [
      'Install yellow sticky traps @ 15-20 traps per acre at canopy height',
      'Spray Neem Seed Kernel Extract (NSKE 5%) @ 50ml/L water',
      'Apply entomopathogenic fungus Verticillium lecanii @ 5g/L water'
    ],
    chemicalControl: [
      'Spray Diafenthiuron 50% WP @ 1.2g/L water',
      'Apply Spiromesifen 22.9% SC @ 1.0ml/L water',
      'Spray Pyriproxyfen 10% EC @ 1.5ml/L water'
    ]
  },
  'Fruit_Fly': {
    className: 'Fruit_Fly',
    pestName: 'Oriental & Melon Fruit Fly',
    scientificName: 'Bactrocera dorsalis / Zeugodacus cucurbitae',
    riskLevel: 'HIGH',
    symptoms: [
      'Resinous puncture marks on ripening fruit rind / pericarp',
      'Internal maggot feeding causing watery fruit rot and premature fruit fall',
      'Sunken brown necrotic oviposition blemishes'
    ],
    organicControl: [
      'Install Methyl Eugenol / Cue-lure pheromone traps @ 6-8 traps/acre',
      'Collect and deeply bury (> 60cm) fallen infested fruits',
      'Wrap developing fruits in parchment bags or netting'
    ],
    chemicalControl: [
      'Apply bait spray: Malathion 50% EC (2ml) + Jaggery/Molasses (10g) per L water',
      'Spray Spinosad 45% SC @ 0.3ml/L water during pre-harvest'
    ]
  },
  'Thrips': {
    className: 'Thrips',
    pestName: 'Chilli & Onion Thrips',
    scientificName: 'Scirtothrips dorsalis / Thrips tabaci',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Upward curling of leaf margins ("Boat-shaped leaves")',
      'Silvery-white patches with dark fecal specks on lower leaf surfaces',
      'Bronzing, rough corky texture, and flower bud abortion'
    ],
    organicControl: [
      'Install blue sticky traps @ 15 traps per acre for selective thrips trapping',
      'Spray Pongamia / Karanja oil @ 5ml/L with mild surfactant',
      'Apply Lecanicillium lecanii bio-agent @ 5g/L water'
    ],
    chemicalControl: [
      'Spray Fipronil 5% SC @ 1.5ml/L water',
      'Apply Spinetoram 11.7% SC @ 0.8ml/L water',
      'Spray Acetamiprid 20% SP @ 0.3g/L water'
    ]
  },
  'Fall_Armyworm': {
    className: 'Fall_Armyworm',
    pestName: 'Fall Armyworm (FAW)',
    scientificName: 'Spodoptera frugiperda',
    riskLevel: 'HIGH',
    symptoms: [
      'Extensive window-paning on leaf whorls with heavy granular frass',
      'Ragged "shot-hole" tears across emerging crop leaves',
      'Destruction of growing central shoot / whorl'
    ],
    organicControl: [
      'Apply fine sand/sawdust mixed with neem cake into central crop whorls',
      'Spray Metarhizium rileyi / Spodoptera NPV @ 3g/L water',
      'Install FAW pheromone traps @ 4-6 traps per acre'
    ],
    chemicalControl: [
      'Spray Chlorantraniliprole 18.5% SC @ 0.4ml/L into crop whorls',
      'Apply Spinetoram 11.7% SC @ 0.5ml/L water'
    ]
  },
  'Stem_Borer': {
    className: 'Stem_Borer',
    pestName: 'Yellow & Spotted Stem Borer',
    scientificName: 'Scirpophaga incertulas / Chilo partellus',
    riskLevel: 'HIGH',
    symptoms: [
      'Drying of the central shoot tiller producing "Dead Heart" at vegetative stage',
      'Whitened, empty, erect panicles producing "White Ears" at reproductive stage',
      'Borer exit holes and frass near basal stem nodes'
    ],
    organicControl: [
      'Clip and destroy seedling leaf tips prior to transplanting to remove egg masses',
      'Release Trichogramma japonicum parasitoid cards @ 40,000/acre weekly',
      'Install yellow pheromone traps with lure @ 8 traps/acre'
    ],
    chemicalControl: [
      'Broadcast Cartap Hydrochloride 4% G @ 7.5 kg/acre',
      'Apply Chlorantraniliprole 0.4% G @ 4.0 kg/acre or spray SC @ 0.3ml/L'
    ]
  },
  'Leafhopper': {
    className: 'Leafhopper',
    pestName: 'Green Rice Leafhopper',
    scientificName: 'Nephotettix virescens',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Yellowing and stunting of plants from leaf tip downward',
      'Vector transmission of Rice Tungro Virus (RTV)',
      'Leaves turning orange-yellow with reduced tillering'
    ],
    organicControl: [
      'Light traps installed during night hours to attract leafhopper swarms',
      'Spray 5% Neem extract or Azadirachtin 1% @ 2ml/L'
    ],
    chemicalControl: [
      'Spray Imidacloprid 17.8% SL @ 0.3ml/L water',
      'Apply Buprofezin 25% SC @ 1.5ml/L water'
    ]
  },
  'Spider_Mite': {
    className: 'Spider_Mite',
    pestName: 'Two-Spotted Red Spider Mite',
    scientificName: 'Tetranychus urticae',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Fine white/yellow stippling speckles on upper leaf surface',
      'Fine webbing spun across leaf undersides, buds, and growing tips',
      'Foliage turning rusty brown, dry, and brittle'
    ],
    organicControl: [
      'Apply Wettable Sulfur 80% WDG @ 3.0g/L water',
      'Spray Neem seed extract or agricultural mineral oil (2%)',
      'Release predatory mites (Phytoseiulus persimilis)'
    ],
    chemicalControl: [
      'Spray Spiromesifen 22.9% SC @ 1.0ml/L water',
      'Apply Propargite 57% EC @ 2.0ml/L water',
      'Spray Fenpyroximate 5% EC @ 1.0ml/L water'
    ]
  },
  'Cutworm': {
    className: 'Cutworm',
    pestName: 'Black Cutworm',
    scientificName: 'Agrotis ipsilon',
    riskLevel: 'HIGH',
    symptoms: [
      'Seedling stems severed cleanly at ground level overnight',
      'Fallen, wilted young plants lying on soil surface',
      'C-shaped greasy black/grey larvae hiding in soil near plant bases'
    ],
    organicControl: [
      'Flood fields prior to planting to expose larvae to predatory birds',
      'Spread wheat bran bait with molasses and Bacillus thuringiensis near stems',
      'Place protective collar barriers around transplant stems'
    ],
    chemicalControl: [
      'Soil drench with Chlorpyrifos 20% EC @ 3.0ml/L along crop rows',
      'Apply Emamectin Benzoate 5% SG @ 0.5g/L at sunset'
    ]
  },
  'Diamondback_Moth': {
    className: 'Diamondback_Moth',
    pestName: 'Diamondback Moth (DBM)',
    scientificName: 'Plutella xylostella',
    riskLevel: 'HIGH',
    symptoms: [
      'Window-pane leaf feeding leaving lower epidermis intact',
      'Extensive skeletonization of brassica and cruciferous leaves',
      'Small pale-green larvae wiggling vigorously when touched'
    ],
    organicControl: [
      'Plant Indian Mustard as trap crop every 25 rows of cabbage/cauliflower',
      'Spray Bacillus thuringiensis var. kurstaki @ 2g/L water',
      'Release larval parasitoid Cotesia plutellae'
    ],
    chemicalControl: [
      'Spray Spinosad 45% SC @ 0.3ml/L water',
      'Apply Novaluron 10% EC @ 1.5ml/L water',
      'Rotate chemical classes to prevent rapid insecticide resistance'
    ]
  },
  'Leaf_Miner': {
    className: 'Leaf_Miner',
    pestName: 'Serpentine Leaf Miner',
    scientificName: 'Liriomyza trifolii',
    riskLevel: 'MEDIUM',
    symptoms: [
      'White to translucent winding serpentine mines/tunnels in leaves',
      'Punctures made by adult feeding causing leaf stippling',
      'Desiccation and premature defoliation under high density'
    ],
    organicControl: [
      'Remove and crush severely mined lower leaves early in season',
      'Install yellow sticky cards @ 12 traps/acre',
      'Spray Neem Oil (5ml/L water) to inhibit larval feeding'
    ],
    chemicalControl: [
      'Spray Abamectin 1.9% EC @ 0.5ml/L water',
      'Apply Cyromazine 75% WP @ 0.3g/L water'
    ]
  },
  'Grasshopper': {
    className: 'Grasshopper',
    pestName: 'Rice & Field Grasshopper',
    scientificName: 'Oxya chinensis / Hieroglyphus banian',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Irregular, deep notches chewed from leaf edges toward midrib',
      'Defoliation of crop canopy leaving only bare stems and midribs',
      'Chewed earheads and florets during ripening phase'
    ],
    organicControl: [
      'Trim and clean bunds to destroy grasshopper egg pods during winter ploughing',
      'Apply Metarhizium anisopliae bio-fungicide @ 4g/L water',
      'Herd ducks in paddy fields after harvest to feed on nymphs'
    ],
    chemicalControl: [
      'Dust Malathion 5% DP @ 10 kg/acre on field bunds',
      'Spray Quinalphos 25% EC @ 2.0ml/L water'
    ]
  },
  'Mealybug': {
    className: 'Mealybug',
    pestName: 'Cotton & Papaya Mealybug',
    scientificName: 'Phenacoccus solenopsis / Paracoccus marginatus',
    riskLevel: 'HIGH',
    symptoms: [
      'Dense clusters of white waxy cotton-like bugs on twigs, stems, and fruits',
      'Severe curling, bunched top deformation, and stunted shoot growth',
      'Ant attendance and thick black sooty mold film on foliage'
    ],
    organicControl: [
      'Release exotic parasitoid Acerophagus papayae or ladybird Cryptolaemus montrouzieri',
      'Spray fish oil rosin soap (FORS) @ 25g/L or 2% Neem oil with detergent',
      'Apply sticky banding on main stem trunks to prevent ant ascent'
    ],
    chemicalControl: [
      'Spray Profenofos 50% EC @ 2.0ml/L water with wetting agent',
      'Apply Buprofezin 25% SC @ 2.0ml/L water'
    ]
  },
  'Root_Grub': {
    className: 'Root_Grub',
    pestName: 'White Grub',
    scientificName: 'Holotrichia consanguinea',
    riskLevel: 'HIGH',
    symptoms: [
      'Sudden wilting and drying of plants in patches across field',
      'Affected plants pull out effortlessly from soil due to severed taproots',
      'C-shaped fleshy white grubs with brown head capsules found in root zone'
    ],
    organicControl: [
      'Deep summer ploughing to expose grubs and pupae to sunlight and birds',
      'Apply Metarhizium anisopliae / Beauveria bassiana @ 5 kg/acre in enriched manure',
      'Install light traps on community basis during monsoon adult emergence'
    ],
    chemicalControl: [
      'Soil application of Fipronil 0.3% G @ 10 kg/acre at sowing',
      'Drench root zone with Imidacloprid 17.8% SL @ 1.5ml/L water'
    ]
  },
  'Pod_Borer': {
    className: 'Pod_Borer',
    pestName: 'Gram Pod Borer & Maruca',
    scientificName: 'Maruca vitrata / Helicoverpa armigera',
    riskLevel: 'HIGH',
    symptoms: [
      'Webbed floral buds, leaves, and pods with internal caterpillar feeding',
      'Circular entry holes drilled into pulse pods with hollowed grains',
      'Premature blossom drop and dark frass deposits around webbed clusters'
    ],
    organicControl: [
      'Spray Neem Seed Kernel Extract (NSKE 5%) at flower bud initiation',
      'Apply Beauveria bassiana @ 5g/L water',
      'Intercrop with sorghum or maize as barrier crops'
    ],
    chemicalControl: [
      'Spray Emamectin Benzoate 5% SG @ 0.4g/L water',
      'Apply Flubendiamide 39.35% SC @ 0.2ml/L water',
      'Spray Indoxacarb 14.5% SC @ 0.75ml/L water'
    ]
  },
  'Gall_Midge': {
    className: 'Gall_Midge',
    pestName: 'Rice Gall Midge',
    scientificName: 'Orseolia oryzae',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Formation of tubular silver-white leaf sheath gall ("Silver Shoot" / "Onion Leaf")',
      'Suppression of normal panicle emergence and total tiller sterility',
      'Excessive stunting and abnormal basal tillering'
    ],
    organicControl: [
      'Plant resistant rice cultivars (e.g. Suraksha, Kavya, Phalguna)',
      'Conserve natural egg-larval parasitoid Platygaster oryzae',
      'Avoid staggered transplanting in endemic areas'
    ],
    chemicalControl: [
      'Broadcast Fipronil 0.3% G @ 7.5 kg/acre at 15-20 days after transplanting',
      'Apply Chlorpyrifos 20% EC @ 2.5ml/L water'
    ]
  },
  'Gundhi_Bug': {
    className: 'Gundhi_Bug',
    pestName: 'Rice Earhead Bug (Gundhi Bug)',
    scientificName: 'Leptocorisa acuta',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Foul pungent odor emanating from paddy field when walking through canopy',
      'Black/brown puncture spots on developing grains during milk stage',
      'Chaffy, partially filled, or empty grains ("Pecky rice")'
    ],
    organicControl: [
      'Erect split bamboo poles with putrefying fish/crab bait to attract bugs',
      'Dust wood ash mixed with tobacco waste along earheads in morning',
      'Clear grassy weeds from bunds before panicle emergence'
    ],
    chemicalControl: [
      'Dust Malathion 5% DP @ 10 kg/acre in early morning hours',
      'Spray Deltamethrin 2.8% EC @ 1.0ml/L water'
    ]
  },
  'Flea_Beetle': {
    className: 'Flea_Beetle',
    pestName: 'Crucifer & Solanaceous Flea Beetle',
    scientificName: 'Phyllotreta cruciferae / Epitrix spp.',
    riskLevel: 'LOW',
    symptoms: [
      'Numerous tiny circular "shot-holes" pit-chewed through leaves',
      'Seedling lace-like foliage damage leading to stunted vegetative vigor',
      'Small dark shiny beetles hopping vigorously when disturbed'
    ],
    organicControl: [
      'Apply thick straw mulch to deter soil pupation and adult movement',
      'Dust diatomaceous earth or kaolin clay over seedling foliage',
      'Use row covers over young transplants until plants establish'
    ],
    chemicalControl: [
      'Spray Thiamethoxam 25% WG @ 0.3g/L water',
      'Apply Lambda-cyhalothrin 5% EC @ 0.5ml/L water'
    ]
  },
  'Scale_Insect': {
    className: 'Scale_Insect',
    pestName: 'San Jose & Armored Scale',
    scientificName: 'Diaspidiotus perniciosus',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Crust of small circular grey/brown waxy shells encrusting bark, twigs, and fruit',
      'Red purplish halos surrounding scale encrustations on fruit surfaces',
      'Twig dieback, bark cracking, and loss of tree vigor'
    ],
    organicControl: [
      'Spray Tree Spray Horticultural Oil / Dormant Oil (2-3%) during winter dormancy',
      'Release parasitic wasps (Encarsia perniciosi / Aphytis spp.)',
      'Prune and burn heavily encrusted branch wood'
    ],
    chemicalControl: [
      'Spray Buprofezin 25% SC @ 1.5ml/L targeting crawler stage',
      'Apply Chlorpyrifos 20% EC @ 2.5ml/L during delayed dormant stage'
    ]
  },
  'Leaf_Folder': {
    className: 'Leaf_Folder',
    pestName: 'Rice Leaf Folder',
    scientificName: 'Cnaphalocrocis medinalis',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Leaf blades folded longitudinally with silk threads into protective tubes',
      'Whitish transparent linear feeding stripes inside folded leaves',
      'Scorched, bleached appearance of flag leaves during boot stage'
    ],
    organicControl: [
      'Pass a rough coir rope over crop canopy to dislodge larvae into floodwater',
      'Release Trichogramma chilonis @ 40,000/acre at first sign of folding',
      'Avoid excessive top-dressing of urea fertilizer'
    ],
    chemicalControl: [
      'Spray Flubendiamide 39.35% SC @ 0.25ml/L water',
      'Apply Cartap Hydrochloride 50% SP @ 1.5g/L water',
      'Spray Chlorantraniliprole 18.5% SC @ 0.3ml/L water'
    ]
  },
  'Weevil': {
    className: 'Weevil',
    pestName: 'Sweet Potato & Rice Weevil',
    scientificName: 'Cylas formicarius / Sitophilus oryzae',
    riskLevel: 'HIGH',
    symptoms: [
      'Distinctive elongated snout beetle boring into stems, tubers, and stored grains',
      'Tuber tunneling, dark discoloration, and bitter terpene odor in root crops',
      'Hollowed out grain kernels with circular emergence exit holes'
    ],
    organicControl: [
      'Earth up soil ridges high around roots to prevent adult weevil soil penetration',
      'Dip vine cuttings in 0.05% Fipronil or Trichoderma solution before planting',
      'Install synthetic sex pheromone traps @ 4 traps/acre'
    ],
    chemicalControl: [
      'Soil drench Chlorpyrifos 20% EC @ 3.0ml/L at tuber initiation',
      'Fumigate grain storage with Aluminum Phosphide under airtight conditions'
    ]
  },
  'Locust': {
    className: 'Locust',
    pestName: 'Desert & Migratory Locust',
    scientificName: 'Schistocerca gregaria / Locusta migratoria',
    riskLevel: 'HIGH',
    symptoms: [
      'Massive gregarious swarms defoliating entire crop fields within minutes',
      'Total stripping of foliage, twigs, stems, and ripening ears',
      'Dense hopper bands marching across terrain'
    ],
    organicControl: [
      'Trenching and physical barriers to trap marching hopper bands',
      'Spray bio-pesticide Metarhizium acridum (Green Muscle) @ 50g/ha',
      'Make loud noises and smoke fires to prevent swarm landing'
    ],
    chemicalControl: [
      'Ultra Low Volume (ULV) aerial/ground spray of Malathion 96% ULV @ 1 L/ha',
      'Spray Chlorpyrifos 50% + Cypermethrin 5% EC @ 2.5ml/L for localized barrier control'
    ]
  },
  'Healthy_Trap_Crop': {
    className: 'Healthy_Trap_Crop',
    pestName: 'Clean Canopy / No Infestation',
    scientificName: 'Plantae',
    riskLevel: 'LOW',
    symptoms: [
      'No insect pest presence detected, clean leaf margins, intact foliage tissue',
      'Sticky trap clear of economic pest threshold counts'
    ],
    organicControl: [
      'Continue routine weekly scouting and maintain perimeter trap crops'
    ],
    chemicalControl: [
      'No chemical pesticide treatment needed. Conserve beneficial insects.'
    ]
  }
};

export function getDiseaseDetails(className: string): DiseaseKnowledge {
  if (DISEASE_TAXONOMY_KB[className]) {
    return DISEASE_TAXONOMY_KB[className];
  }

  if (className.toLowerCase().includes('healthy')) {
    const cropName = className.split('___')[0] || className.split('_')[0] || 'Crop';
    return {
      className,
      crop: cropName,
      displayName: `${cropName} - Healthy Leaf`,
      scientificName: 'Plantae',
      symptoms: [
        'Vibrant green compound leaves, firm erect tissue, intact leaf margins, no spots or wilting.'
      ],
      organicRemedies: [
        'Maintain balanced NPK fertilizer schedule. Install yellow sticky traps as early warning vector traps.'
      ],
      chemicalRemedies: [
        'No chemical treatment needed for healthy crops.'
      ],
      preventativeMeasures: [
        'Ensure proper soil moisture and field aeration.'
      ],
      severityDefault: 'Low'
    };
  }

  return {
    className: className || 'Unknown',
    crop: 'General Crop',
    displayName: className?.replace(/___/g, ' - ') || 'Uncertain Condition',
    scientificName: 'N/A',
    symptoms: [
      'Unusual leaf discoloration, spotting, or leaf tissue necrosis',
      'Foliage wilting or chlorotic yellowing'
    ],
    organicRemedies: [
      'Spray Neem Oil (5ml/L water) as general preventative protection',
      'Prune severely diseased plant tissue'
    ],
    chemicalRemedies: [
      'Consult local Krishi Vigyan Kendra (KVK) officer for specialized chemical prescription'
    ],
    preventativeMeasures: [
      'Ensure proper soil drainage and balanced NPK fertilizer application',
      'Avoid waterlogging near crop roots'
    ],
    severityDefault: 'Medium'
  };
}

export function getPestDetails(className: string): PestKnowledge {
  const cleanKey = className?.replace(/^.*___/, '').replace(/\s+/g, '_');
  if (PEST_TAXONOMY_KB[className]) {
    return PEST_TAXONOMY_KB[className];
  }
  if (cleanKey && PEST_TAXONOMY_KB[cleanKey]) {
    return PEST_TAXONOMY_KB[cleanKey];
  }

  // Check case-insensitive match in existing KB
  const foundKey = Object.keys(PEST_TAXONOMY_KB).find(k => k.toLowerCase() === className?.toLowerCase() || k.toLowerCase() === cleanKey?.toLowerCase());
  if (foundKey) {
    return PEST_TAXONOMY_KB[foundKey];
  }

  // Check in 102-Class IP102 Taxonomy
  const ip102Item = IP102_PEST_TAXONOMY.find(item => 
    item.className.toLowerCase() === className?.toLowerCase() ||
    item.className.toLowerCase() === cleanKey?.toLowerCase() ||
    item.pestName.toLowerCase() === className?.toLowerCase() ||
    item.displayName.toLowerCase() === className?.toLowerCase()
  );

  if (ip102Item) {
    const isBorerOrCutworm = ip102Item.className.toLowerCase().includes('borer') || ip102Item.className.toLowerCase().includes('cutworm') || ip102Item.className.toLowerCase().includes('locust') || ip102Item.className.toLowerCase().includes('army');
    const isSuckingPest = ip102Item.className.toLowerCase().includes('aphid') || ip102Item.className.toLowerCase().includes('mite') || ip102Item.className.toLowerCase().includes('hopper') || ip102Item.className.toLowerCase().includes('thrips') || ip102Item.className.toLowerCase().includes('whitefly') || ip102Item.className.toLowerCase().includes('scale') || ip102Item.className.toLowerCase().includes('mealy');

    return {
      className: ip102Item.className,
      pestName: ip102Item.displayName,
      scientificName: ip102Item.scientificName,
      riskLevel: isBorerOrCutworm ? 'HIGH' : isSuckingPest ? 'MEDIUM' : 'MEDIUM',
      symptoms: isBorerOrCutworm ? [
        `Extensive tunneling, boring into shoots, leaves or fruit of ${ip102Item.crop}`,
        `Visible frass pellets and larval damage at entry sites`,
        `Premature lodging, withered central shoots, or drop of developing fruit`
      ] : isSuckingPest ? [
        `Sap depletion, leaf curling, and chlorotic yellowing on ${ip102Item.crop}`,
        `Sticky honeydew secretion promoting black sooty mold growth`,
        `Stunted vegetative growth and reduced photosynthetic surface`
      ] : [
        `Chewed foliage margins, leaf skeletonization, or tissue damage on ${ip102Item.crop}`,
        `Visible presence of adult or nymph feeding stages across crop canopy`
      ],
      organicControl: isBorerOrCutworm ? [
        `Deploy species-specific pheromone delta traps @ 5–8 traps/acre`,
        `Release Trichogramma egg parasitoids @ 40,000–50,000 per acre`,
        `Apply Neem Seed Kernel Extract (NSKE 5%) or Bacillus thuringiensis (Bt) @ 2g/L`
      ] : isSuckingPest ? [
        `Install yellow and blue sticky traps @ 10–12 traps/acre`,
        `Spray Cold-Pressed Neem Oil (10,000 ppm) @ 3–5ml/L with mild emulsifier`,
        `Encourage ladybird beetles and green lacewing (Chrysoperla carnea) predators`
      ] : [
        `Handpick larvae/egg masses during early morning scouting`,
        `Spray botanical extract (5% Neem / Pongamia oil emulsion)`,
        `Intercrop with nectar-rich flowering border plants to conserve natural enemies`
      ],
      chemicalControl: isBorerOrCutworm ? [
        `Spray Chlorantraniliprole 18.5% SC @ 0.3ml/L or Flubendiamide 39.35% SC @ 0.25ml/L water`,
        `Apply Emamectin Benzoate 5% SG @ 0.4g/L during early instar stage`
      ] : isSuckingPest ? [
        `Spray Thiamethoxam 25% WG @ 0.3g/L or Acetamiprid 20% SP @ 0.2g/L water`,
        `Apply Spiromesifen 22.9% SC @ 1ml/L for mite/whitefly complexes`
      ] : [
        `Apply contact insecticide (e.g. Cypermethrin 10% EC @ 1.5ml/L) if pest population breaches economic threshold level (ETL)`
      ]
    };
  }

  return {
    className: className || 'Unknown Pest',
    pestName: className?.replace(/_/g, ' ') || 'Unidentified Pest / Insect',
    scientificName: 'Insecta spp.',
    riskLevel: 'MEDIUM',
    symptoms: [
      'Chewed leaf margins, sap loss, or insect presence visible on foliage'
    ],
    organicControl: [
      'Install yellow sticky traps @ 10 traps/acre',
      'Spray Neem oil solution (5ml/L water)'
    ],
    chemicalControl: [
      'Apply recommended systemic insecticide based on local Agricultural Extension Officer advice'
    ]
  };
}


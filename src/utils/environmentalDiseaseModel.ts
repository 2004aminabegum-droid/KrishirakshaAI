export interface EnvironmentalInputs {
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  soilMoisture?: number;
  ph?: number;
  temperature?: number;
  humidity?: number;
}

export interface EnvironmentalPrediction {
  disease: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  confidence: number;
  drivers: string[];
  recommendation: string;
  usedFields: number;
}

type DiseaseProfile = {
  disease: string;
  base: number;
  ranges: Partial<Record<keyof EnvironmentalInputs, [number, number]>>;
  recommendation: string;
};

const profiles: Record<string, DiseaseProfile[]> = {
  Wheat: [
    { disease: 'Wheat Brown Rust', base: 18, ranges: { humidity: [72, 100], temperature: [18, 28], nitrogen: [0, 40] }, recommendation: 'Improve canopy airflow, avoid excess nitrogen, and scout lower leaves for orange-brown pustules.' },
    { disease: 'Wheat Powdery Mildew', base: 12, ranges: { humidity: [78, 100], temperature: [15, 24], soilMoisture: [55, 100] }, recommendation: 'Reduce leaf wetness, improve spacing, and monitor shaded or dense crop areas.' }
  ],
  Rice: [
    { disease: 'Rice Brown Spot', base: 16, ranges: { humidity: [65, 100], temperature: [24, 34], nitrogen: [0, 45], potassium: [0, 40] }, recommendation: 'Correct nitrogen and potassium balance, improve drainage, and inspect leaves for oval brown lesions.' },
    { disease: 'Rice Blast', base: 14, ranges: { humidity: [80, 100], temperature: [20, 30], nitrogen: [55, 100] }, recommendation: 'Avoid excess nitrogen, maintain balanced nutrition, and scout for spindle-shaped lesions.' }
  ],
  Potato: [
    { disease: 'Potato Late Blight', base: 18, ranges: { humidity: [80, 100], temperature: [12, 24], soilMoisture: [65, 100] }, recommendation: 'Improve drainage and airflow, avoid overhead irrigation, and inspect foliage after humid weather.' },
    { disease: 'Potato Early Blight', base: 14, ranges: { temperature: [24, 34], humidity: [55, 90], nitrogen: [0, 40] }, recommendation: 'Maintain adequate nitrogen, remove lower infected leaves, and rotate crops.' }
  ],
  Tomato: [
    { disease: 'Tomato Leaf Mold', base: 16, ranges: { humidity: [80, 100], temperature: [20, 30], soilMoisture: [60, 100] }, recommendation: 'Ventilate the crop, reduce evening irrigation, and inspect leaf undersides for olive mold.' },
    { disease: 'Tomato Early Blight', base: 15, ranges: { temperature: [24, 34], humidity: [60, 95], nitrogen: [0, 40] }, recommendation: 'Keep foliage dry, remove lower leaves, and maintain balanced NPK nutrition.' }
  ],
  Cotton: [{ disease: 'Cotton Leaf Spot', base: 14, ranges: { humidity: [75, 100], temperature: [24, 34], potassium: [0, 40] }, recommendation: 'Improve airflow, avoid prolonged leaf wetness, and correct low potassium conditions.' }],
  Maize: [{ disease: 'Maize Northern Leaf Blight', base: 14, ranges: { humidity: [75, 100], temperature: [18, 30], soilMoisture: [60, 100] }, recommendation: 'Scout older leaves, improve airflow, and avoid planting maize repeatedly in the same plot.' }],
  Pepper: [{ disease: 'Pepper Bacterial Spot', base: 14, ranges: { humidity: [75, 100], temperature: [24, 34], soilMoisture: [65, 100] }, recommendation: 'Avoid overhead watering, remove spotted leaves, and use disease-free seed.' }]
};

const labels: Record<keyof EnvironmentalInputs, string> = {
  nitrogen: 'low nitrogen', phosphorus: 'low phosphorus', potassium: 'low potassium', soilMoisture: 'high soil moisture', ph: 'unbalanced soil pH', temperature: 'warm temperature', humidity: 'high humidity'
};

export function predictEnvironmentalDisease(crop: string, inputs: EnvironmentalInputs): EnvironmentalPrediction {
  const usedFields = Object.values(inputs).filter(value => typeof value === 'number' && Number.isFinite(value)).length;
  const cropProfiles = profiles[crop] ?? profiles.Wheat;
  const scored = cropProfiles.map(profile => {
    const drivers: string[] = [];
    let score = profile.base;
    Object.entries(profile.ranges).forEach(([field, range]) => {
      const value = inputs[field as keyof EnvironmentalInputs];
      if (typeof value !== 'number' || !range) return;
      if (value >= range[0] && value <= range[1]) {
        score += 18;
        drivers.push(labels[field as keyof EnvironmentalInputs]);
      }
    });
    if (typeof inputs.ph === 'number' && (inputs.ph < 5.5 || inputs.ph > 7.5)) {
      score += 12;
      if (!drivers.includes('unbalanced soil pH')) drivers.push('unbalanced soil pH');
    }
    return { profile, score: Math.min(96, score), drivers };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const score = Math.round(Math.min(96, best.score * (usedFields / 7 + 0.35)));
  return {
    disease: score < 28 ? 'Low environmental disease risk' : best.profile.disease,
    risk: score >= 70 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW',
    score,
    confidence: Math.round(Math.min(94, 48 + usedFields * 6 + best.score * 0.22)),
    drivers: best.drivers.length ? best.drivers : ['no strong risk driver detected'],
    recommendation: score < 28 ? 'Continue routine scouting and keep collecting readings to catch changes early.' : best.profile.recommendation,
    usedFields
  };
}
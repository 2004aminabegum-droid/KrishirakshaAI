import { NextResponse } from 'next/server';
import { DLCPD25_PEST_TAXONOMY, PestTaxonomyItem } from '../../../../../utils/imageClassifier';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    offline_model: {
      version: 'v3.0.0_plantvillage',
      release_date: '2026-08-27',
      download_url: '/model.onnx',
      model_type: 'MobileNetV3-Small Plant Disease Classifier',
      num_classes: 39,
      size_mb: 5.95
    },
    pest_model: {
      version: 'v2.5.0_dlcpd25',
      release_date: '2026-08-27',
      download_url: '/pest-model.onnx',
      model_type: 'MobileNetV3-Small DLCPD-25 Agricultural Pest Classifier',
      num_classes: DLCPD25_PEST_TAXONOMY.length,
      class_labels: DLCPD25_PEST_TAXONOMY.map((t: PestTaxonomyItem) => t.className),
      classes: DLCPD25_PEST_TAXONOMY.map((t: PestTaxonomyItem) => t.displayName),
      size_mb: 5.95
    }
  });
}



/**
 * Client-Side ONNX Runtime Web Inference Engine
 * KrishiRakshak AI Offline Model Runtime
 */

import { SUPPORTED_TAXONOMY, LOCAL_DISEASE_TAXONOMY, PLANTVILLAGE_TAXONOMY, DLCPD25_PEST_TAXONOMY } from './imageClassifier';

export interface OfflinePrediction {
  topClass: string;
  crop: string;
  displayName: string;
  confidence: number;
  percentage: number;
  top3: Array<{ className: string; displayName: string; confidence: number; percentage: number }>;
  isSupported: boolean;
  isOpenSetUnknown: boolean;
  inferenceTimeMs: number;
}

export async function runOfflineInference(
  imageData: ImageData,
  modelPath: string = '/model.onnx',
  selectedCrop?: string
): Promise<OfflinePrediction> {
  const startTime = performance.now();

  try {
    const ort = await import('onnxruntime-web');
    ort.env.wasm.wasmPaths = '/ort-wasm/';
    
    const { data, width, height } = imageData;
    const f32 = new Float32Array(3 * width * height);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    // PyTorch NCHW layout: [1, 3, H, W]
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4] / 255;
      const g = data[i * 4 + 1] / 255;
      const b = data[i * 4 + 2] / 255;

      f32[i] = (r - mean[0]) / std[0];
      f32[width * height + i] = (g - mean[1]) / std[1];
      f32[2 * width * height + i] = (b - mean[2]) / std[2];
    }

    const tensor = new ort.Tensor('float32', f32, [1, 3, height, width]);

    const session = await ort.InferenceSession.create(modelPath, { executionProviders: ['wasm'] });
    const outputMap = await session.run({ input: tensor });
    const outputTensor = outputMap.output ?? outputMap.predictions ?? Object.values(outputMap)[0];
    const rawData = outputTensor?.data as Float32Array | undefined;

    if (!rawData) {
      throw new Error('ONNX inference returned empty tensor data');
    }

    const isPestMode = modelPath.includes('pest') || rawData.length === DLCPD25_PEST_TAXONOMY.length;

    let taxonomy: Array<{ className: string; crop: string; displayName: string }>;
    if (isPestMode) {
      taxonomy = DLCPD25_PEST_TAXONOMY;
    } else if (rawData.length === LOCAL_DISEASE_TAXONOMY.length) {
      taxonomy = LOCAL_DISEASE_TAXONOMY;
    } else if (rawData.length >= PLANTVILLAGE_TAXONOMY.length) {
      taxonomy = PLANTVILLAGE_TAXONOMY;
    } else {
      taxonomy = SUPPORTED_TAXONOMY;
    }

    const rawLogits = Array.from(rawData.slice(0, taxonomy.length));
    
    // Apply selected crop taxonomy filter boost if specified
    const logits = rawLogits.map((logit, idx) => {
      const item = taxonomy[idx];
      if (!isPestMode && selectedCrop && item?.crop && (item.crop.toLowerCase() === selectedCrop.toLowerCase() || item.className === 'Healthy')) {
        return logit + 1.5; // Crop prior boost
      }
      return logit;
    });

    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0) || 1;
    const probs = exps.map(e => e / sumExps);

    const predictions = taxonomy.map((item, idx) => {
      let displayName = item.displayName;
      if (!isPestMode && item.className === 'Healthy' && selectedCrop) {
        displayName = `${selectedCrop} - Healthy Leaf`;
      }
      return {
        className: !isPestMode && item.className === 'Healthy' && selectedCrop ? `${selectedCrop}___Healthy` : item.className,
        displayName,
        crop: !isPestMode && item.className === 'Healthy' && selectedCrop ? selectedCrop : item.crop,
        confidence: probs[idx],
        percentage: Math.round(probs[idx] * 100)
      };
    }).sort((a, b) => b.confidence - a.confidence);

    const top1 = predictions[0];
    const top3 = predictions.slice(0, 3);
    const endTime = performance.now();

    const isOpenSetUnknown = top1.confidence < 0.40;

    return {
      topClass: isOpenSetUnknown ? 'UNKNOWN' : top1.className,
      crop: top1.crop || selectedCrop || 'Crop',
      displayName: isOpenSetUnknown ? 'Unknown / Unsupported Condition' : top1.displayName,
      confidence: Math.round(top1.confidence * 100) / 100,
      percentage: Math.round(top1.confidence * 100),
      top3,
      isSupported: !isOpenSetUnknown,
      isOpenSetUnknown,
      inferenceTimeMs: Math.round(endTime - startTime)
    };
  } catch (err) {
    console.warn('[ONNX Engine] ONNX execution fallback:', err);
    const endTime = performance.now();
    return {
      topClass: 'UNKNOWN',
      crop: 'Unknown',
      displayName: 'ONNX Offline Fallback Mode',
      confidence: 0.40,
      percentage: 40,
      top3: [],
      isSupported: false,
      isOpenSetUnknown: true,
      inferenceTimeMs: Math.round(endTime - startTime)
    };
  }
}

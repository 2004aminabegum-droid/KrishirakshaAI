"""
KrishiRakshak AI — ResNet-50 IP102 Pest Model ONNX Converter
============================================================
Converts the pre-trained ResNet-50 102-class insect pest detection checkpoint
(`resnet50_0.497.pkl` from the IP102 benchmark) into production-ready ONNX models:
1. `public/pest-model.onnx` (Dynamic INT8 Quantized, ~22.8 MB for ultra-fast browser/mobile load)
2. `public/pest-model-fp32.onnx` (Full FP32 Precision, ~90.4 MB)
3. `public/pest_model_metadata.json` (102-class metadata, taxonomy, and normalization specs)
"""

import os
import sys
import io
import json
import time
from pathlib import Path

# Enable unbuffered real-time line logging and UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(line_buffering=True, encoding="utf-8", errors="replace")
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)

import torch
import torch.nn as nn
import torchvision.models as models
import onnx
import onnxruntime as ort
import numpy as np

# 102 IP102 Benchmark Classes (index 0 to 101)
IP102_CLASSES = [
    "rice leaf roller", "rice leaf caterpillar", "paddy stem maggot", "asiatic rice borer",
    "yellow rice borer", "rice gall midge", "Rice Stemfly", "brown plant hopper",
    "white backed plant hopper", "small brown plant hopper", "rice water weevil",
    "rice leafhopper", "grain spreader thrips", "rice shell pest", "grub",
    "mole cricket", "wireworm", "white margined moth", "black cutworm",
    "large cutworm", "yellow cutworm", "red spider", "corn borer", "army worm",
    "aphids", "Potosiabre vitarsis", "peach borer", "english grain aphid",
    "green bug", "bird cherry-oataphid", "wheat blossom midge", "penthaleus major",
    "longlegged spider mite", "wheat phloeothrips", "wheat sawfly", "cerodonta denticornis",
    "beet fly", "flea beetle", "cabbage army worm", "beet army worm", "Beet spot flies",
    "meadow moth", "beet weevil", "sericaorient alismots chulsky", "alfalfa weevil",
    "flax budworm", "alfalfa plant bug", "tarnished plant bug", "Locustoidea",
    "lytta polita", "legume blister beetle", "blister beetle", "therioaphis maculata Buckton",
    "odontothrips loti", "Thrips", "alfalfa seed chalcid", "Pieris canidia",
    "Apolygus lucorum", "Limacodidae", "Viteus vitifoliae", "Colomerus vitis",
    "Brevipoalpus lewisi McGregor", "oides decempunctata", "Polyphagotars onemus latus",
    "Pseudococcus comstocki Kuwana", "parathrene regalis", "Ampelophaga",
    "Lycorma delicatula", "Xylotrechus", "Cicadella viridis", "Miridae",
    "Trialeurodes vaporariorum", "Erythroneura apicalis", "Papilio xuthus",
    "Panonchus citri McGregor", "Phyllocoptes oleiverus ashmead", "Icerya purchasi Maskell",
    "Unaspis yanonensis", "Ceroplastes rubens", "Chrysomphalus aonidum",
    "Parlatoria zizyphus Lucus", "Nipaecoccus vastalor", "Aleurocanthus spiniferus",
    "Tetradacus c Bactrocera minax", "Dacus dorsalis(Hendel)", "Bactrocera tsuneonis",
    "Prodenia litura", "Adristyrannus", "Phyllocnistis citrella Stainton",
    "Toxoptera citricidus", "Toxoptera aurantii", "Aphis citricola Vander Goot",
    "Scirtothrips dorsalis Hood", "Dasineura sp", "Lawana imitata Melichar",
    "Salurnis marginella Guerr", "Deporaus marginatus Pascoe", "Chlumetia transversa",
    "Mango flat beak leafhopper", "Rhytidodera bowrinii white", "Sternochetus frigidus",
    "Cicadellidae"
]

def main():
    root_dir = Path(__file__).parent
    pkl_path = root_dir / "resnet50_0.497.pkl"
    public_dir = root_dir / "public"
    public_dir.mkdir(parents=True, exist_ok=True)

    fp32_onnx_path = public_dir / "pest-model-fp32.onnx"
    int8_onnx_path = public_dir / "pest-model.onnx"
    metadata_path = public_dir / "pest_model_metadata.json"

    print("=" * 70)
    print("  KrishiRakshak AI — ResNet-50 IP102 ONNX Model Exporter")
    print("=" * 70)

    if not pkl_path.exists():
        print(f"[ERROR] Source checkpoint not found: {pkl_path}")
        sys.exit(1)

    # 1. Load PyTorch model
    print(f"[1/5] Loading weights from {pkl_path.name}...")
    state_dict = torch.load(pkl_path, map_location="cpu", weights_only=False)

    model = models.resnet50(weights=None)
    model.fc = nn.Linear(2048, len(IP102_CLASSES))

    missing, unexpected = model.load_state_dict(state_dict, strict=True)
    model.eval()
    print(f"  ✓ Strict weight loading verified (Missing: {len(missing)}, Unexpected: {len(unexpected)})")

    # 2. Export FP32 ONNX
    print(f"[2/5] Exporting FP32 ONNX model to {fp32_onnx_path.name}...")
    dummy_input = torch.randn(1, 3, 224, 224, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        str(fp32_onnx_path),
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "output": {0: "batch_size"},
        },
    )

    fp32_size_mb = fp32_onnx_path.stat().st_size / (1024 * 1024)
    print(f"  ✓ FP32 ONNX exported ({fp32_size_mb:.2f} MB)")

    # Validate ONNX graph
    onnx_model = onnx.load(str(fp32_onnx_path))
    onnx.checker.check_model(onnx_model)
    print("  ✓ FP32 ONNX graph validation passed")

    # 3. Dynamic INT8 Quantization
    print(f"[3/5] Performing dynamic INT8 quantization -> {int8_onnx_path.name}...")
    from onnxruntime.quantization import quantize_dynamic, QuantType

    quantize_dynamic(
        str(fp32_onnx_path),
        str(int8_onnx_path),
        weight_type=QuantType.QUInt8
    )
    int8_size_mb = int8_onnx_path.stat().st_size / (1024 * 1024)
    print(f"  ✓ INT8 ONNX generated ({int8_size_mb:.2f} MB, {((fp32_size_mb - int8_size_mb)/fp32_size_mb)*100:.1f}% reduction)")

    # 4. Parity & Latency Verification
    print("[4/5] Testing inference verification via ONNX Runtime...")
    test_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
    
    with torch.no_grad():
        pyt_out = model(torch.from_numpy(test_input)).numpy()

    sess_fp32 = ort.InferenceSession(str(fp32_onnx_path), providers=["CPUExecutionProvider"])
    out_fp32 = sess_fp32.run(None, {"input": test_input})[0]
    fp32_max_diff = np.max(np.abs(pyt_out - out_fp32))
    print(f"  ✓ FP32 Max Absolute Diff vs PyTorch: {fp32_max_diff:.8f}")

    sess_int8 = ort.InferenceSession(str(int8_onnx_path), providers=["CPUExecutionProvider"])
    t0 = time.perf_counter()
    out_int8 = sess_int8.run(None, {"input": test_input})[0]
    latency_ms = (time.perf_counter() - t0) * 1000
    print(f"  ✓ INT8 Output Shape: {out_int8.shape} | Latency: {latency_ms:.2f} ms")

    # 5. Generate Model Metadata JSON
    print(f"[5/5] Updating metadata in {metadata_path.name}...")
    metadata = {
        "model_name": "IP102-Pest-ResNet50",
        "architecture": "ResNet-50",
        "num_classes": len(IP102_CLASSES),
        "classes": IP102_CLASSES,
        "benchmark_dataset": "IP102: A Large-Scale Benchmark Dataset for Insect Pest Recognition (CVPR 2019)",
        "benchmark_top1_accuracy": 49.7,
        "image_size": 224,
        "input_format": "NCHW [1, 3, 224, 224]",
        "normalization": {
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225]
        },
        "model_files": {
            "default_int8": "/pest-model.onnx",
            "fp32_full": "/pest-model-fp32.onnx"
        },
        "default_model_size_mb": round(int8_size_mb, 2),
        "fp32_model_size_mb": round(fp32_size_mb, 2),
        "version": "v3.0_resnet50_ip102"
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"  ✓ Saved metadata for {len(IP102_CLASSES)} classes")

    print("=" * 70)
    print("  ONNX Conversion Completed Successfully!")
    print(f"  Default Model : {int8_onnx_path} ({int8_size_mb:.2f} MB)")
    print(f"  Full FP32     : {fp32_onnx_path} ({fp32_size_mb:.2f} MB)")
    print(f"  Metadata      : {metadata_path}")
    print("=" * 70)

if __name__ == "__main__":
    main()

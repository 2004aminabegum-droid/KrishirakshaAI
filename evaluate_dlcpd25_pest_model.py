"""
KrishiRakshak AI — DLCPD-25 Pest Model Evaluation & Verification
===============================================================
Calculates Precision, Recall, F1-Score, Confusion Matrix, and
Inference Latency for the 25-Class DLCPD-25 Model on validation data.
"""

import json
import time
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as transforms
import torchvision.models as models
from pathlib import Path
import numpy as np

from train_dlcpd25_pest_model import (
    DLCPD25_PEST_CLASSES,
    NUM_CLASSES,
    IMAGE_SIZE,
    BATCH_SIZE,
    val_transform,
    DLCPD25PestDataset,
    build_pest_model
)

def main():
    project_root = Path(__file__).parent
    output_dir = project_root / "training_output"
    public_dir = project_root / "public"

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Evaluation] Device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")

    # 1. Load Validation Data
    val_dataset = DLCPD25PestDataset(num_samples_per_class=64, transform=val_transform, seed=123)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    print(f"[Evaluation] Testing across {len(val_dataset):,} samples ({NUM_CLASSES} classes)...")

    # 2. Load Trained Weights
    model = build_pest_model(num_classes=NUM_CLASSES)
    weights_path = output_dir / "best_pest_model.pth"
    if not weights_path.exists():
        print(f"[ERROR] Model weights not found at {weights_path}")
        return

    model.load_state_dict(torch.load(weights_path, map_location=device, weights_only=True))
    model.to(device)
    model.eval()

    # 3. Compute Confusion Matrix & Latency
    confusion_matrix = np.zeros((NUM_CLASSES, NUM_CLASSES), dtype=np.int64)
    latencies = []

    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(device, non_blocking=True)
            t0 = time.perf_counter()
            outputs = model(images)
            t1 = time.perf_counter()
            latencies.append((t1 - t0) / images.size(0))

            _, preds = torch.max(outputs, 1)
            preds_cpu = preds.cpu().numpy()
            labels_cpu = labels.numpy()
            for t, p in zip(labels_cpu, preds_cpu):
                confusion_matrix[t, p] += 1

    # 4. Metrics
    total_samples = confusion_matrix.sum()
    correct_samples = np.trace(confusion_matrix)
    overall_accuracy = correct_samples / total_samples

    metrics_per_class = []
    for i in range(NUM_CLASSES):
        tp = confusion_matrix[i, i]
        fp = confusion_matrix[:, i].sum() - tp
        fn = confusion_matrix[i, :].sum() - tp
        support = confusion_matrix[i, :].sum()

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        metrics_per_class.append({
            "class_index": i,
            "class_name": DLCPD25_PEST_CLASSES[i],
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "support": int(support)
        })

    avg_precision = np.mean([m["precision"] for m in metrics_per_class])
    avg_recall = np.mean([m["recall"] for m in metrics_per_class])
    avg_f1 = np.mean([m["f1_score"] for m in metrics_per_class])
    avg_latency_ms = np.mean(latencies) * 1000

    results = {
        "model": "DLCPD-25-Pest-MobileNetV3-Small",
        "num_classes": NUM_CLASSES,
        "total_test_samples": int(total_samples),
        "overall_accuracy": round(float(overall_accuracy), 4),
        "macro_avg_precision": round(float(avg_precision), 4),
        "macro_avg_recall": round(float(avg_recall), 4),
        "macro_avg_f1": round(float(avg_f1), 4),
        "avg_inference_latency_ms": round(float(avg_latency_ms), 2),
        "classes": metrics_per_class
    }

    out_metrics_path = output_dir / "pest_performance_metrics.json"
    with open(out_metrics_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 65)
    print(f"  DLCPD-25 25-Class Evaluation Summary:")
    print("=" * 65)
    print(f"  Overall Accuracy : {overall_accuracy * 100:.2f}%")
    print(f"  Macro Precision  : {avg_precision * 100:.2f}%")
    print(f"  Macro Recall     : {avg_recall * 100:.2f}%")
    print(f"  Macro F1-Score   : {avg_f1 * 100:.2f}%")
    print(f"  Average Latency  : {avg_latency_ms:.2f} ms / image (GPU)")
    print("=" * 65)
    print(f"[OK] Saved performance report to {out_metrics_path}\n")

if __name__ == "__main__":
    main()

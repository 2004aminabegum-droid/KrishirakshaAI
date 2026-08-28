"""
Calculate detailed validation metrics (Accuracy, Precision, Recall, F1-score)
for the trained MobileNetV3-Small model on the PlantVillage validation set.
"""

import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset, random_split
import torchvision.transforms as transforms
import torchvision.models as models
from datasets import load_dataset
from pathlib import Path
import numpy as np

# ── Load class names ─────────────────────────────────────────────────────────
with open("public/model_metadata.json", "r") as f:
    meta = json.load(f)
CLASSES = meta["classes"]
NUM_CLASSES = len(CLASSES)
IMAGE_SIZE = 224
BATCH_SIZE = 64

# ── Transforms & Dataset ─────────────────────────────────────────────────────
val_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

class PlantVillageDataset(Dataset):
    def __init__(self, hf_dataset, transform=None):
        self.dataset = hf_dataset
        self.transform = transform

    def __len__(self):
        return len(self.dataset)

    def __getitem__(self, idx):
        item = self.dataset[idx]
        image = item["image"]
        label = item["label"]
        if image.mode != "RGB":
            image = image.convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label

print("[1/3] Loading dataset...")
hf_dataset = load_dataset("DScomp380/plant_village", split="train")

val_size = int(len(hf_dataset) * 0.2)
train_size = len(hf_dataset) - val_size
generator = torch.Generator().manual_seed(42)
_, val_indices = random_split(range(len(hf_dataset)), [train_size, val_size], generator=generator)

full_val_dataset = PlantVillageDataset(hf_dataset, transform=val_transform)
val_dataset = torch.utils.data.Subset(full_val_dataset, val_indices.indices)

val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=True)
print(f"[2/3] Evaluating on {len(val_dataset):,} validation images across {NUM_CLASSES} classes...")

# ── Load Model ───────────────────────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.mobilenet_v3_small(weights=None)
in_features = model.classifier[3].in_features
model.classifier[3] = nn.Linear(in_features, NUM_CLASSES)
model.load_state_dict(torch.load("training_output/best_model.pth", map_location=device, weights_only=True))
model.to(device)
model.eval()

# ── Compute Confusion Matrix ─────────────────────────────────────────────────
confusion_matrix = np.zeros((NUM_CLASSES, NUM_CLASSES), dtype=np.int64)

with torch.no_grad():
    for images, labels in val_loader:
        images = images.to(device, non_blocking=True)
        outputs = model(images)
        _, preds = torch.max(outputs, 1)
        
        preds_cpu = preds.cpu().numpy()
        labels_cpu = labels.numpy()
        for t, p in zip(labels_cpu, preds_cpu):
            confusion_matrix[t, p] += 1

print("[3/3] Calculating precision, recall, F1 metrics...")

# ── Metrics Calculation ──────────────────────────────────────────────────────
metrics_per_class = []
total_samples = confusion_matrix.sum()
correct_samples = np.trace(confusion_matrix)
overall_accuracy = correct_samples / total_samples

for i in range(NUM_CLASSES):
    tp = confusion_matrix[i, i]
    fp = confusion_matrix[:, i].sum() - tp
    fn = confusion_matrix[i, :].sum() - tp
    support = confusion_matrix[i, :].sum()
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    metrics_per_class.append({
        "index": i,
        "class_name": CLASSES[i],
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "support": int(support),
        "tp": int(tp),
        "fp": int(fp),
        "fn": int(fn)
    })

# Macro averages
macro_precision = np.mean([m["precision"] for m in metrics_per_class])
macro_recall = np.mean([m["recall"] for m in metrics_per_class])
macro_f1 = np.mean([m["f1_score"] for m in metrics_per_class])

# Weighted averages
supports = np.array([m["support"] for m in metrics_per_class])
weighted_precision = np.sum([m["precision"] * m["support"] for m in metrics_per_class]) / total_samples
weighted_recall = np.sum([m["recall"] * m["support"] for m in metrics_per_class]) / total_samples
weighted_f1 = np.sum([m["f1_score"] * m["support"] for m in metrics_per_class]) / total_samples

result_summary = {
    "overall_accuracy": float(overall_accuracy),
    "macro_avg": {
        "precision": float(macro_precision),
        "recall": float(macro_recall),
        "f1_score": float(macro_f1)
    },
    "weighted_avg": {
        "precision": float(weighted_precision),
        "recall": float(weighted_recall),
        "f1_score": float(weighted_f1)
    },
    "total_validation_samples": int(total_samples),
    "per_class": metrics_per_class
}

with open("training_output/performance_metrics.json", "w") as f:
    json.dump(result_summary, f, indent=2)

print("\n" + "="*80)
print(f"Overall Accuracy : {overall_accuracy*100:.2f}%")
print(f"Macro Precision  : {macro_precision*100:.2f}%")
print(f"Macro Recall     : {macro_recall*100:.2f}%")
print(f"Macro F1-Score   : {macro_f1*100:.2f}%")
print(f"Weighted F1-Score: {weighted_f1*100:.2f}%")
print("="*80)

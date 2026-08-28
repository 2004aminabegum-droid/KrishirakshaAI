"""
KrishiRakshak AI — GPU-Accelerated Real Model Training Pipeline
===============================================================
Downloads PlantVillage dataset from Hugging Face, trains MobileNetV3-Small
with NVIDIA RTX GPU acceleration (CUDA + Mixed Precision AMP),
validation checkpoints, and auto-exports the best ONNX model.

Usage:
    python train_hybrid_models.py
"""

import os
import sys
import io
import json
import time
import csv
from pathlib import Path

# Enable unbuffered real-time line logging on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(line_buffering=True, encoding="utf-8", errors="replace")
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
from datasets import load_dataset

# ── PlantVillage 38-Class Taxonomy ───────────────────────────────────────────
PLANTVILLAGE_CLASSES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

NUM_CLASSES = len(PLANTVILLAGE_CLASSES)  # 38

# ── Training Hyperparameters (Optimized for NVIDIA RTX 3050 GPU) ─────────────
BATCH_SIZE = 64
NUM_EPOCHS = 20
LEARNING_RATE = 0.001
IMAGE_SIZE = 224
VAL_SPLIT = 0.2  # 80% train, 20% validation
NUM_WORKERS = 0  # Safe Windows dataloader worker count


# ── Data Augmentation Transforms ─────────────────────────────────────────────
train_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE + 32, IMAGE_SIZE + 32)),
    transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.8, 1.0)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.1),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


# ── PyTorch Dataset Wrapper ──────────────────────────────────────────────────
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


# ── Model Builder ────────────────────────────────────────────────────────────
def build_model(num_classes: int = NUM_CLASSES, pretrained: bool = True):
    if pretrained:
        model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    else:
        model = models.mobilenet_v3_small(weights=None)

    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, num_classes)
    return model


# ── GPU Training Loop with Mixed Precision (AMP) ─────────────────────────────
def train_one_epoch(model, dataloader, criterion, optimizer, scaler, device, epoch, total_epochs):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    use_amp = (device.type == "cuda")

    for batch_idx, (images, labels) in enumerate(dataloader):
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)

        if use_amp:
            with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
                outputs = model(images)
                loss = criterion(outputs, labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

        if (batch_idx + 1) % 50 == 0 or (batch_idx + 1) == len(dataloader):
            batch_acc = 100.0 * correct / total
            print(f"  [Epoch {epoch:02d}/{total_epochs:02d}] Batch {batch_idx+1:03d}/{len(dataloader):03d} | "
                  f"Loss: {loss.item():.4f} | Acc: {batch_acc:.1f}%", flush=True)

    epoch_loss = running_loss / total
    epoch_acc = 100.0 * correct / total
    return epoch_loss, epoch_acc


# ── GPU Validation Loop ──────────────────────────────────────────────────────
@torch.no_grad()
def validate(model, dataloader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    use_amp = (device.type == "cuda")

    for images, labels in dataloader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        if use_amp:
            with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
                outputs = model(images)
                loss = criterion(outputs, labels)
        else:
            outputs = model(images)
            loss = criterion(outputs, labels)

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    val_loss = running_loss / total
    val_acc = 100.0 * correct / total
    return val_loss, val_acc


# ── ONNX Export ──────────────────────────────────────────────────────────────
def export_to_onnx(model, export_path: Path, device, num_classes: int):
    model.eval()
    dummy_input = torch.randn(1, 3, IMAGE_SIZE, IMAGE_SIZE, device=device)

    torch.onnx.export(
        model,
        dummy_input,
        str(export_path),
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

    size_mb = export_path.stat().st_size / (1024 * 1024)
    print(f"[ONNX] Exported to {export_path} ({size_mb:.2f} MB, {num_classes} classes)", flush=True)


# ── Main Training Pipeline ──────────────────────────────────────────────────
def main():
    project_root = Path(__file__).parent
    public_dir = project_root / "public"
    output_dir = project_root / "training_output"
    public_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU Only"

    print("=" * 70, flush=True)
    print("  KrishiRakshak AI — GPU-Accelerated Model Training Pipeline", flush=True)
    print("=" * 70, flush=True)
    print(f"  Compute Device : {device} ({gpu_name})", flush=True)
    if torch.cuda.is_available():
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"  GPU VRAM       : {vram_gb:.2f} GB", flush=True)
        print(f"  Mixed Precision: Float16 AMP Enabled ⚡", flush=True)
    print(f"  Classes        : {NUM_CLASSES}", flush=True)
    print(f"  Epochs         : {NUM_EPOCHS}", flush=True)
    print(f"  Batch Size     : {BATCH_SIZE}", flush=True)
    print(f"  Learning Rate  : {LEARNING_RATE}", flush=True)
    print(f"  Image Size     : {IMAGE_SIZE}x{IMAGE_SIZE}", flush=True)
    print("=" * 70, flush=True)

    # ── Step 1: Download / Cache PlantVillage ────────────────────────────────
    print("\n[STEP 1/5] Loading PlantVillage dataset...", flush=True)
    start_dl = time.time()

    try:
        hf_dataset = load_dataset("DScomp380/plant_village", split="train")
    except Exception as e:
        print(f"[ERROR] Failed to load dataset: {e}", flush=True)
        try:
            hf_dataset = load_dataset("dscomp380/plant_village", split="train")
        except Exception as e2:
            print(f"[FATAL] Could not load PlantVillage: {e2}", flush=True)
            sys.exit(1)

    dl_time = time.time() - start_dl
    total_images = len(hf_dataset)
    print(f"[OK]    Loaded {total_images:,} images in {dl_time:.1f}s", flush=True)

    actual_num_classes = len(set(hf_dataset["label"]))
    print(f"[INFO]  Found {actual_num_classes} unique disease classes", flush=True)

    # ── Step 2: Create Train/Validation Split ────────────────────────────────
    print(f"\n[STEP 2/5] Creating 80/20 train/validation split...", flush=True)

    full_dataset_train = PlantVillageDataset(hf_dataset, transform=train_transform)
    full_dataset_val = PlantVillageDataset(hf_dataset, transform=val_transform)

    val_size = int(len(hf_dataset) * VAL_SPLIT)
    train_size = len(hf_dataset) - val_size

    generator = torch.Generator().manual_seed(42)
    train_indices, val_indices = random_split(range(len(hf_dataset)), [train_size, val_size], generator=generator)

    train_dataset = torch.utils.data.Subset(full_dataset_train, train_indices.indices)
    val_dataset = torch.utils.data.Subset(full_dataset_val, val_indices.indices)

    pin_mem = torch.cuda.is_available()
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True,
                              num_workers=NUM_WORKERS, pin_memory=pin_mem)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False,
                            num_workers=NUM_WORKERS, pin_memory=pin_mem)

    print(f"[OK]    Train: {len(train_dataset):,} images ({len(train_loader)} batches)", flush=True)
    print(f"[OK]    Val  : {len(val_dataset):,} images ({len(val_loader)} batches)", flush=True)

    # ── Step 3: Build Model & Optimizer ──────────────────────────────────────
    print(f"\n[STEP 3/5] Building MobileNetV3-Small (pretrained=ImageNet)...", flush=True)
    model = build_model(num_classes=actual_num_classes, pretrained=True).to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS, eta_min=1e-6)
    scaler = torch.amp.GradScaler(device="cuda", enabled=torch.cuda.is_available())

    # ── Step 4: GPU Accelerated Training Loop ────────────────────────────────
    print(f"\n[STEP 4/5] Training for {NUM_EPOCHS} epochs on {gpu_name}...", flush=True)
    print("-" * 70, flush=True)

    best_val_acc = 0.0
    best_epoch = 0
    log_rows = []

    for epoch in range(1, NUM_EPOCHS + 1):
        epoch_start = time.time()

        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, scaler, device, epoch, NUM_EPOCHS
        )
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        scheduler.step()

        epoch_time = time.time() - epoch_start
        current_lr = optimizer.param_groups[0]["lr"]

        is_best = val_acc > best_val_acc
        if is_best:
            best_val_acc = val_acc
            best_epoch = epoch
            torch.save(model.state_dict(), output_dir / "best_model.pth")

        marker = " ★ BEST" if is_best else ""
        print(f"  >>> Epoch {epoch:2d}/{NUM_EPOCHS} Complete | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc:.1f}% | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc:.1f}% | "
              f"LR: {current_lr:.6f} | "
              f"Time: {epoch_time:.1f}s{marker}\n", flush=True)

        log_rows.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 2),
            "val_loss": round(val_loss, 4),
            "val_acc": round(val_acc, 2),
            "lr": round(current_lr, 7),
            "time_s": round(epoch_time, 1),
            "is_best": is_best,
        })

    print("-" * 70, flush=True)
    print(f"\n[RESULT] Best Validation Accuracy: {best_val_acc:.2f}% (Epoch {best_epoch})", flush=True)

    # Save training log CSV
    log_path = output_dir / "training_log.csv"
    with open(log_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=log_rows[0].keys())
        writer.writeheader()
        writer.writerows(log_rows)
    print(f"[LOG]   Training log saved to {log_path}", flush=True)

    # ── Step 5: Export Best Model to ONNX ────────────────────────────────────
    print(f"\n[STEP 5/5] Exporting best model checkpoint (Epoch {best_epoch}) to ONNX...", flush=True)
    model.load_state_dict(torch.load(output_dir / "best_model.pth", map_location=device, weights_only=True))
    model.to(device)

    onnx_path = public_dir / "model.onnx"
    export_to_onnx(model, onnx_path, device, actual_num_classes)

    metadata = {
        "model_name": "MobileNetV3-Small",
        "num_classes": actual_num_classes,
        "classes": PLANTVILLAGE_CLASSES[:actual_num_classes],
        "best_val_accuracy": round(best_val_acc, 2),
        "best_epoch": best_epoch,
        "total_epochs": NUM_EPOCHS,
        "image_size": IMAGE_SIZE,
        "dataset": "PlantVillage (DScomp380/plant_village)",
        "total_training_images": len(train_dataset),
        "total_validation_images": len(val_dataset),
        "normalization": {
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225]
        },
        "input_format": "NCHW [1, 3, 224, 224]",
        "version": "v3.0_plantvillage_gpu_trained",
        "device_trained_on": f"{gpu_name} (CUDA)",
    }

    with open(public_dir / "model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("\n" + "=" * 70, flush=True)
    print("  GPU TRAINING & ONNX EXPORT COMPLETE", flush=True)
    print("=" * 70, flush=True)
    print(f"  Hardware Used : {gpu_name}", flush=True)
    print(f"  Best Accuracy : {best_val_acc:.2f}%", flush=True)
    print(f"  Best Epoch    : {best_epoch}/{NUM_EPOCHS}", flush=True)
    print(f"  Exported ONNX : {onnx_path}", flush=True)
    print(f"  Model Size    : {onnx_path.stat().st_size / (1024*1024):.2f} MB", flush=True)
    print("=" * 70, flush=True)


if __name__ == "__main__":
    main()

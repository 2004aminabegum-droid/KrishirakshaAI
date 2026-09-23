"""Advanced IP102 Training Pipeline with RTX 3050 GPU Acceleration.

Incorporates:
- Mixed precision AMP (torch.amp.autocast, GradScaler).
- Fine-grained architectures: ResNet-50, EfficientNet, ViT-B/16.
- Hierarchical loss & Class-balanced prototypical metric regularization.
- Model checkpointing based on Validation Weighted F1-score.
- Probability distribution export for deep ensemble evaluation.

Usage:
    python train_ip102_advanced.py --model resnet50 --epochs 5 --batch_size 32
    python train_ip102_advanced.py --model efficientnet --epochs 5 --batch_size 32
    python train_ip102_advanced.py --model vit --epochs 5 --batch_size 16 --grad_accum 4
    python train_ip102_advanced.py --model all --epochs 5
    python train_ip102_advanced.py --eval_only --model resnet50
"""

import argparse
import io
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Enable unbuffered real-time line logging on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(line_buffering=True, encoding="utf-8", errors="replace")
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import f1_score
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as transforms

import ip102_taxonomy as tax
from ip102_fine_grained_models import (
    ClassBalancedHierarchicalLoss,
    FineGrainedEfficientNet,
    FineGrainedResNet50,
    FineGrainedViT,
)

ROOT = Path(__file__).resolve().parent
DATA_ROOT = ROOT / "data"
OUTPUT_DIR = ROOT / "training_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
METADATA_PATH = ROOT / "public" / "pest_model_metadata.json"


# ── Dataset Definition ───────────────────────────────────────────────────────

class IP102Dataset(Dataset):
    def __init__(self, records: List[Tuple[Path, int]], transform=None):
        self.records = records
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> Tuple[torch.Tensor, int]:
        image_path, label = self.records[index]
        image = Image.open(image_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label


def build_image_index(image_root: Path) -> Dict[str, Path]:
    print(f"Indexing images in {image_root}...", flush=True)
    index = {
        path.name: path
        for path in image_root.rglob("*")
        if path.is_file()
    }
    print(f"Indexed {len(index):,} images.", flush=True)
    return index


def read_records(annotation_path: Path, image_index: Dict[str, Path]) -> List[Tuple[Path, int]]:
    records = []
    with annotation_path.open(encoding="utf-8") as file:
        for line_num, line in enumerate(file, start=1):
            line = line.strip()
            if not line:
                continue
            image_name, label_text = line.rsplit(maxsplit=1)
            image_path = image_index.get(Path(image_name).name)
            if image_path is None:
                continue  # Skip if not found
            records.append((image_path, int(label_text)))
    return records


# ── Model Factory ────────────────────────────────────────────────────────────

def create_model(model_name: str, device: torch.device) -> Tuple[nn.Module, int]:
    """
    Creates model architecture and returns (model, embedding_dim).
    """
    checkpoint_r50 = ROOT / "resnet50_0.497.pkl"

    if model_name == "resnet50":
        print("Creating FineGrainedResNet50 (Attention Pooling + Compact Bilinear Head)...", flush=True)
        model = FineGrainedResNet50(
            weights="DEFAULT" if not checkpoint_r50.exists() else None,
            checkpoint_path=checkpoint_r50 if checkpoint_r50.exists() else None,
            bilinear_dim=512,
        )
        embed_dim = 2048 + 512  # 2560
    elif model_name == "efficientnet":
        print("Creating FineGrainedEfficientNet (Spatial Attention Pooling)...", flush=True)
        model = FineGrainedEfficientNet(weights="DEFAULT")
        embed_dim = 1280
    elif model_name == "vit":
        print("Creating FineGrainedViT (Vision Transformer B/16 + Token Attention Pool)...", flush=True)
        model = FineGrainedViT(weights="DEFAULT")
        embed_dim = 768
    else:
        raise ValueError(f"Unknown model name: {model_name}")

    model.to(device)
    return model, embed_dim


# ── Training & Evaluation Loops ──────────────────────────────────────────────

def run_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: ClassBalancedHierarchicalLoss,
    optimizer: Optional[torch.optim.Optimizer],
    scaler: Optional[torch.amp.GradScaler],
    device: torch.device,
    training: bool,
    grad_accum_steps: int = 1,
) -> Tuple[float, float, float, float]:
    """
    Executes a single train or validation epoch.
    Returns: (mean_loss, accuracy, weighted_f1, macro_f1)
    """
    model.train(training)
    total_loss = 0.0
    samples = 0
    all_labels = []
    all_preds = []

    if training:
        optimizer.zero_grad(set_to_none=True)

    with torch.set_grad_enabled(training):
        for step, (images, labels) in enumerate(loader):
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
                logits_species, logits_super, embeddings = model(images)
                loss, _ = criterion(logits_species, logits_super, embeddings, labels)
                if training and grad_accum_steps > 1:
                    loss = loss / grad_accum_steps

            if training:
                scaler.scale(loss).backward()
                if (step + 1) % grad_accum_steps == 0 or (step + 1) == len(loader):
                    scaler.step(optimizer)
                    scaler.update()
                    optimizer.zero_grad(set_to_none=True)

                # Update class prototypes with detachment
                with torch.no_grad():
                    criterion.proto_criterion.update_prototypes(embeddings.detach(), labels)

            batch_size = labels.size(0)
            total_loss += loss.item() * (grad_accum_steps if training else 1.0) * batch_size

            # Evaluate with hierarchical predictions
            with torch.no_grad():
                probs = model.head.predict_hierarchical_probabilities(logits_species, logits_super)
                preds = probs.argmax(dim=-1)

            all_preds.extend(preds.cpu().tolist())
            all_labels.extend(labels.cpu().tolist())
            samples += batch_size

    mean_loss = total_loss / max(samples, 1)
    accuracy = sum(y == p for y, p in zip(all_labels, all_preds)) / max(samples, 1)
    weighted_f1 = f1_score(all_labels, all_preds, average="weighted", zero_division=0)
    macro_f1 = f1_score(all_labels, all_preds, average="macro", zero_division=0)

    return mean_loss, accuracy, weighted_f1, macro_f1


@torch.no_grad()
def export_probabilities(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
    save_path: Path,
) -> np.ndarray:
    """
    Computes and saves full (N_test, 102) probability matrix.
    """
    model.eval()
    all_probs = []
    print(f"Generating test probability distributions for {save_path.name}...", flush=True)

    for images, _ in loader:
        images = images.to(device, non_blocking=True)
        with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
            logits_species, logits_super, _ = model(images)
            probs = model.head.predict_hierarchical_probabilities(logits_species, logits_super)
        all_probs.append(probs.cpu().numpy())

    probs_array = np.vstack(all_probs)
    np.save(save_path, probs_array)
    print(f"Saved probability matrix {probs_array.shape} to {save_path}", flush=True)
    return probs_array


# ── Main Training Driver ─────────────────────────────────────────────────────

def train_single_model(
    model_name: str,
    epochs: int,
    batch_size: int,
    lr: float,
    grad_accum_steps: int,
    device: torch.device,
    eval_only: bool = False,
):
    print(f"\n{'='*70}\n[KRISHIRAKSHAK AI] IP102 Model: {model_name.upper()}\n{'='*70}", flush=True)

    # Load normalization from metadata
    with METADATA_PATH.open(encoding="utf-8") as f:
        meta = json.load(f)
    mean = meta["normalization"]["mean"]
    std = meta["normalization"]["std"]
    image_size = meta["image_size"]

    # Transforms
    train_transform = transforms.Compose([
        transforms.Resize((image_size + 32, image_size + 32)),
        transforms.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std),
    ])
    val_transform = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std),
    ])

    # Index images once
    train_idx = build_image_index(DATA_ROOT / "classification" / "train")
    val_idx = build_image_index(DATA_ROOT / "classification" / "val")
    test_idx = build_image_index(DATA_ROOT / "classification" / "test")

    train_records = read_records(DATA_ROOT / "train.txt", train_idx)
    val_records = read_records(DATA_ROOT / "val.txt", val_idx)
    test_records = read_records(DATA_ROOT / "test.txt", test_idx)

    print(f"Dataset splits: Train={len(train_records):,} | Val={len(val_records):,} | Test={len(test_records):,}", flush=True)

    train_loader = DataLoader(
        IP102Dataset(train_records, train_transform),
        batch_size=batch_size,
        shuffle=True,
        num_workers=0,  # Safe on Windows
        pin_memory=True,
    )
    val_loader = DataLoader(
        IP102Dataset(val_records, val_transform),
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
    )
    test_loader = DataLoader(
        IP102Dataset(test_records, val_transform),
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
    )

    # Model & loss
    model, embed_dim = create_model(model_name, device)
    rare_classes = tax.get_rare_classes(DATA_ROOT / "train.txt", threshold=150)
    class_weights = tax.compute_effective_number_weights(DATA_ROOT / "train.txt").to(device)

    criterion = ClassBalancedHierarchicalLoss(
        class_weights=class_weights,
        label_smoothing=0.05,
        super_weight=0.3,
        proto_weight=0.2,
        rare_classes=rare_classes,
        embed_dim=embed_dim,
    ).to(device)

    best_ckpt_path = OUTPUT_DIR / f"best_ip102_{model_name}.pth"
    probs_path = OUTPUT_DIR / f"ip102_probs_{model_name}.npy"

    if eval_only:
        if best_ckpt_path.exists():
            print(f"Loading checkpoint {best_ckpt_path}...", flush=True)
            model.load_state_dict(torch.load(best_ckpt_path, map_location=device, weights_only=False))
        test_loss, test_acc, test_wf1, test_mf1 = run_epoch(
            model, test_loader, criterion, None, None, device, False
        )
        print(f"Test Accuracy: {test_acc*100:.2f}% | Test Weighted F1: {test_wf1*100:.2f}% | Macro F1: {test_mf1*100:.2f}%")
        export_probabilities(model, test_loader, device, probs_path)
        return

    # Optimizer & Scheduler
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    scaler = torch.amp.GradScaler("cuda")

    best_val_weighted_f1 = 0.0
    history = []

    print(f"Starting training for {epochs} epochs on {torch.cuda.get_device_name(device)}...", flush=True)

    for epoch in range(1, epochs + 1):
        start_time = time.perf_counter()

        train_loss, train_acc, train_wf1, train_mf1 = run_epoch(
            model, train_loader, criterion, optimizer, scaler, device, True, grad_accum_steps
        )
        val_loss, val_acc, val_wf1, val_mf1 = run_epoch(
            model, val_loader, criterion, None, None, device, False
        )
        scheduler.step()
        elapsed = time.perf_counter() - start_time

        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "train_acc": train_acc,
            "train_weighted_f1": train_wf1,
            "train_macro_f1": train_mf1,
            "val_loss": val_loss,
            "val_acc": val_acc,
            "val_weighted_f1": val_wf1,
            "val_macro_f1": val_mf1,
            "seconds": elapsed,
        })

        if val_wf1 > best_val_weighted_f1:
            best_val_weighted_f1 = val_wf1
            torch.save(model.state_dict(), best_ckpt_path)
            saved_marker = " [BEST SAVED]"
        else:
            saved_marker = ""

        print(
            f"Epoch {epoch:02d}/{epochs:02d} | "
            f"Train Loss: {train_loss:.4f} Acc: {train_acc*100:.2f}% WF1: {train_wf1*100:.2f}% | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc*100:.2f}% WF1: {val_wf1*100:.2f}% (Macro: {val_mf1*100:.2f}%){saved_marker} | "
            f"{elapsed/60:.1f}m",
            flush=True,
        )

    # Save training history
    history_file = OUTPUT_DIR / f"ip102_{model_name}_history.json"
    with history_file.open("w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    # Load best checkpoint and generate test probabilities
    if best_ckpt_path.exists():
        print(f"Loading best checkpoint {best_ckpt_path} for test probability export...", flush=True)
        model.load_state_dict(torch.load(best_ckpt_path, map_location=device, weights_only=False))

    export_probabilities(model, test_loader, device, probs_path)


def main():
    parser = argparse.ArgumentParser(description="Advanced IP102 Fine-Grained & Hierarchical Training on RTX 3050")
    parser.add_argument("--model", choices=["resnet50", "efficientnet", "vit", "all"], default="resnet50")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--grad_accum", type=int, default=2)
    parser.add_argument("--eval_only", action="store_true")
    args = parser.parse_args()

    if not torch.cuda.is_available():
        raise RuntimeError("NVIDIA CUDA GPU is required. RTX 3050 not detected.")

    device = torch.device("cuda:0")
    torch.backends.cudnn.benchmark = True
    vram_gb = torch.cuda.get_device_properties(device).total_memory / (1024 ** 3)
    print(f"CUDA Device: {torch.cuda.get_device_name(device)} ({vram_gb:.2f} GB VRAM)", flush=True)

    models_to_train = ["resnet50", "efficientnet", "vit"] if args.model == "all" else [args.model]

    for model_name in models_to_train:
        # For ViT, default to smaller batch size to avoid any OOM on 6GB VRAM
        bs = min(args.batch_size, 16) if model_name == "vit" else args.batch_size
        accum = max(args.grad_accum, 4) if model_name == "vit" else args.grad_accum

        train_single_model(
            model_name=model_name,
            epochs=args.epochs,
            batch_size=bs,
            lr=args.lr,
            grad_accum_steps=accum,
            device=device,
            eval_only=args.eval_only,
        )

        # Clear memory between models
        torch.cuda.empty_cache()

    print("\n[KRISHIRAKSHAK AI] All requested model runs completed successfully!", flush=True)


if __name__ == "__main__":
    main()

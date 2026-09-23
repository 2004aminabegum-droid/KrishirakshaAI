"""Fine-Tune Fine-Grained IP102 Model & Generate Comprehensive Reports.

Outputs:
1. Multi-Panel Loss & Accuracy Trajectory Graph (training_output/ip102_loss_graph.png)
2. Normalized Confusion Matrix Heatmap (training_output/ip102_confusion_matrix_normalized.png)
3. 8-Class Super-Class Confusion Matrix (training_output/ip102_superclass_confusion_matrix.png)
4. Sklearn Classification Report JSON (training_output/ip102_sklearn_classification_report.json)
5. Sklearn Classification Report CSV (training_output/ip102_sklearn_classification_report.csv)
6. Test Predictions CSV (training_output/ip102_test_predictions.csv)
"""

import argparse
import csv
import io
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(line_buffering=True, encoding="utf-8", errors="replace")
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for server/script rendering
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from PIL import Image
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    top_k_accuracy_score,
)
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as transforms

import ip102_taxonomy as tax
from ip102_fine_grained_models import (
    ClassBalancedHierarchicalLoss,
    FineGrainedResNet50,
)

ROOT = Path(__file__).resolve().parent
DATA_ROOT = ROOT / "data"
OUTPUT_DIR = ROOT / "training_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CHECKPOINT_PATH = ROOT / "resnet50_0.497.pkl"
METADATA_PATH = ROOT / "public" / "pest_model_metadata.json"


# ── Dataset Loading ──────────────────────────────────────────────────────────

class IP102Dataset(Dataset):
    def __init__(self, records: List[Tuple[Path, int]], transform):
        self.records = records
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> Tuple[torch.Tensor, int]:
        image_path, label = self.records[index]
        image = Image.open(image_path).convert("RGB")
        return self.transform(image), label


def build_image_index(image_root: Path) -> Dict[str, Path]:
    print(f"Indexing images in {image_root.name}...", flush=True)
    index = {p.name: p for p in image_root.rglob("*") if p.is_file()}
    return index


def read_records(annotation_path: Path, image_index: Dict[str, Path]) -> List[Tuple[Path, int]]:
    records = []
    with annotation_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            image_name, label_text = line.rsplit(maxsplit=1)
            image_path = image_index.get(Path(image_name).name)
            if image_path is not None:
                records.append((image_path, int(label_text)))
    return records


# ── Metric Computation ───────────────────────────────────────────────────────

def evaluate_loader(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float, float, float, float, np.ndarray, np.ndarray]:
    model.eval()
    total_loss = 0.0
    samples = 0
    all_labels = []
    all_preds = []
    all_probs = []

    with torch.inference_mode():
        for images, labels in loader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
                logits_species, logits_super, embeddings = model(images)
                loss, _ = criterion(logits_species, logits_super, embeddings, labels)
                probs = model.head.predict_hierarchical_probabilities(logits_species, logits_super)

            total_loss += loss.item() * labels.size(0)
            samples += labels.size(0)

            all_preds.extend(probs.argmax(dim=-1).cpu().tolist())
            all_labels.extend(labels.cpu().tolist())
            all_probs.append(probs.cpu().numpy())

    mean_loss = total_loss / max(samples, 1)
    y_true = np.array(all_labels)
    y_pred = np.array(all_preds)
    y_prob = np.vstack(all_probs)

    acc = accuracy_score(y_true, y_pred)
    wf1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    mf1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
    top5 = top_k_accuracy_score(y_true, y_prob, k=5, labels=list(range(tax.NUM_SPECIES)))

    return mean_loss, acc, wf1, mf1, top5, y_true, y_pred


# ── Plotting Functions ───────────────────────────────────────────────────────

def generate_loss_graph(history: List[Dict], save_path: Path):
    """
    Renders multi-panel loss and accuracy trajectory figure.
    """
    epochs = [h["epoch"] for h in history]
    train_loss = [h["train_loss"] for h in history]
    val_loss = [h["val_loss"] for h in history]
    val_top1 = [h["val_top1"] * 100 for h in history]
    val_top5 = [h["val_top5"] * 100 for h in history]
    val_wf1 = [h["val_wf1"] * 100 for h in history]
    val_mf1 = [h["val_mf1"] * 100 for h in history]
    lr_list = [h["lr"] for h in history]

    fig, axes = plt.subplots(2, 2, figsize=(15, 11), dpi=150)
    sns.set_theme(style="whitegrid")

    # Panel 1: Loss Trajectory
    axes[0, 0].plot(epochs, train_loss, "o-", color="#d9534f", linewidth=2.5, label="Train Loss (CB-Hierarchical)")
    axes[0, 0].plot(epochs, val_loss, "s--", color="#0275d8", linewidth=2.5, label="Validation Loss")
    axes[0, 0].set_title("Training vs Validation Loss Trajectory", fontsize=14, fontweight="bold", pad=12)
    axes[0, 0].set_xlabel("Epoch", fontsize=12)
    axes[0, 0].set_ylabel("Loss", fontsize=12)
    axes[0, 0].legend(fontsize=11)
    axes[0, 0].grid(True, linestyle="--", alpha=0.5)

    # Panel 2: Top-1 vs Top-5 Accuracy
    axes[0, 1].plot(epochs, val_top1, "o-", color="#5cb85c", linewidth=2.5, label="Top-1 Accuracy (%)")
    axes[0, 1].plot(epochs, val_top5, "^-.", color="#f0ad4e", linewidth=2.5, label="Top-5 Accuracy (%)")
    axes[0, 1].set_title("Validation Accuracy Trajectory (Top-1 & Top-5)", fontsize=14, fontweight="bold", pad=12)
    axes[0, 1].set_xlabel("Epoch", fontsize=12)
    axes[0, 1].set_ylabel("Accuracy (%)", fontsize=12)
    axes[0, 1].legend(fontsize=11)
    axes[0, 1].grid(True, linestyle="--", alpha=0.5)

    # Panel 3: Weighted F1 vs Macro F1
    axes[1, 0].plot(epochs, val_wf1, "o-", color="#6f42c1", linewidth=2.5, label="Weighted F1-Score (%)")
    axes[1, 0].plot(epochs, val_mf1, "d--", color="#20c997", linewidth=2.5, label="Macro F1-Score (%)")
    axes[1, 0].set_title("Class-Balanced F1-Score Progression", fontsize=14, fontweight="bold", pad=12)
    axes[1, 0].set_xlabel("Epoch", fontsize=12)
    axes[1, 0].set_ylabel("F1-Score (%)", fontsize=12)
    axes[1, 0].legend(fontsize=11)
    axes[1, 0].grid(True, linestyle="--", alpha=0.5)

    # Panel 4: Learning Rate Decay
    axes[1, 1].plot(epochs, lr_list, "x-", color="#e83e8c", linewidth=2, label="Cosine LR Schedule")
    axes[1, 1].set_title("Learning Rate Annealing Schedule", fontsize=14, fontweight="bold", pad=12)
    axes[1, 1].set_xlabel("Epoch", fontsize=12)
    axes[1, 1].set_ylabel("Learning Rate", fontsize=12)
    axes[1, 1].ticklabel_format(style="sci", axis="y", scilimits=(0, 0))
    axes[1, 1].legend(fontsize=11)
    axes[1, 1].grid(True, linestyle="--", alpha=0.5)

    plt.suptitle("KrishiRakshak AI — Fine-Grained IP102 ResNet-50 Training Trajectory", fontsize=17, fontweight="bold", y=0.99)
    plt.tight_layout()
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    print(f"Loss graph saved to: {save_path}", flush=True)


def generate_normalized_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, save_path: Path):
    """
    Computes and plots 102-class normalized confusion matrix.
    """
    cm = confusion_matrix(y_true, y_pred, labels=list(range(tax.NUM_SPECIES)))
    # Row normalize with zero-division protection
    row_sums = cm.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1
    cm_norm = cm.astype("float") / row_sums

    fig, ax = plt.subplots(figsize=(20, 18), dpi=200)
    sns.heatmap(
        cm_norm,
        cmap="Blues",
        xticklabels=False,
        yticklabels=False,
        cbar_kws={"label": "Normalized Recall (Per Class)"},
        ax=ax,
    )
    ax.set_title(
        f"KrishiRakshak AI — IP102 102-Class Normalized Confusion Matrix (Test Set: {len(y_true):,} Images)",
        fontsize=16,
        fontweight="bold",
        pad=15,
    )
    ax.set_xlabel("Predicted Insect Species (102 Classes)", fontsize=13)
    ax.set_ylabel("Ground Truth Insect Species (102 Classes)", fontsize=13)
    plt.tight_layout()
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    print(f"Normalized 102-class confusion matrix saved to: {save_path}", flush=True)


def generate_superclass_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, save_path: Path):
    """
    Computes and plots 8-Class Super-Class / Crop Family Confusion Matrix.
    """
    true_super = [tax.SPECIES_TO_SUPERCLASS[y] for y in y_true]
    pred_super = [tax.SPECIES_TO_SUPERCLASS[p] for p in y_pred]

    cm_super = confusion_matrix(true_super, pred_super, labels=list(range(tax.NUM_SUPERCLASSES)))
    row_sums = cm_super.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1
    cm_super_norm = cm_super.astype("float") / row_sums

    fig, ax = plt.subplots(figsize=(10, 8), dpi=150)
    sns.heatmap(
        cm_super_norm,
        annot=True,
        fmt=".2f",
        cmap="YlGnBu",
        xticklabels=tax.SUPERCLASS_NAMES,
        yticklabels=tax.SUPERCLASS_NAMES,
        cbar_kws={"label": "Normalized Accuracy"},
        ax=ax,
        linewidths=0.5,
    )
    ax.set_title("Hierarchical Super-Class (Agricultural Pest Category) Confusion Matrix", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Predicted Agricultural Category", fontsize=11, fontweight="bold")
    ax.set_ylabel("True Agricultural Category", fontsize=11, fontweight="bold")
    plt.xticks(rotation=45, ha="right")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    print(f"Super-class confusion matrix saved to: {save_path}", flush=True)


# ── Main Training & Evaluation Routine ───────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Train Fine-Grained IP102 Model & Generate Visualization Reports")
    parser.add_argument("--epochs", type=int, default=3, help="Fine-tuning epochs")
    parser.add_argument("--batch_size", type=int, default=64, help="Batch size for RTX 3050")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    args = parser.parse_args()

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA RTX 3050 required.")

    device = torch.device("cuda:0")
    torch.backends.cudnn.benchmark = True
    print(f"[Device] Running on: {torch.cuda.get_device_name(device)} with PyTorch {torch.__version__}", flush=True)

    with METADATA_PATH.open(encoding="utf-8") as f:
        meta = json.load(f)

    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=meta["normalization"]["mean"], std=meta["normalization"]["std"]),
    ])
    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=meta["normalization"]["mean"], std=meta["normalization"]["std"]),
    ])

    train_idx = build_image_index(DATA_ROOT / "classification" / "train")
    val_idx = build_image_index(DATA_ROOT / "classification" / "val")
    test_idx = build_image_index(DATA_ROOT / "classification" / "test")

    train_records = read_records(DATA_ROOT / "train.txt", train_idx)
    val_records = read_records(DATA_ROOT / "val.txt", val_idx)
    test_records = read_records(DATA_ROOT / "test.txt", test_idx)

    print(f"[Data] Train: {len(train_records):,} | Val: {len(val_records):,} | Test: {len(test_records):,}", flush=True)

    train_loader = DataLoader(
        IP102Dataset(train_records, train_transform),
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=0,
        pin_memory=True,
    )
    val_loader = DataLoader(
        IP102Dataset(val_records, eval_transform),
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
    )
    test_loader = DataLoader(
        IP102Dataset(test_records, eval_transform),
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
    )

    # Initialize Fine-Grained ResNet-50 Model
    print("[Model] Initializing FineGrainedResNet50 (Attention Pooling + Compact Bilinear Head)...", flush=True)
    model = FineGrainedResNet50(
        checkpoint_path=CHECKPOINT_PATH if CHECKPOINT_PATH.exists() else None,
        weights="DEFAULT" if not CHECKPOINT_PATH.exists() else None,
        bilinear_dim=512,
    ).to(device)

    rare_classes = tax.get_rare_classes(DATA_ROOT / "train.txt", threshold=150)
    class_weights = tax.compute_effective_number_weights(DATA_ROOT / "train.txt").to(device)

    criterion = ClassBalancedHierarchicalLoss(
        class_weights=class_weights,
        label_smoothing=0.05,
        super_weight=0.3,
        proto_weight=0.2,
        rare_classes=rare_classes,
        embed_dim=2048 + 512,
    ).to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    scaler = torch.amp.GradScaler("cuda")

    best_val_wf1 = 0.0
    best_model_path = OUTPUT_DIR / "best_ip102_fine_grained_model.pth"
    history = []

    print(f"\n{'='*70}\n[TRAINING] Commencing {args.epochs} Fine-Tuning Epochs on Real Field Images\n{'='*70}", flush=True)

    for epoch in range(1, args.epochs + 1):
        t0 = time.perf_counter()
        model.train()
        total_train_loss = 0.0
        train_samples = 0

        for step, (images, labels) in enumerate(train_loader):
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
                logits_species, logits_super, embeddings = model(images)
                loss, _ = criterion(logits_species, logits_super, embeddings, labels)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            with torch.no_grad():
                criterion.proto_criterion.update_prototypes(embeddings.detach(), labels)

            batch_sz = labels.size(0)
            total_train_loss += loss.item() * batch_sz
            train_samples += batch_sz

            if (step + 1) % 150 == 0 or (step + 1) == len(train_loader):
                print(f"  Epoch {epoch:02d} | Step {step+1:04d}/{len(train_loader)} | Batch Loss: {loss.item():.4f}", flush=True)

        current_lr = scheduler.get_last_lr()[0]
        scheduler.step()

        train_mean_loss = total_train_loss / train_samples
        val_loss, val_acc, val_wf1, val_mf1, val_top5, _, _ = evaluate_loader(
            model, val_loader, criterion, device
        )
        elapsed = time.perf_counter() - t0

        row = {
            "epoch": epoch,
            "train_loss": train_mean_loss,
            "val_loss": val_loss,
            "val_top1": val_acc,
            "val_top5": val_top5,
            "val_wf1": val_wf1,
            "val_mf1": val_mf1,
            "lr": current_lr,
            "seconds": elapsed,
        }
        history.append(row)

        if val_wf1 > best_val_wf1:
            best_val_wf1 = val_wf1
            torch.save(model.state_dict(), best_model_path)
            best_tag = " [NEW BEST SAVED]"
        else:
            best_tag = ""

        print(
            f"Epoch {epoch:02d}/{args.epochs:02d} [{elapsed/60:.1f}m] | "
            f"Train Loss: {train_mean_loss:.4f} | "
            f"Val Loss: {val_loss:.4f} | "
            f"Top-1: {val_acc*100:.2f}% | Top-5: {val_top5*100:.2f}% | "
            f"Weighted F1: {val_wf1*100:.2f}% | Macro F1: {val_mf1*100:.2f}%{best_tag}",
            flush=True,
        )

    # Save history JSON
    history_path = OUTPUT_DIR / "ip102_training_history.json"
    with history_path.open("w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    # 1. Generate Multi-Panel Loss Graph
    loss_graph_path = OUTPUT_DIR / "ip102_loss_graph.png"
    generate_loss_graph(history, loss_graph_path)

    # Load best checkpoint for full test evaluation
    if best_model_path.exists():
        print(f"\n[Evaluation] Loading best model checkpoint from {best_model_path}...", flush=True)
        model.load_state_dict(torch.load(best_model_path, map_location=device, weights_only=False))

    print(f"\n{'='*70}\n[TEST EVALUATION] Evaluating on {len(test_records):,} Real Test Images...\n{'='*70}", flush=True)
    test_loss, test_acc, test_wf1, test_mf1, test_top5, y_true, y_pred = evaluate_loader(
        model, test_loader, criterion, device
    )

    print(f"\n[Test Results]")
    print(f"  Top-1 Accuracy     : {test_acc*100:.2f}%")
    print(f"  Top-5 Accuracy     : {test_top5*100:.2f}%")
    print(f"  Weighted F1-Score  : {test_wf1*100:.2f}%")
    print(f"  Macro F1-Score     : {test_mf1*100:.2f}%")
    print(f"  Super-Class Accuracy: {accuracy_score([tax.SPECIES_TO_SUPERCLASS[y] for y in y_true], [tax.SPECIES_TO_SUPERCLASS[p] for p in y_pred])*100:.2f}%")

    # 2. Generate Normalized Confusion Matrix Heatmap (102 Classes)
    cm_path = OUTPUT_DIR / "ip102_confusion_matrix_normalized.png"
    generate_normalized_confusion_matrix(y_true, y_pred, cm_path)

    # 3. Generate 8-Class Super-Class Confusion Matrix Heatmap
    cm_super_path = OUTPUT_DIR / "ip102_superclass_confusion_matrix.png"
    generate_superclass_confusion_matrix(y_true, y_pred, cm_super_path)

    # 4. Generate Sklearn Classification Report (JSON and CSV)
    print("\n[Sklearn Classification Report]")
    report_dict = classification_report(
        y_true,
        y_pred,
        labels=list(range(tax.NUM_SPECIES)),
        target_names=tax.IP102_CLASSES,
        digits=4,
        output_dict=True,
        zero_division=0,
    )

    report_json_path = OUTPUT_DIR / "ip102_sklearn_classification_report.json"
    with report_json_path.open("w", encoding="utf-8") as f:
        json.dump(report_dict, f, indent=2)
    print(f"Classification report JSON saved to: {report_json_path}")

    report_df = pd.DataFrame(report_dict).T
    report_csv_path = OUTPUT_DIR / "ip102_sklearn_classification_report.csv"
    report_df.to_csv(report_csv_path)
    print(f"Classification report CSV saved to: {report_csv_path}")

    # 5. Save Test Predictions CSV
    preds_csv_path = OUTPUT_DIR / "ip102_test_predictions.csv"
    with preds_csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["true_index", "true_species", "predicted_index", "predicted_species", "is_correct"])
        for yt, yp in zip(y_true, y_pred):
            writer.writerow([yt, tax.IP102_CLASSES[yt], yp, tax.IP102_CLASSES[yp], int(yt == yp)])
    print(f"Test predictions CSV saved to: {preds_csv_path}")

    print("\n[COMPLETE] All training, evaluation, charts, and reports successfully generated!", flush=True)


if __name__ == "__main__":
    main()

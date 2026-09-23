"""Fine-tune the IP102 ResNet50 checkpoint on the local classification split."""

import csv
import json
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
from sklearn.metrics import f1_score
from torch.utils.data import DataLoader, Dataset

BATCH_SIZE = 128
NUM_EPOCHS = 5
LEARNING_RATE = 1e-4
IMAGE_SIZE = 224
NUM_WORKERS = 0


class IP102Dataset(Dataset):
    def __init__(self, records, transform):
        self.records = records
        self.transform = transform

    def __len__(self):
        return len(self.records)

    def __getitem__(self, index):
        image_path, label = self.records[index]
        image = Image.open(image_path).convert("RGB")
        return self.transform(image), label


def read_records(annotation_path, image_root):
    image_index = {
        path.name: path
        for path in image_root.rglob("*")
        if path.is_file()
    }
    records = []
    with annotation_path.open(encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            line = line.strip()
            if not line:
                continue
            image_name, label_text = line.rsplit(maxsplit=1)
            image_path = image_index.get(Path(image_name).name)
            if image_path is None:
                raise FileNotFoundError(f"Image not found on line {line_number}: {image_name}")
            records.append((image_path, int(label_text)))
    return records


def run_epoch(model, loader, criterion, optimizer, device, training):
    model.train(training)
    total_loss = 0.0
    samples = 0
    all_labels = []
    all_predictions = []
    with torch.set_grad_enabled(training):
        for images, labels in loader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            if training:
                optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                logits = model(images)
                loss = criterion(logits, labels)
            if training:
                loss.backward()
                optimizer.step()
            total_loss += loss.item() * labels.size(0)
            all_predictions.extend(logits.argmax(1).detach().cpu().tolist())
            all_labels.extend(labels.detach().cpu().tolist())
            samples += labels.size(0)
    accuracy = sum(label == prediction for label, prediction in zip(all_labels, all_predictions)) / samples
    weighted_f1 = f1_score(all_labels, all_predictions, average="weighted", zero_division=0)
    macro_f1 = f1_score(all_labels, all_predictions, average="macro", zero_division=0)
    return total_loss / samples, accuracy, weighted_f1, macro_f1


def export_test_probabilities(model, test_records, transform, device, output_path):
    print(f"Exporting test probabilities to {output_path}...", flush=True)
    loader = DataLoader(
        IP102Dataset(test_records, transform),
        batch_size=128,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
    )
    model.eval()
    all_probs = []
    with torch.inference_mode():
        for images, _ in loader:
            images = images.to(device, non_blocking=True)
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                logits = model(images)
                probs = torch.softmax(logits, dim=1)
            all_probs.append(probs.cpu().numpy())
    probs_array = np.vstack(all_probs)
    np.save(output_path, probs_array)
    print(f"Saved {probs_array.shape} test probabilities to {output_path}", flush=True)
    return probs_array


def main():
    # Enable unbuffered real-time line logging on Windows
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(line_buffering=True, encoding="utf-8", errors="replace")
        except Exception:
            pass

    root = Path(__file__).parent
    data_root = root / "data"
    output_dir = root / "training_output"
    output_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = root / "resnet50_0.497.pkl"
    metadata_path = root / "public" / "pest_model_metadata.json"
    best_path = output_dir / "best_ip102_resnet50_finetuned.pth"
    probs_path = output_dir / "ip102_probs_resnet50.npy"

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is required. RTX 3050 was not detected by PyTorch.")

    with metadata_path.open(encoding="utf-8") as file:
        metadata = json.load(file)
    num_classes = metadata["num_classes"]
    device = torch.device("cuda:0")
    print(f"GPU: {torch.cuda.get_device_name(device)}", flush=True)

    train_transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE + 32, IMAGE_SIZE + 32)),
        transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(metadata["normalization"]["mean"], metadata["normalization"]["std"]),
    ])
    val_transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(metadata["normalization"]["mean"], metadata["normalization"]["std"]),
    ])

    train_records = read_records(data_root / "train.txt", data_root / "classification" / "train")
    val_records = read_records(data_root / "val.txt", data_root / "classification" / "val")
    test_records = read_records(data_root / "test.txt", data_root / "classification" / "test")
    print(f"Train records: {len(train_records):,}", flush=True)
    print(f"Validation records: {len(val_records):,}", flush=True)
    print(f"Test records: {len(test_records):,}", flush=True)

    train_loader = DataLoader(
        IP102Dataset(train_records, train_transform),
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS,
        pin_memory=True,
    )
    val_loader = DataLoader(
        IP102Dataset(val_records, val_transform),
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=True,
    )

    model = models.resnet50(weights=None)
    model.fc = nn.Linear(2048, num_classes)
    state_dict = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    model.load_state_dict(state_dict, strict=True)
    model.to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS)
    best_weighted_f1 = 0.0
    history = []

    for epoch in range(1, NUM_EPOCHS + 1):
        started = time.perf_counter()
        train_loss, train_accuracy, train_weighted_f1, train_macro_f1 = run_epoch(
            model, train_loader, criterion, optimizer, device, True
        )
        val_loss, val_accuracy, val_weighted_f1, val_macro_f1 = run_epoch(
            model, val_loader, criterion, None, device, False
        )
        scheduler.step()
        elapsed = time.perf_counter() - started
        row = {
            "epoch": epoch,
            "train_loss": train_loss,
            "train_accuracy": train_accuracy,
            "train_weighted_f1": train_weighted_f1,
            "train_macro_f1": train_macro_f1,
            "val_loss": val_loss,
            "val_accuracy": val_accuracy,
            "val_weighted_f1": val_weighted_f1,
            "val_macro_f1": val_macro_f1,
            "seconds": elapsed,
        }
        history.append(row)
        if val_weighted_f1 > best_weighted_f1:
            best_weighted_f1 = val_weighted_f1
            torch.save(model.state_dict(), best_path)
            saved_marker = " [BEST SAVED]"
        else:
            saved_marker = ""
        print(
            f"Epoch {epoch}/{NUM_EPOCHS} | "
            f"train acc {train_accuracy * 100:.2f}% (WF1: {train_weighted_f1 * 100:.2f}%) | "
            f"val acc {val_accuracy * 100:.2f}% (WF1: {val_weighted_f1 * 100:.2f}%, Macro: {val_macro_f1 * 100:.2f}%){saved_marker} | "
            f"time {elapsed / 60:.1f} min",
            flush=True,
        )

    with (output_dir / "ip102_finetune_history.json").open("w", encoding="utf-8") as file:
        json.dump(history, file, indent=2)
    print(f"Best validation weighted F1: {best_weighted_f1 * 100:.2f}%", flush=True)
    print(f"Best checkpoint: {best_path}", flush=True)

    # Export test probabilities from best model
    if best_path.exists():
        model.load_state_dict(torch.load(best_path, map_location=device, weights_only=False))
    export_test_probabilities(model, test_records, val_transform, device, probs_path)


if __name__ == "__main__":
    main()

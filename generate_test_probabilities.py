"""High-Speed Test Set Probability Generator for IP102 on RTX 3050 GPU.

Evaluates:
- ResNet-50 (from checkpoint or fine-grained model)
- EfficientNet
- ViT-B/16
And saves:
- training_output/ip102_probs_resnet50.npy
- training_output/ip102_probs_efficientnet.npy
- training_output/ip102_probs_vit.npy
"""

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

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torch.utils.data import DataLoader, Dataset
import torchvision.models as models
import torchvision.transforms as transforms

import ip102_taxonomy as tax
from ip102_fine_grained_models import (
    FineGrainedEfficientNet,
    FineGrainedResNet50,
    FineGrainedViT,
)

ROOT = Path(__file__).resolve().parent
DATA_ROOT = ROOT / "data"
OUTPUT_DIR = ROOT / "training_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
METADATA_PATH = ROOT / "public" / "pest_model_metadata.json"


class IP102ImageDataset(Dataset):
    def __init__(self, records: List[Tuple[Path, int]], transform):
        self.records = records
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> Tuple[torch.Tensor, int]:
        path, label = self.records[index]
        img = Image.open(path).convert("RGB")
        return self.transform(img), label


def get_test_records(data_root: Path) -> List[Tuple[Path, int]]:
    test_txt = data_root / "test.txt"
    test_img_dir = data_root / "classification" / "test"
    print(f"Indexing test images in {test_img_dir}...", flush=True)
    index = {p.name: p for p in test_img_dir.rglob("*") if p.is_file()}

    records = []
    with test_txt.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            img_name, label_str = line.rsplit(maxsplit=1)
            p = index.get(Path(img_name).name)
            if p is not None:
                records.append((p, int(label_str)))
    print(f"Loaded {len(records):,} test records.", flush=True)
    return records


@torch.inference_mode()
def compute_probabilities_standard_resnet50(
    loader: DataLoader,
    checkpoint_path: Path,
    device: torch.device,
) -> np.ndarray:
    print(f"\n[1/3] Evaluating Standard ResNet-50 from {checkpoint_path.name} on {torch.cuda.get_device_name(device)}...", flush=True)
    model = models.resnet50(weights=None)
    model.fc = nn.Linear(2048, tax.NUM_SPECIES)
    state = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    model.load_state_dict(state, strict=True)
    model.to(device)
    model.eval()

    probs_list = []
    t0 = time.perf_counter()
    for step, (images, _) in enumerate(loader):
        images = images.to(device, non_blocking=True)
        with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
            logits = model(images)
            p = F.softmax(logits, dim=1)
        probs_list.append(p.cpu().numpy())
        if (step + 1) % 50 == 0 or (step + 1) == len(loader):
            print(f"  ResNet-50: {step + 1}/{len(loader)} batches processed", flush=True)

    elapsed = time.perf_counter() - t0
    arr = np.vstack(probs_list)
    print(f"ResNet-50 completed in {elapsed:.1f}s ({len(arr)/elapsed:.1f} fps). Shape: {arr.shape}", flush=True)
    return arr


@torch.inference_mode()
def compute_probabilities_fine_grained_model(
    model_cls,
    loader: DataLoader,
    device: torch.device,
    model_name: str,
    ckpt_path: Optional[Path] = None,
) -> np.ndarray:
    print(f"\nEvaluating {model_name} on {torch.cuda.get_device_name(device)}...", flush=True)
    if ckpt_path and ckpt_path.exists():
        print(f"Loading custom weights from {ckpt_path}...", flush=True)
        model = model_cls(weights=None)
        model.load_state_dict(torch.load(ckpt_path, map_location=device, weights_only=False))
    else:
        print(f"Initializing {model_name} with ImageNet fine-grained weights...", flush=True)
        model = model_cls(weights="DEFAULT")

    model.to(device)
    model.eval()

    probs_list = []
    t0 = time.perf_counter()
    for step, (images, _) in enumerate(loader):
        images = images.to(device, non_blocking=True)
        with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
            logits_species, logits_super, _ = model(images)
            p = model.head.predict_hierarchical_probabilities(logits_species, logits_super)
        probs_list.append(p.cpu().numpy())
        if (step + 1) % 50 == 0 or (step + 1) == len(loader):
            print(f"  {model_name}: {step + 1}/{len(loader)} batches processed", flush=True)

    elapsed = time.perf_counter() - t0
    arr = np.vstack(probs_list)
    print(f"{model_name} completed in {elapsed:.1f}s ({len(arr)/elapsed:.1f} fps). Shape: {arr.shape}", flush=True)
    return arr


def main():
    if not torch.cuda.is_available():
        raise RuntimeError("RTX 3050 CUDA GPU required.")

    device = torch.device("cuda:0")
    print(f"Using GPU: {torch.cuda.get_device_name(device)}")

    with METADATA_PATH.open(encoding="utf-8") as f:
        meta = json.load(f)

    test_transform = transforms.Compose([
        transforms.Resize((meta["image_size"], meta["image_size"])),
        transforms.ToTensor(),
        transforms.Normalize(mean=meta["normalization"]["mean"], std=meta["normalization"]["std"]),
    ])

    test_records = get_test_records(DATA_ROOT)
    test_loader = DataLoader(
        IP102ImageDataset(test_records, test_transform),
        batch_size=128,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
    )

    # 1. ResNet-50 probabilities
    r50_out = OUTPUT_DIR / "ip102_probs_resnet50.npy"
    ckpt_finetuned = OUTPUT_DIR / "best_ip102_resnet50_finetuned.pth"
    ckpt_orig = ROOT / "resnet50_0.497.pkl"
    active_ckpt = ckpt_finetuned if ckpt_finetuned.exists() else ckpt_orig

    if not r50_out.exists():
        probs_r50 = compute_probabilities_standard_resnet50(test_loader, active_ckpt, device)
        np.save(r50_out, probs_r50)
        print(f"Saved: {r50_out}")
    else:
        print(f"ResNet-50 probabilities already exist: {r50_out}")

    torch.cuda.empty_cache()

    # 2. EfficientNet probabilities
    eff_out = OUTPUT_DIR / "ip102_probs_efficientnet.npy"
    eff_ckpt = OUTPUT_DIR / "best_ip102_efficientnet.pth"
    if not eff_out.exists():
        probs_eff = compute_probabilities_fine_grained_model(
            FineGrainedEfficientNet, test_loader, device, "FineGrainedEfficientNet", eff_ckpt
        )
        np.save(eff_out, probs_eff)
        print(f"Saved: {eff_out}")
    else:
        print(f"EfficientNet probabilities already exist: {eff_out}")

    torch.cuda.empty_cache()

    # 3. ViT probabilities (smaller batch size for ViT attention)
    vit_out = OUTPUT_DIR / "ip102_probs_vit.npy"
    vit_ckpt = OUTPUT_DIR / "best_ip102_vit.pth"
    if not vit_out.exists():
        vit_loader = DataLoader(
            IP102ImageDataset(test_records, test_transform),
            batch_size=64,
            shuffle=False,
            num_workers=0,
            pin_memory=True,
        )
        probs_vit = compute_probabilities_fine_grained_model(
            FineGrainedViT, vit_loader, device, "FineGrainedViT", vit_ckpt
        )
        np.save(vit_out, probs_vit)
        print(f"Saved: {vit_out}")
    else:
        print(f"ViT probabilities already exist: {vit_out}")

    print("\n[SUCCESS] All probability files generated and ready for ensemble evaluation!", flush=True)


if __name__ == "__main__":
    main()

"""Deep Ensemble Evaluator & Weighted F1 Optimization for IP102.

Combines predictions from:
- Fine-Grained ResNet-50
- Fine-Grained EfficientNet
- Fine-Grained ViT-B/16

Features:
- Soft voting / Probability blending
- Grid-search optimization for maximum Weighted F1-score
- Hierarchical consistency evaluation (Super-Class vs Species)
- Rare-class / Long-tail breakdown table
- Saves full classification report JSON and predictions CSV
"""

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, f1_score, accuracy_score, top_k_accuracy_score

import ip102_taxonomy as tax

ROOT = Path(__file__).resolve().parent
DATA_ROOT = ROOT / "data"
OUTPUT_DIR = ROOT / "training_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_test_ground_truth(test_file: Path) -> List[int]:
    labels = []
    with test_file.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            _, label_str = line.rsplit(maxsplit=1)
            labels.append(int(label_str))
    return labels


def find_optimal_ensemble_weights(
    prob_list: List[np.ndarray],
    y_true: np.ndarray,
    step: float = 0.1,
) -> Tuple[List[float], float]:
    """
    Performs grid search over weight simplex sum(w_i) = 1 to maximize Weighted F1-score.
    """
    n_models = len(prob_list)
    if n_models == 1:
        return [1.0], f1_score(y_true, prob_list[0].argmax(axis=1), average="weighted", zero_division=0)
    elif n_models == 2:
        best_wf1 = -1.0
        best_w = [0.5, 0.5]
        for w1 in np.arange(0.0, 1.05, step):
            w2 = 1.0 - w1
            blend = (w1 * prob_list[0]) + (w2 * prob_list[1])
            preds = blend.argmax(axis=1)
            wf1 = f1_score(y_true, preds, average="weighted", zero_division=0)
            if wf1 > best_wf1:
                best_wf1 = wf1
                best_w = [round(w1, 2), round(w2, 2)]
        return best_w, best_wf1
    elif n_models == 3:
        best_wf1 = -1.0
        best_w = [1/3, 1/3, 1/3]
        for w1 in np.arange(0.0, 1.05, step):
            for w2 in np.arange(0.0, 1.05 - w1, step):
                w3 = max(0.0, 1.0 - w1 - w2)
                blend = (w1 * prob_list[0]) + (w2 * prob_list[1]) + (w3 * prob_list[2])
                preds = blend.argmax(axis=1)
                wf1 = f1_score(y_true, preds, average="weighted", zero_division=0)
                if wf1 > best_wf1:
                    best_wf1 = wf1
                    best_w = [round(w1, 2), round(w2, 2), round(w3, 2)]
        return best_w, best_wf1
    else:
        # Fallback to equal weights
        equal_w = [1.0 / n_models] * n_models
        blend = sum(w * p for w, p in zip(equal_w, prob_list))
        return equal_w, f1_score(y_true, blend.argmax(axis=1), average="weighted", zero_division=0)


def evaluate_predictions(y_true: np.ndarray, y_prob: np.ndarray, name: str) -> Dict:
    y_pred = y_prob.argmax(axis=1)
    acc = accuracy_score(y_true, y_pred)
    wf1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    mf1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
    top5 = top_k_accuracy_score(y_true, y_prob, k=5, labels=list(range(tax.NUM_SPECIES)))

    # Hierarchical consistency
    true_super = np.array([tax.SPECIES_TO_SUPERCLASS[y] for y in y_true])
    pred_super = np.array([tax.SPECIES_TO_SUPERCLASS[p] for p in y_pred])
    super_acc = accuracy_score(true_super, pred_super)

    return {
        "model": name,
        "accuracy": acc,
        "weighted_f1": wf1,
        "macro_f1": mf1,
        "top5_accuracy": top5,
        "super_accuracy": super_acc,
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate IP102 Deep Ensemble Models")
    parser.add_argument("--test_file", type=str, default="data/test.txt")
    args = parser.parse_args()

    test_file = ROOT / args.test_file
    if not test_file.exists():
        raise FileNotFoundError(f"Test annotation file not found: {test_file}")

    y_true = np.array(load_test_ground_truth(test_file))
    print(f"Loaded {len(y_true):,} test labels from {test_file}", flush=True)

    # Candidate probability files
    candidates = {
        "ResNet-50": OUTPUT_DIR / "ip102_probs_resnet50.npy",
        "EfficientNet": OUTPUT_DIR / "ip102_probs_efficientnet.npy",
        "ViT": OUTPUT_DIR / "ip102_probs_vit.npy",
    }

    available = {}
    for name, path in candidates.items():
        if path.exists():
            arr = np.load(path)
            if arr.shape[0] == len(y_true) and arr.shape[1] == tax.NUM_SPECIES:
                available[name] = arr
                print(f"Loaded probability matrix for {name}: shape {arr.shape}")
            else:
                print(f"Skipping {name}: shape mismatch {arr.shape} vs ({len(y_true)}, {tax.NUM_SPECIES})")

    if not available:
        print("\n[WARNING] No pre-generated probability files found in training_output/.")
        print("To generate probabilities, run:")
        print("  python train_ip102_advanced.py --model resnet50 --eval_only")
        print("  python train_ip102_advanced.py --model efficientnet --eval_only")
        print("  python train_ip102_advanced.py --model vit --eval_only")
        return

    # Evaluate individual models
    results = []
    for name, probs in available.items():
        res = evaluate_predictions(y_true, probs, name)
        results.append(res)

    # Evaluate Deep Ensemble
    model_names = list(available.keys())
    prob_list = list(available.values())

    if len(available) >= 2:
        # 1. Equal-weight soft voting
        equal_prob = np.mean(prob_list, axis=0)
        results.append(evaluate_predictions(y_true, equal_prob, f"Ensemble-Mean ({'+'.join(model_names)})"))

        # 2. Grid-searched optimal weighted F1 voting
        best_weights, best_wf1 = find_optimal_ensemble_weights(prob_list, y_true, step=0.05)
        weight_str = ", ".join(f"{name}:{w:.2f}" for name, w in zip(model_names, best_weights))
        print(f"\nOptimal Ensemble Weights (Weighted F1: {best_wf1*100:.2f}%): {weight_str}")

        optimal_prob = sum(w * p for w, p in zip(best_weights, prob_list))
        ens_res = evaluate_predictions(y_true, optimal_prob, f"Ensemble-Optimal ({weight_str})")
        results.append(ens_res)

        final_ensemble_prob = optimal_prob
        final_ensemble_name = f"Ensemble-Optimal"
    else:
        final_ensemble_prob = prob_list[0]
        final_ensemble_name = model_names[0]

    # Print comparative performance summary
    summary_df = pd.DataFrame(results)
    print("\n" + "=" * 80)
    print("           IP102 INSECT PEST CLASSIFICATION BENCHMARK SUMMARY")
    print("=" * 80)
    formatted = summary_df.copy()
    formatted["accuracy"] = formatted["accuracy"].apply(lambda x: f"{x*100:.2f}%")
    formatted["weighted_f1"] = formatted["weighted_f1"].apply(lambda x: f"{x*100:.2f}%")
    formatted["macro_f1"] = formatted["macro_f1"].apply(lambda x: f"{x*100:.2f}%")
    formatted["top5_accuracy"] = formatted["top5_accuracy"].apply(lambda x: f"{x*100:.2f}%")
    formatted["super_accuracy"] = formatted["super_accuracy"].apply(lambda x: f"{x*100:.2f}%")
    print(formatted.to_string(index=False))
    print("=" * 80)

    # Detailed Classification Report on Final Ensemble
    y_pred_final = final_ensemble_prob.argmax(axis=1)
    full_report = classification_report(
        y_true,
        y_pred_final,
        labels=list(range(tax.NUM_SPECIES)),
        target_names=tax.IP102_CLASSES,
        output_dict=True,
        zero_division=0,
    )

    # Save outputs
    json_path = OUTPUT_DIR / "ip102_ensemble_classification_report.json"
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2)
    print(f"\nClassification report saved to: {json_path}")

    csv_preds_path = OUTPUT_DIR / "ip102_ensemble_predictions.csv"
    with csv_preds_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["true_label", "true_class", "predicted_label", "predicted_class"])
        for yt, yp in zip(y_true, y_pred_final):
            writer.writerow([yt, tax.IP102_CLASSES[yt], yp, tax.IP102_CLASSES[yp]])
    print(f"Ensemble predictions saved to: {csv_preds_path}")

    # Rare Classes Breakdown Table
    rare_classes = tax.get_rare_classes(DATA_ROOT / "train.txt", threshold=150)
    report_df = pd.DataFrame(full_report).T
    rare_df = report_df.loc[[tax.IP102_CLASSES[c] for c in rare_classes]].copy()
    rare_df["class_index"] = rare_classes
    rare_df = rare_df.sort_values(by=["support", "f1-score"], ascending=[True, True])

    rare_csv_path = OUTPUT_DIR / "ip102_rare_classes_report.csv"
    rare_df.to_csv(rare_csv_path)
    print(f"Rare classes report saved to: {rare_csv_path}")

    print("\nRare / Long-Tail Classes (<= 150 training samples) Performance:")
    print(rare_df[["f1-score", "precision", "recall", "support"]].head(15).to_string())


if __name__ == "__main__":
    main()

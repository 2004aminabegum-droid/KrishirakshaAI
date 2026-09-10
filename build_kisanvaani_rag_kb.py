"""
KrishiRakshak AI — KisanVaani / KrishiBani Agricultural Q&A Knowledge Base & LLM Dataset Indexer
================================================================================================
Ingests the official 'KisanVaani/agriculture-qa-english-only' dataset (22,615 examples)
from Hugging Face, cleans unicode artifacts, categorizes into agronomic domains,
extracts high-density keywords, and generates:
  1. public/kisanvaani_rag_kb.json               (Full 22k RAG Knowledge Base)
  2. training_output/krishibani_llm_finetune_22k.jsonl (Full 22k ChatML SFT Dataset for LLMs)
"""

import json
import re
import time
from pathlib import Path
from datasets import load_dataset


def clean_text(text: str) -> str:
    """Cleans unicode artifacts, replacement characters, and redundant whitespace."""
    if not text:
        return ""
    text = text.replace('\ufffd', ' ').replace('\u2019', "'").replace('\u2018', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def categorize_qa(question: str, answer: str) -> str:
    """Categorizes the Q&A into one of 10 agronomic knowledge domains."""
    text = (question + " " + answer).lower()
    if any(k in text for k in ["pest", "insect", "aphid", "worm", "caterpillar", "borer", "hopper", "whitefly", "mite", "bug", "larva", "armyworm", "beetle"]):
        return "Pest Management"
    elif any(k in text for k in ["disease", "blight", "rust", "fungus", "spot", "mildew", "rot", "wilt", "canker", "virus", "pathogen"]):
        return "Plant Disease"
    elif any(k in text for k in ["fertilizer", "nutrient", "nitrogen", "phosphorus", "potash", "npk", "urea", "manure", "compost", "zinc", "soil fertility"]):
        return "Soil & Fertilizers"
    elif any(k in text for k in ["irrigation", "water", "drip", "sprinkler", "moisture", "rain", "drought", "drainage"]):
        return "Irrigation & Water"
    elif any(k in text for k in ["seed", "sowing", "planting", "germination", "variety", "hybrid", "spacing", "nursery", "seedling", "drill"]):
        return "Cultivation & Sowing"
    elif any(k in text for k in ["harvest", "storage", "yield", "post-harvest", "drying", "milling", "silage"]):
        return "Harvest & Storage"
    elif any(k in text for k in ["organic", "neem", "bio-pesticide", "panchagavya", "vermicompost", "natural farming"]):
        return "Organic Farming"
    elif any(k in text for k in ["scheme", "subsidy", "insurance", "pm-kisan", "kisan credit", "mandi", "msp", "market", "farm state"]):
        return "Government Schemes & Market"
    elif any(k in text for k in ["weather", "temperature", "climate", "frost", "heat", "monsoon", "season"]):
        return "Weather & Climate"
    else:
        return "General Agronomy"


def extract_keywords(text: str) -> list:
    """Extracts top salient keywords for token-set search matching."""
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    stop_words = {
        "the", "and", "for", "that", "this", "with", "from", "are", "can", "what",
        "how", "why", "when", "which", "where", "should", "will", "does", "about",
        "crop", "crops", "plant", "plants", "farming", "farm", "farmer", "farmers"
    }
    filtered = [w for w in words if w not in stop_words]
    return list(dict.fromkeys(filtered))[:10]


def main():
    project_root = Path(__file__).parent
    public_dir = project_root / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    out_file = public_dir / "kisanvaani_rag_kb.json"

    training_dir = project_root / "training_output"
    training_dir.mkdir(parents=True, exist_ok=True)
    sft_out_file = training_dir / "krishibani_llm_finetune_22k.jsonl"

    print("=" * 75)
    print("  KrishiRakshak AI — KisanVaani / KrishiBani 22k RAG & LLM Indexer")
    print("=" * 75)
    print("[1/4] Loading official 'KisanVaani/agriculture-qa-english-only' from Hugging Face...")
    
    t0 = time.time()
    try:
        ds = load_dataset("KisanVaani/agriculture-qa-english-only", split="train")
        print(f"[OK]  Loaded {len(ds):,} raw samples in {time.time() - t0:.1f}s")
    except Exception as e:
        print(f"[ERROR] Could not load dataset from HF: {e}")
        return

    print("\n[2/4] Processing, categorizing, and indexing ALL 22k Q&A pairs...")
    kb_records = []
    cat_counts = {}

    system_prompt = (
        "You are KrishiRakshak AI (Kisan Mitra), an expert agricultural and crop protection advisor "
        "assisting Indian farmers with agronomy, pest management, plant diseases, soil fertility, and irrigation."
    )

    with open(sft_out_file, "w", encoding="utf-8") as sft_f:
        for i, item in enumerate(ds):
            q = clean_text(item.get("question", ""))
            a = clean_text(item.get("answers", ""))

            if not q or not a:
                continue

            category = categorize_qa(q, a)
            cat_counts[category] = cat_counts.get(category, 0) + 1
            keywords = extract_keywords(q + " " + a)

            record_id = f"KV_{i + 1:05d}"
            record = {
                "id": record_id,
                "question": q,
                "answer": a,
                "category": category,
                "keywords": keywords,
                "source": "KisanVaani Agriculture Dataset (Hugging Face)"
            }
            kb_records.append(record)

            # Export ChatML instruction tuning format for LLM training
            sft_entry = {
                "id": record_id,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": q},
                    {"role": "assistant", "content": a}
                ],
                "category": category
            }
            sft_f.write(json.dumps(sft_entry, ensure_ascii=False) + "\n")

    print(f"[OK]  Successfully indexed {len(kb_records):,} agricultural Q&A pairs!")
    print(f"[OK]  Saved LLM SFT ChatML dataset ({len(kb_records):,} rows) to {sft_out_file.name}")

    print("\n  Category Breakdown across 22k dataset:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        percentage = (count / len(kb_records)) * 100
        print(f"    • {cat:<30}: {count:>5,} Q&As ({percentage:4.1f}%)")

    # Output metadata container
    output_data = {
        "metadata": {
            "dataset_name": "KisanVaani/agriculture-qa-english-only",
            "source_url": "https://huggingface.co/datasets/KisanVaani/agriculture-qa-english-only",
            "total_indexed_qa": len(kb_records),
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "categories": list(cat_counts.keys()),
            "version": "2.0_kisanvaani_22k_full_rag_index"
        },
        "knowledge_base": kb_records
    }

    print(f"\n[3/4] Writing compact RAG knowledge base to {out_file}...")
    with open(out_file, "w", encoding="utf-8") as f:
        # Use compact JSON representation for sub-50ms network delivery and memory efficiency
        json.dump(output_data, f, ensure_ascii=False, separators=(',', ':'))

    file_size_mb = out_file.stat().st_size / (1024 * 1024)
    sft_size_mb = sft_out_file.stat().st_size / (1024 * 1024)
    print(f"[OK]  Saved RAG Index ({file_size_mb:.2f} MB) to {out_file}")
    print(f"[OK]  Saved SFT Fine-tuning Dataset ({sft_size_mb:.2f} MB) to {sft_out_file}")

    print("\n[4/4] Validation & Integrity Check...")
    with open(out_file, "r", encoding="utf-8") as f:
        verified = json.load(f)
    print(f"[OK]  Integrity Verified: {verified['metadata']['total_indexed_qa']:,} records loaded successfully.")
    print("=" * 75)
    print("  KisanVaani 22k RAG Knowledge Base & LLM Fine-Tuning Pipeline Ready!")
    print("=" * 75)


if __name__ == "__main__":
    main()

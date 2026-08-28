"""
KrishiRakshak AI — KisanVaani Agriculture Q&A Knowledge Base Indexer
===================================================================
Ingests the official 'KisanVaani/agriculture-qa-english-only' dataset (22,615 examples)
from Hugging Face, cleans, deduplicates, categorizes, and indexes high-density
agronomic Q&A pairs for the RAG LLM Chatbot.

Outputs:
    public/kisanvaani_rag_kb.json
"""

import json
import re
import time
from pathlib import Path
from datasets import load_dataset

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def categorize_qa(question: str, answer: str) -> str:
    text = (question + " " + answer).lower()
    if any(k in text for k in ["pest", "insect", "aphid", "worm", "caterpillar", "borer", "hopper", "whitefly", "mite", "bug", "larva"]):
        return "Pest Management"
    elif any(k in text for k in ["disease", "blight", "rust", "fungus", "spot", "mildew", "rot", "wilt", "canker", "virus"]):
        return "Plant Disease"
    elif any(k in text for k in ["fertilizer", "nutrient", "nitrogen", "phosphorus", "potash", "npk", "urea", "manure", "compost", "zinc"]):
        return "Soil & Fertilizers"
    elif any(k in text for k in ["irrigation", "water", "drip", "sprinkler", "moisture", "rain", "drought"]):
        return "Irrigation & Water"
    elif any(k in text for k in ["seed", "sowing", "planting", "germination", "variety", "hybrid", "spacing", "nursery"]):
        return "Cultivation & Sowing"
    elif any(k in text for k in ["harvest", "storage", "yield", "post-harvest", "drying", "milling"]):
        return "Harvest & Storage"
    elif any(k in text for k in ["organic", "neem", "bio-pesticide", "panchagavya", "vermicompost", "natural farming"]):
        return "Organic Farming"
    elif any(k in text for k in ["scheme", "subsidy", "insurance", "pm-kisan", "kisan credit", "mandi", "msp"]):
        return "Government Schemes & Market"
    elif any(k in text for k in ["weather", "temperature", "climate", "frost", "heat", "monsoon"]):
        return "Weather & Climate"
    else:
        return "General Agronomy"

def extract_keywords(text: str) -> list:
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    stop_words = {
        "the", "and", "for", "that", "this", "with", "from", "are", "can", "what",
        "how", "why", "when", "which", "where", "should", "will", "does", "about",
        "crop", "crops", "plant", "plants", "farming", "farm", "farmer", "farmers"
    }
    filtered = [w for w in words if w not in stop_words]
    return list(dict.fromkeys(filtered))[:12]

def main():
    project_root = Path(__file__).parent
    public_dir = project_root / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    out_file = public_dir / "kisanvaani_rag_kb.json"

    print("=" * 70)
    print("  KrishiRakshak AI — KisanVaani Agricultural RAG Indexer")
    print("=" * 70)
    print("[1/3] Downloading & loading 'KisanVaani/agriculture-qa-english-only' from Hugging Face...")
    
    t0 = time.time()
    try:
        ds = load_dataset("KisanVaani/agriculture-qa-english-only", split="train")
        print(f"[OK]  Loaded {len(ds):,} raw samples in {time.time() - t0:.1f}s")
    except Exception as e:
        print(f"[ERROR] Could not load dataset from HF: {e}")
        return

    print("\n[2/3] Processing, categorizing, and indexing canonical Q&A pairs...")
    seen_questions = set()
    kb_records = []

    # Filter high-quality representative Q&A pairs across agricultural domains
    for i, item in enumerate(ds):
        q = clean_text(item.get("question", ""))
        a = clean_text(item.get("answers", ""))

        if len(q) < 8 or len(a) < 15:
            continue

        q_norm = q.lower().strip("?. ")
        if q_norm in seen_questions:
            continue
        seen_questions.add(q_norm)

        category = categorize_qa(q, a)
        keywords = extract_keywords(q + " " + a)

        record = {
            "id": f"KV_{len(kb_records) + 1:05d}",
            "question": q,
            "answer": a,
            "category": category,
            "keywords": keywords,
            "source": "KisanVaani Agriculture Dataset (Hugging Face)"
        }
        kb_records.append(record)

    print(f"[OK]  Built index with {len(kb_records):,} unique curated agricultural Q&A items.")

    # Category breakdown
    cat_counts = {}
    for r in kb_records:
        cat_counts[r["category"]] = cat_counts.get(r["category"], 0) + 1

    print("\n  Category Breakdown:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"    • {cat:<30}: {count:>5,} Q&As")

    # Output metadata container
    output_data = {
        "metadata": {
            "dataset_name": "KisanVaani/agriculture-qa-english-only",
            "source_url": "https://huggingface.co/datasets/KisanVaani/agriculture-qa-english-only",
            "total_indexed_qa": len(kb_records),
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "categories": list(cat_counts.keys()),
            "version": "1.0_kisanvaani_rag_index"
        },
        "knowledge_base": kb_records
    }

    print(f"\n[3/3] Saving RAG knowledge base to {out_file}...")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    file_size_mb = out_file.stat().st_size / (1024 * 1024)
    print(f"[OK]  Saved {file_size_mb:.2f} MB index to {out_file}")
    print("=" * 70)
    print("  KisanVaani RAG Knowledge Base Ready!")
    print("=" * 70)

if __name__ == "__main__":
    main()

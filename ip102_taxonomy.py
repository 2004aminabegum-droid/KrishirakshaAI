"""IP102 Taxonomy, Hierarchy, and Class-Imbalance Utilities.

Provides:
- 102 species class names.
- 8 agricultural super-classes (Rice, Corn, Wheat, Beet, Alfalfa, Grape, Citrus, Mango).
- Mapping between species (0-101) and super-classes (0-7).
- Biological entomological order mapping.
- Class-balanced effective-number sample weighting (Cui et al., CVPR 2019).
- Rare-class identification for few-shot/meta-learning prototype regularization.
"""

from collections import Counter
from pathlib import Path
from typing import Dict, List, Set, Tuple

import numpy as np
import torch

# ── 102 IP102 Fine-Grained Species Classes ──────────────────────────────────
IP102_CLASSES = [
    "rice leaf roller",                   # 0
    "rice leaf caterpillar",              # 1
    "paddy stem maggot",                  # 2
    "asiatic rice borer",                 # 3
    "yellow rice borer",                  # 4
    "rice gall midge",                    # 5
    "Rice Stemfly",                       # 6
    "brown plant hopper",                 # 7
    "white backed plant hopper",          # 8
    "small brown plant hopper",           # 9
    "rice water weevil",                  # 10
    "rice leafhopper",                    # 11
    "grain spreader thrips",              # 12
    "rice shell pest",                    # 13
    "grub",                               # 14
    "mole cricket",                       # 15
    "wireworm",                           # 16
    "white margined moth",                # 17
    "black cutworm",                      # 18
    "large cutworm",                      # 19
    "yellow cutworm",                     # 20
    "red spider",                         # 21
    "corn borer",                         # 22
    "army worm",                          # 23
    "aphids",                             # 24
    "Potosiabre vitarsis",                # 25
    "peach borer",                        # 26
    "english grain aphid",                # 27
    "green bug",                          # 28
    "bird cherry-oataphid",               # 29
    "wheat blossom midge",                # 30
    "penthaleus major",                   # 31
    "longlegged spider mite",             # 32
    "wheat phloeothrips",                 # 33
    "wheat sawfly",                       # 34
    "cerodonta denticornis",              # 35
    "beet fly",                           # 36
    "flea beetle",                        # 37
    "cabbage army worm",                  # 38
    "beet army worm",                     # 39
    "Beet spot flies",                    # 40
    "meadow moth",                        # 41
    "beet weevil",                        # 42
    "sericaorient alismots chulsky",       # 43
    "alfalfa weevil",                     # 44
    "flax budworm",                       # 45
    "alfalfa plant bug",                  # 46
    "tarnished plant bug",                # 47
    "Locustoidea",                        # 48
    "lytta polita",                       # 49
    "legume blister beetle",              # 50
    "blister beetle",                     # 51
    "therioaphis maculata Buckton",       # 52
    "odontothrips loti",                  # 53
    "Thrips",                             # 54
    "alfalfa seed chalcid",               # 55
    "Pieris canidia",                     # 56
    "Apolygus lucorum",                   # 57
    "Limacodidae",                        # 58
    "Viteus vitifoliae",                  # 59
    "Colomerus vitis",                    # 60
    "Brevipoalpus lewisi McGregor",        # 61
    "oides decempunctata",                 # 62
    "Polyphagotars onemus latus",         # 63
    "Pseudococcus comstocki Kuwana",       # 64
    "parathrene regalis",                 # 65
    "Ampelophaga",                        # 66
    "Lycorma delicatula",                 # 67
    "Xylotrechus",                        # 68
    "Cicadella viridis",                  # 69
    "Miridae",                            # 70
    "Trialeurodes vaporariorum",          # 71
    "Erythroneura apicalis",              # 72
    "Papilio xuthus",                     # 73
    "Panonchus citri McGregor",           # 74
    "Phyllocoptes oleiverus ashmead",     # 75
    "Icerya purchasi Maskell",            # 76
    "Unaspis yanonensis",                 # 77
    "Ceroplastes rubens",                 # 78
    "Chrysomphalus aonidum",              # 79
    "Parlatoria zizyphus Lucus",          # 80
    "Nipaecoccus vastalor",               # 81
    "Aleurocanthus spiniferus",           # 82
    "Tetradacus c Bactrocera minax",      # 83
    "Dacus dorsalis(Hendel)",             # 84
    "Bactrocera tsuneonis",               # 85
    "Prodenia litura",                    # 86
    "Adristyrannus",                      # 87
    "Phyllocnistis citrella Stainton",    # 88
    "Toxoptera citricidus",               # 89
    "Toxoptera aurantii",                 # 90
    "Aphis citricola Vander Goot",        # 91
    "Scirtothrips dorsalis Hood",         # 92
    "Dasineura sp",                       # 93
    "Lawana imitata Melichar",            # 94
    "Salurnis marginella Guerr",          # 95
    "Deporaus marginatus Pascoe",         # 96
    "Chlumetia transversa",               # 97
    "Mango flat beak leafhopper",         # 98
    "Rhytidodera bowrinii white",         # 99
    "Sternochetus frigidus",              # 100
    "Cicadellidae",                       # 101
]

NUM_SPECIES = len(IP102_CLASSES)  # 102

# ── 8 IP102 Agricultural Super-Classes (CVPR 2019 Benchmark) ────────────────
SUPERCLASS_NAMES = [
    "Rice Pests",       # 0 (Classes 0-13)
    "Corn Pests",       # 1 (Classes 14-23)
    "Wheat Pests",      # 2 (Classes 24-34)
    "Beet Pests",       # 3 (Classes 35-43)
    "Alfalfa Pests",    # 4 (Classes 44-55)
    "Vitis/Grape Pests",# 5 (Classes 56-72)
    "Citrus Pests",     # 6 (Classes 73-94)
    "Mango Pests",      # 7 (Classes 95-101)
]

NUM_SUPERCLASSES = len(SUPERCLASS_NAMES)  # 8

# Superclass boundaries: (start_idx, end_idx inclusive)
_SUPERCLASS_RANGES = [
    (0, 13),    # Rice: 14
    (14, 23),   # Corn: 10
    (24, 34),   # Wheat: 11
    (35, 43),   # Beet: 9
    (44, 55),   # Alfalfa: 12
    (56, 72),   # Grape: 17
    (73, 94),   # Citrus: 22
    (95, 101),  # Mango: 7
]

# Map every species index (0..101) to superclass index (0..7)
SPECIES_TO_SUPERCLASS: Dict[int, int] = {}
for super_idx, (start_idx, end_idx) in enumerate(_SUPERCLASS_RANGES):
    for sp_idx in range(start_idx, end_idx + 1):
        SPECIES_TO_SUPERCLASS[sp_idx] = super_idx

# Fast tensor lookup: shape (102,)
SPECIES_TO_SUPERCLASS_TENSOR = torch.tensor(
    [SPECIES_TO_SUPERCLASS[i] for i in range(NUM_SPECIES)],
    dtype=torch.long,
)

# ── Entomological Orders Mapping ─────────────────────────────────────────────
ENTOMOLOGICAL_ORDERS = [
    "Lepidoptera",      # Moths, butterflies, caterpillars, borers, armyworms
    "Coleoptera",       # Beetles, weevils, grubs, wireworms
    "Hemiptera",        # Planthoppers, leafhoppers, aphids, bugs, whiteflies, scales
    "Diptera",          # Flies, midges, maggots
    "Thysanoptera",     # Thrips
    "Orthoptera",       # Locusts, mole crickets
    "Hymenoptera",      # Sawflies, chalcids
    "Acari",            # Spider mites, rust mites
]

# Map each species to an entomological order index
SPECIES_TO_ORDER_NAME: Dict[int, str] = {
    # Rice
    0: "Lepidoptera", 1: "Lepidoptera", 2: "Diptera", 3: "Lepidoptera", 4: "Lepidoptera",
    5: "Diptera", 6: "Diptera", 7: "Hemiptera", 8: "Hemiptera", 9: "Hemiptera",
    10: "Coleoptera", 11: "Hemiptera", 12: "Thysanoptera", 13: "Coleoptera",
    # Corn
    14: "Coleoptera", 15: "Orthoptera", 16: "Coleoptera", 17: "Lepidoptera", 18: "Lepidoptera",
    19: "Lepidoptera", 20: "Lepidoptera", 21: "Acari", 22: "Lepidoptera", 23: "Lepidoptera",
    # Wheat
    24: "Hemiptera", 25: "Coleoptera", 26: "Lepidoptera", 27: "Hemiptera", 28: "Hemiptera",
    29: "Hemiptera", 30: "Diptera", 31: "Acari", 32: "Acari", 33: "Thysanoptera", 34: "Hymenoptera",
    # Beet
    35: "Diptera", 36: "Diptera", 37: "Coleoptera", 38: "Lepidoptera", 39: "Lepidoptera",
    40: "Diptera", 41: "Lepidoptera", 42: "Coleoptera", 43: "Coleoptera",
    # Alfalfa
    44: "Coleoptera", 45: "Lepidoptera", 46: "Hemiptera", 47: "Hemiptera", 48: "Orthoptera",
    49: "Coleoptera", 50: "Coleoptera", 51: "Coleoptera", 52: "Hemiptera", 53: "Thysanoptera",
    54: "Thysanoptera", 55: "Hymenoptera",
    # Grape / Vitis
    56: "Lepidoptera", 57: "Hemiptera", 58: "Lepidoptera", 59: "Hemiptera", 60: "Acari",
    61: "Acari", 62: "Coleoptera", 63: "Acari", 64: "Hemiptera", 65: "Lepidoptera",
    66: "Lepidoptera", 67: "Hemiptera", 68: "Coleoptera", 69: "Hemiptera", 70: "Hemiptera",
    71: "Hemiptera", 72: "Hemiptera",
    # Citrus
    73: "Lepidoptera", 74: "Acari", 75: "Acari", 76: "Hemiptera", 77: "Hemiptera",
    78: "Hemiptera", 79: "Hemiptera", 80: "Hemiptera", 81: "Hemiptera", 82: "Hemiptera",
    83: "Diptera", 84: "Diptera", 85: "Diptera", 86: "Lepidoptera", 87: "Hemiptera",
    88: "Lepidoptera", 89: "Hemiptera", 90: "Hemiptera", 91: "Hemiptera", 92: "Thysanoptera",
    93: "Diptera", 94: "Hemiptera",
    # Mango
    95: "Hemiptera", 96: "Coleoptera", 97: "Lepidoptera", 98: "Hemiptera", 99: "Coleoptera",
    100: "Coleoptera", 101: "Hemiptera",
}


def read_annotation_counts(annotation_file: Path) -> Counter:
    """Reads train.txt, val.txt, or test.txt and counts labels."""
    counts = Counter()
    with annotation_file.open("r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line:
                continue
            _, label_str = line.rsplit(maxsplit=1)
            counts[int(label_str)] += 1
    return counts


def compute_effective_number_weights(
    annotation_file: Path,
    num_classes: int = NUM_SPECIES,
    beta: float = 0.9999,
) -> torch.Tensor:
    """
    Computes Cui et al. (CVPR 2019) Class-Balanced Loss weights:
    W_c = (1 - beta) / (1 - beta^{n_c})
    Normalized so sum(W_c) = num_classes.
    """
    counts = read_annotation_counts(annotation_file)
    effective_num = []
    for c in range(num_classes):
        n_c = max(counts.get(c, 1), 1)
        # Avoid division by zero
        eff = (1.0 - beta) / (1.0 - (beta ** n_c) + 1e-8)
        effective_num.append(eff)

    weights = np.array(effective_num, dtype=np.float32)
    # Normalize so mean weight is 1.0
    weights = weights / weights.mean()
    return torch.from_numpy(weights).float()


def get_rare_classes(annotation_file: Path, threshold: int = 150) -> List[int]:
    """Returns sorted list of class indices having <= threshold training samples."""
    counts = read_annotation_counts(annotation_file)
    rare = [c for c, cnt in counts.items() if cnt <= threshold]
    rare.sort()
    return rare

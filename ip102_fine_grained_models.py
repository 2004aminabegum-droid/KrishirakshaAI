"""Fine-Grained Recognition Models & Metric Learning for IP102 Insect Recognition.

Architectures:
- Spatial & Channel Attention Pooling (CBAM / Spatial Attention).
- Compact Bilinear Pooling (Bilinear CNN with signed sqrt + L2 normalization).
- Hierarchical Dual Classification Head (Super-Class 8 + Species 102).
- Class-Balanced Prototypical Metric Learning for rare/long-tail classes.
- Model Backbones:
  1. FineGrainedResNet50
  2. FineGrainedEfficientNet
  3. FineGrainedViT
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models

from ip102_taxonomy import (
    NUM_SPECIES,
    NUM_SUPERCLASSES,
    SPECIES_TO_SUPERCLASS_TENSOR,
)


# ── 1. Fine-Grained Attention Pooling ─────────────────────────────────────────

class SpatialAttentionPool2d(nn.Module):
    """
    Spatial Attention Pooling for 2D convolutional feature maps (C x H x W).
    Learns spatial importance masks so localized insect attributes (antennae,
    wings, leg spurs) receive higher weights than empty leaf background.
    """
    def __init__(self, in_channels: int, hidden_dim: Optional[int] = None):
        super().__init__()
        if hidden_dim is None:
            hidden_dim = max(in_channels // 4, 64)
        self.conv1 = nn.Conv2d(in_channels, hidden_dim, kernel_size=1)
        self.act = nn.GELU()
        self.conv2 = nn.Conv2d(hidden_dim, 1, kernel_size=1)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # x: (B, C, H, W)
        attn_scores = self.conv2(self.act(self.conv1(x)))  # (B, 1, H, W)
        b, _, h, w = attn_scores.shape
        attn_weights = F.softmax(attn_scores.view(b, 1, h * w), dim=-1).view(b, 1, h, w)
        pooled = (x * attn_weights).sum(dim=(2, 3))  # (B, C)
        return pooled, attn_weights


class TokenAttentionPool(nn.Module):
    """
    Multi-Head Attention Pooling for Vision Transformer token sequences (B, N, D).
    Computes learned attention weights over patch tokens + [CLS] token.
    """
    def __init__(self, embed_dim: int, num_heads: int = 4):
        super().__init__()
        self.query = nn.Parameter(torch.randn(1, 1, embed_dim))
        self.mha = nn.MultiheadAttention(embed_dim, num_heads=num_heads, batch_first=True)
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        # tokens: (B, N, D)
        b = tokens.shape[0]
        q = self.query.expand(b, -1, -1)  # (B, 1, D)
        out, _ = self.mha(q, tokens, tokens)
        return self.norm(out.squeeze(1))  # (B, D)


# ── 2. Compact Bilinear Pooling (Bilinear CNN) ───────────────────────────────

class CompactBilinearPooling(nn.Module):
    """
    Compact Bilinear Pooling layer capturing second-order feature correlations
    for fine-grained insect species separation without quadratic parameter explosion.
    Uses dimension reduction followed by element-wise Hadamard product or outer product,
    Signed Square-Root Normalization, and L2 Normalization.
    """
    def __init__(self, in_channels: int, proj_dim: int = 512):
        super().__init__()
        self.proj_dim = proj_dim
        self.proj_a = nn.Sequential(
            nn.Conv2d(in_channels, proj_dim, kernel_size=1, bias=False),
            nn.BatchNorm2d(proj_dim),
            nn.GELU(),
        )
        self.proj_b = nn.Sequential(
            nn.Conv2d(in_channels, proj_dim, kernel_size=1, bias=False),
            nn.BatchNorm2d(proj_dim),
            nn.GELU(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, C, H, W)
        fa = self.proj_a(x)  # (B, proj_dim, H, W)
        fb = self.proj_b(x)  # (B, proj_dim, H, W)

        # Spatial average of element-wise product captures cross-channel interaction
        bilinear = (fa * fb).mean(dim=(2, 3))  # (B, proj_dim)

        # Signed square-root normalization
        sign = torch.sign(bilinear)
        sqrt_norm = sign * torch.sqrt(torch.abs(bilinear) + 1e-8)

        # L2 normalization
        l2_norm = F.normalize(sqrt_norm, p=2, dim=1)
        return l2_norm


# ── 3. Hierarchical Classification Head ──────────────────────────────────────

class HierarchicalClassificationHead(nn.Module):
    """
    Dual-head classifier for hierarchical insect recognition:
    Head 1: Insect Super-Class / Agricultural Order (8 classes).
    Head 2: Fine-Grained Insect Species (102 classes).
    """
    def __init__(
        self,
        in_features: int,
        num_species: int = NUM_SPECIES,
        num_superclasses: int = NUM_SUPERCLASSES,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        # Superclass Head (8 classes)
        self.fc_superclass = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(p=dropout),
            nn.Linear(256, num_superclasses),
        )

        # Species Head (102 classes)
        self.fc_species = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.GELU(),
            nn.Dropout(p=dropout),
            nn.Linear(512, num_species),
        )

    def forward(self, embedding: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        emb = self.dropout(embedding)
        logits_superclass = self.fc_superclass(emb)
        logits_species = self.fc_species(emb)
        return logits_species, logits_superclass

    def predict_hierarchical_probabilities(
        self,
        logits_species: torch.Tensor,
        logits_superclass: torch.Tensor,
        alpha: float = 0.3,
    ) -> torch.Tensor:
        """
        Combines species probabilities with superclass probabilities:
        P_hier(species_i) proportional to P(species_i) * P(superclass_k(i))^alpha
        """
        prob_species = F.softmax(logits_species, dim=-1)
        prob_super = F.softmax(logits_superclass, dim=-1)

        # Map species to superclass probability
        device = logits_species.device
        super_map = SPECIES_TO_SUPERCLASS_TENSOR.to(device)
        mapped_super_prob = prob_super[:, super_map]  # (B, 102)

        hier_prob = prob_species * (mapped_super_prob ** alpha)
        # Re-normalize to sum to 1.0
        hier_prob = hier_prob / hier_prob.sum(dim=-1, keepdim=True)
        return hier_prob


# ── 4. Backbone 1: Fine-Grained ResNet-50 ────────────────────────────────────

class FineGrainedResNet50(nn.Module):
    """
    ResNet-50 with Spatial Attention Pooling + Compact Bilinear Pooling
    and Hierarchical Dual Heads.
    """
    def __init__(
        self,
        weights: Optional[str] = "DEFAULT",
        checkpoint_path: Optional[Path] = None,
        num_species: int = NUM_SPECIES,
        num_superclasses: int = NUM_SUPERCLASSES,
        bilinear_dim: int = 512,
    ):
        super().__init__()
        base = models.resnet50(weights=weights if checkpoint_path is None else None)

        if checkpoint_path is not None and checkpoint_path.exists():
            state = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
            # Load matching backbone layers
            base_dict = base.state_dict()
            filtered = {k: v for k, v in state.items() if k in base_dict and v.shape == base_dict[k].shape}
            base.load_state_dict(filtered, strict=False)

        # Feature extractor up to layer4
        self.conv1 = base.conv1
        self.bn1 = base.bn1
        self.relu = base.relu
        self.maxpool = base.maxpool
        self.layer1 = base.layer1
        self.layer2 = base.layer2
        self.layer3 = base.layer3
        self.layer4 = base.layer4

        # Fine-grained modules
        self.attn_pool = SpatialAttentionPool2d(in_channels=2048)
        self.bilinear = CompactBilinearPooling(in_channels=2048, proj_dim=bilinear_dim)

        # Combined embedding dimension: 2048 (attention pooled) + 512 (bilinear) = 2560
        total_features = 2048 + bilinear_dim
        self.head = HierarchicalClassificationHead(
            in_features=total_features,
            num_species=num_species,
            num_superclasses=num_superclasses,
        )

    def extract_features(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # Backbone forward
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        feat_map = self.layer4(x)  # (B, 2048, 7, 7)

        # Fine-grained pooling
        pooled_attn, attn_mask = self.attn_pool(feat_map)   # (B, 2048)
        bilinear_feat = self.bilinear(feat_map)            # (B, 512)
        embedding = torch.cat([pooled_attn, bilinear_feat], dim=1)  # (B, 2560)
        return embedding, feat_map

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        embedding, _ = self.extract_features(x)
        logits_species, logits_superclass = self.head(embedding)
        return logits_species, logits_superclass, embedding


# ── 5. Backbone 2: Fine-Grained EfficientNet ──────────────────────────────────

class FineGrainedEfficientNet(nn.Module):
    """
    EfficientNet with Spatial Attention Pooling and Hierarchical Dual Heads.
    """
    def __init__(
        self,
        weights: Optional[str] = "DEFAULT",
        num_species: int = NUM_SPECIES,
        num_superclasses: int = NUM_SUPERCLASSES,
    ):
        super().__init__()
        base = models.efficientnet_b0(weights=weights)
        self.features = base.features  # Outputs (B, 1280, 7, 7)
        in_channels = 1280

        self.attn_pool = SpatialAttentionPool2d(in_channels=in_channels)
        self.head = HierarchicalClassificationHead(
            in_features=in_channels,
            num_species=num_species,
            num_superclasses=num_superclasses,
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        feat_map = self.features(x)
        embedding, _ = self.attn_pool(feat_map)
        logits_species, logits_superclass = self.head(embedding)
        return logits_species, logits_superclass, embedding


# ── 6. Backbone 3: Fine-Grained Vision Transformer (ViT) ─────────────────────

class FineGrainedViT(nn.Module):
    """
    Vision Transformer (ViT-B/16) with Multi-Head Token Attention Pooling
    and Hierarchical Dual Heads.
    """
    def __init__(
        self,
        weights: Optional[str] = "DEFAULT",
        num_species: int = NUM_SPECIES,
        num_superclasses: int = NUM_SUPERCLASSES,
    ):
        super().__init__()
        base = models.vit_b_16(weights=weights)

        self.conv_proj = base.conv_proj
        self.class_token = base.class_token
        self.encoder = base.encoder
        embed_dim = base.hidden_dim  # 768

        self.token_pool = TokenAttentionPool(embed_dim=embed_dim, num_heads=4)
        self.head = HierarchicalClassificationHead(
            in_features=embed_dim,
            num_species=num_species,
            num_superclasses=num_superclasses,
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        # ViT forward tokens
        n = x.shape[0]
        x = self.conv_proj(x)
        x = x.reshape(n, self.conv_proj.out_channels, -1).permute(0, 2, 1)

        # Concatenate class token
        batch_class_token = self.class_token.expand(n, -1, -1)
        x = torch.cat([batch_class_token, x], dim=1)

        # Transformer encoder
        x = self.encoder(x)  # (B, 197, 768)

        # Multi-head token attention pooling
        embedding = self.token_pool(x)  # (B, 768)
        logits_species, logits_superclass = self.head(embedding)
        return logits_species, logits_superclass, embedding


# ── 7. Few-Shot Prototypical Metric Loss for Rare Classes ─────────────────────

class PrototypicalMetricLoss(nn.Module):
    """
    Prototypical Metric Learning loss for rare long-tail classes.
    Maintains class prototype centroids c_k in embedding space and regularizes
    rare-class representations via cosine distance and prototypical attraction.
    """
    def __init__(
        self,
        num_classes: int = NUM_SPECIES,
        embed_dim: int = 512,
        temperature: float = 0.1,
        rare_classes: Optional[List[int]] = None,
    ):
        super().__init__()
        self.num_classes = num_classes
        self.temperature = temperature
        self.rare_classes_set = set(rare_classes) if rare_classes is not None else set()

        # Learnable / updated class prototypes
        self.register_buffer("prototypes", torch.zeros(num_classes, embed_dim))
        self.register_buffer("prototype_counts", torch.zeros(num_classes))

    @torch.no_grad()
    def update_prototypes(self, embeddings: torch.Tensor, labels: torch.Tensor, momentum: float = 0.9):
        """Exponential moving average update of class prototypes."""
        norm_emb = F.normalize(embeddings, p=2, dim=-1)
        for c in labels.unique():
            idx = (labels == c)
            if not idx.any():
                continue
            class_mean = norm_emb[idx].mean(dim=0)
            c_int = c.item()
            if self.prototype_counts[c_int] == 0:
                self.prototypes[c_int] = class_mean
            else:
                self.prototypes[c_int] = F.normalize(
                    momentum * self.prototypes[c_int] + (1.0 - momentum) * class_mean,
                    p=2,
                    dim=-1,
                )
            self.prototype_counts[c_int] += idx.sum().item()

    def forward(self, embeddings: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
        """
        Computes metric cross-entropy on rare class prototypes.
        """
        if not self.rare_classes_set:
            return torch.tensor(0.0, device=embeddings.device)

        # Filter for rare class samples in the current batch
        is_rare_mask = torch.tensor(
            [lbl.item() in self.rare_classes_set for lbl in labels],
            device=labels.device,
            dtype=torch.bool,
        )
        if not is_rare_mask.any():
            return torch.tensor(0.0, device=embeddings.device)

        rare_embeddings = F.normalize(embeddings[is_rare_mask], p=2, dim=-1)
        rare_labels = labels[is_rare_mask]

        # Cosine similarity to class prototypes
        proto_norm = F.normalize(self.prototypes, p=2, dim=-1)
        cos_sim = torch.matmul(rare_embeddings, proto_norm.t()) / self.temperature  # (N_rare, 102)

        proto_loss = F.cross_entropy(cos_sim, rare_labels)
        return proto_loss


# ── 8. Class-Balanced Hierarchical Loss ──────────────────────────────────────

class ClassBalancedHierarchicalLoss(nn.Module):
    """
    Combined Loss:
    1. Class-Balanced Cross-Entropy for 102 Species (with effective sample weights & label smoothing).
    2. Cross-Entropy for 8 Super-Classes / Orders.
    3. Prototypical Metric Loss for Rare Classes.
    """
    def __init__(
        self,
        class_weights: Optional[torch.Tensor] = None,
        label_smoothing: float = 0.05,
        super_weight: float = 0.3,
        proto_weight: float = 0.2,
        rare_classes: Optional[List[int]] = None,
        embed_dim: int = 2560,
    ):
        super().__init__()
        self.super_weight = super_weight
        self.proto_weight = proto_weight

        self.species_criterion = nn.CrossEntropyLoss(
            weight=class_weights,
            label_smoothing=label_smoothing,
        )
        self.super_criterion = nn.CrossEntropyLoss(label_smoothing=label_smoothing)
        self.proto_criterion = PrototypicalMetricLoss(
            num_classes=NUM_SPECIES,
            embed_dim=embed_dim,
            rare_classes=rare_classes,
        )

    def forward(
        self,
        logits_species: torch.Tensor,
        logits_super: torch.Tensor,
        embeddings: torch.Tensor,
        labels: torch.Tensor,
    ) -> Tuple[torch.Tensor, Dict[str, float]]:
        # Map species labels to superclass labels
        device = labels.device
        super_labels = SPECIES_TO_SUPERCLASS_TENSOR.to(device)[labels]

        loss_species = self.species_criterion(logits_species, labels)
        loss_super = self.super_criterion(logits_super, super_labels)
        loss_proto = self.proto_criterion(embeddings, labels)

        total_loss = loss_species + (self.super_weight * loss_super) + (self.proto_weight * loss_proto)

        metrics = {
            "loss_total": total_loss.item(),
            "loss_species": loss_species.item(),
            "loss_super": loss_super.item(),
            "loss_proto": loss_proto.item() if isinstance(loss_proto, torch.Tensor) else 0.0,
        }
        return total_loss, metrics

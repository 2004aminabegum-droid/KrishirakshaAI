import os
from PIL import Image

src_path = os.path.join('public', 'icons', 'icon-512x512.png')
res_dir = os.path.join('android', 'app', 'src', 'main', 'res')

if not os.path.exists(src_path):
    print("Source icon not found:", src_path)
    exit(1)

img = Image.open(src_path).convert('RGBA')

densities = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

for folder, size in densities.items():
    target_dir = os.path.join(res_dir, folder)
    os.makedirs(target_dir, exist_ok=True)
    
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    
    for filename in ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']:
        out_path = os.path.join(target_dir, filename)
        resized.save(out_path, 'PNG')
        print(f"Generated {out_path} ({size}x{size})")

print("All Android launcher icons generated successfully!")

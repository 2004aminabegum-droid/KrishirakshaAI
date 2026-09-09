#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFilter

SRC_PATH = r'C:\Users\sunet\.gemini\antigravity-ide\brain\f4667e84-d872-44a2-ad95-c66529962a75\.user_uploaded\media_1788886148017.png'
ROOT_DIR = r'c:\Users\sunet\Documents\SIH2026\KrishirakshaAI'
PUBLIC_DIR = os.path.join(ROOT_DIR, 'public')
RES_DIR = os.path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'res')

def make_dirs():
    os.makedirs(os.path.join(PUBLIC_DIR, 'icons'), exist_ok=True)
    os.makedirs(os.path.join(PUBLIC_DIR, 'images'), exist_ok=True)

def generate_assets():
    make_dirs()
    src_img = Image.open(SRC_PATH).convert('RGBA')

    # 1. Full logo (shield + text)
    full_crop = src_img.crop((94, 19, 440, 320))
    full_crop = full_crop.crop(full_crop.getbbox())
    
    # Add a clean 16px transparent margin around full logo
    full_padded = Image.new('RGBA', (full_crop.width + 32, full_crop.height + 32), (0, 0, 0, 0))
    full_padded.paste(full_crop, (16, 16), full_crop)
    full_padded.save(os.path.join(PUBLIC_DIR, 'logo.png'), 'PNG')
    full_padded.save(os.path.join(PUBLIC_DIR, 'images', 'logo.png'), 'PNG')
    print('Generated public/logo.png', full_padded.size)

    # 2. Shield emblem alone
    shield_crop = src_img.crop((94, 19, 440, 255))
    shield_crop = shield_crop.crop(shield_crop.getbbox())
    shield_padded = Image.new('RGBA', (shield_crop.width + 24, shield_crop.height + 24), (0, 0, 0, 0))
    shield_padded.paste(shield_crop, (12, 12), shield_crop)
    shield_padded.save(os.path.join(PUBLIC_DIR, 'logo-shield.png'), 'PNG')
    print('Generated public/logo-shield.png', shield_padded.size)

    # Helper: render emblem centered in canvas with given size & padding ratio
    def make_centered_icon(img, size, padding_ratio=0.15, bg_color=None, circular=False):
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0) if bg_color is None else bg_color)
        if circular and bg_color is not None:
            mask = Image.new('L', (size, size), 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, size, size), fill=255)
            # Create circular background
            bg = Image.new('RGBA', (size, size), bg_color)
            canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            canvas.paste(bg, (0, 0), mask)
            
        target_w = int(size * (1 - 2 * padding_ratio))
        target_h = int(size * (1 - 2 * padding_ratio))
        
        # Fit image maintaining aspect ratio
        ratio = min(target_w / img.width, target_h / img.height)
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        offset_x = (size - new_w) // 2
        offset_y = (size - new_h) // 2
        canvas.paste(resized, (offset_x, offset_y), resized)
        return canvas

    # 3. PWA Icons (192 and 512)
    # Android/PWA icon: Crisp white rounded background badge so green logo stands out vividly
    for pwa_size in [192, 512]:
        pwa_icon = make_centered_icon(full_crop, pwa_size, padding_ratio=0.10, bg_color=(255, 255, 255, 255))
        pwa_icon.save(os.path.join(PUBLIC_DIR, 'icons', f'icon-{pwa_size}x{pwa_size}.png'), 'PNG')
        print(f'Generated public/icons/icon-{pwa_size}x{pwa_size}.png')

    # 4. Favicon
    fav_icon = make_centered_icon(shield_crop, 48, padding_ratio=0.08, bg_color=(255, 255, 255, 255), circular=True)
    fav_icon.save(os.path.join(PUBLIC_DIR, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    fav_icon.save(os.path.join(ROOT_DIR, 'src', 'app', 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('Generated favicon.ico')

    # 5. Android Launcher Icons
    densities = {
        'mdpi': 48,
        'hdpi': 72,
        'xhdpi': 96,
        'xxhdpi': 144,
        'xxxhdpi': 192
    }

    for name, sz in densities.items():
        folder = os.path.join(RES_DIR, f'mipmap-{name}')
        os.makedirs(folder, exist_ok=True)
        
        # ic_launcher.png (Square with rounded corners / clean white background)
        launcher_sq = make_centered_icon(full_crop, sz, padding_ratio=0.10, bg_color=(255, 255, 255, 255))
        launcher_sq.save(os.path.join(folder, 'ic_launcher.png'), 'PNG')

        # ic_launcher_round.png (Circular)
        launcher_rnd = make_centered_icon(shield_crop, sz, padding_ratio=0.15, bg_color=(255, 255, 255, 255), circular=True)
        launcher_rnd.save(os.path.join(folder, 'ic_launcher_round.png'), 'PNG')

        # ic_launcher_foreground.png (Adaptive icon foreground with safe margins)
        # Foreground canvas is sz (e.g. 72x72 for hdpi), with shield in central 66% zone
        launcher_fg = make_centered_icon(shield_crop, sz, padding_ratio=0.20, bg_color=None)
        launcher_fg.save(os.path.join(folder, 'ic_launcher_foreground.png'), 'PNG')
        
        print(f'Generated Android icons for {name} ({sz}x{sz})')

    # 6. Splash Screens
    # Capacitor splash screen background color in config is #020617.
    # Center the logo emblem nicely inside a circular white badge on #020617 background.
    splash_sizes = {
        'drawable/splash.png': (480, 320),
        'drawable-land-hdpi/splash.png': (800, 480),
        'drawable-land-mdpi/splash.png': (480, 320),
        'drawable-land-xhdpi/splash.png': (1280, 720),
        'drawable-land-xxhdpi/splash.png': (1600, 960),
        'drawable-land-xxxhdpi/splash.png': (1920, 1280),
        'drawable-port-hdpi/splash.png': (480, 800),
        'drawable-port-mdpi/splash.png': (320, 480),
        'drawable-port-xhdpi/splash.png': (720, 1280),
        'drawable-port-xxhdpi/splash.png': (960, 1600),
        'drawable-port-xxxhdpi/splash.png': (1280, 1920),
    }

    for rel_path, (w, h) in splash_sizes.items():
        out_path = os.path.join(RES_DIR, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        
        # Dark canvas #020617 matching theme
        splash_canvas = Image.new('RGBA', (w, h), (2, 6, 23, 255))
        
        # Calculate appropriate badge size (about 30-40% of smallest dimension)
        min_dim = min(w, h)
        badge_size = max(120, int(min_dim * 0.38))
        
        # Create a white rounded badge for the logo
        badge = Image.new('RGBA', (badge_size, badge_size), (0, 0, 0, 0))
        b_draw = ImageDraw.Draw(badge)
        corner_r = int(badge_size * 0.22)
        b_draw.rounded_rectangle((0, 0, badge_size, badge_size), radius=corner_r, fill=(255, 255, 255, 255))
        
        # Fit full logo inside the badge
        inner_pad = 0.12
        logo_w = int(badge_size * (1 - 2 * inner_pad))
        logo_h = int(badge_size * (1 - 2 * inner_pad))
        ratio = min(logo_w / full_crop.width, logo_h / full_crop.height)
        rs_w = int(full_crop.width * ratio)
        rs_h = int(full_crop.height * ratio)
        rs_logo = full_crop.resize((rs_w, rs_h), Image.Resampling.LANCZOS)
        badge.paste(rs_logo, ((badge_size - rs_w) // 2, (badge_size - rs_h) // 2), rs_logo)
        
        # Paste badge in center of splash canvas
        pos_x = (w - badge_size) // 2
        pos_y = (h - badge_size) // 2
        splash_canvas.paste(badge, (pos_x, pos_y), badge)
        
        splash_canvas.save(out_path, 'PNG')
        print(f'Generated splash screen: {rel_path} ({w}x{h})')

    print('\nAll app assets generated successfully!')

if __name__ == '__main__':
    generate_assets()

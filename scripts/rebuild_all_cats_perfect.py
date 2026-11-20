import numpy as np
from PIL import Image
import os

# 1. Downsample the 5x image into pure native 32x32 tiles
orig = Image.open('a857918ae417c7569c42179215fb86e6.jpg').convert('RGB')
arr = np.array(orig)
h, w, _ = arr.shape
arr_phase = arr[1 : 1 + (h-1)//5 * 5, 0 : w//5 * 5]
blocks = arr_phase.reshape((h-1)//5, 5, w//5, 5, 3)
down = np.median(blocks, axis=(1, 3)).astype(np.uint8)

col_xs = [36, 68, 100, 132]
row_ys = [18, 50, 80, 114, 146, 178, 211, 243]

def extract_32_frame(row_idx, col_idx):
    cy = row_ys[row_idx]
    cx = col_xs[col_idx]
    x0 = cx - 16
    y0 = cy - 16
    crop = down[y0:y0+32, x0:x0+32].copy()
    
    rgba = np.zeros((32, 32, 4), dtype=np.uint8)
    dist = np.sqrt(
        (crop[:, :, 0].astype(float) - 247)**2 +
        (crop[:, :, 1].astype(float) - 247)**2 +
        (crop[:, :, 2].astype(float) - 247)**2
    )
    is_cat = dist > 35
    
    # Shadow filter at bottom of cell
    r, g, b = [crop[:, :, i].astype(int) for i in range(3)]
    is_shadow = (np.abs(r - g) <= 12) & (np.abs(g - b) <= 12) & (r >= 95) & (r <= 200)
    y_thresh = 21 if row_idx in (6, 7) else 22
    mask = is_cat & ~(is_shadow & (np.arange(32)[:, None] > y_thresh))
    
    rgba[mask, :3] = crop[mask]
    rgba[mask, 3] = 255
    return Image.fromarray(rgba)

def make_64_strip(frames_32):
    strip_32 = Image.new('RGBA', (32 * len(frames_32), 32), (0, 0, 0, 0))
    for i, f in enumerate(frames_32):
        strip_32.paste(f, (i * 32, 0))
    # Scale exactly 2x using NEAREST filter for crisp pixel art
    return strip_32.resize((64 * len(frames_32), 64), Image.Resampling.NEAREST)

# 2. Extract 5 clean animations for Mochi
mochi_walk = make_64_strip([extract_32_frame(1, c) for c in range(4)])
i2 = extract_32_frame(4, 2)
i3 = extract_32_frame(4, 3)
mochi_idle = make_64_strip([i2, i3, i2, i3])
s0 = extract_32_frame(7, 0)
s1 = extract_32_frame(7, 1)
mochi_sleep = make_64_strip([s0, s1, s0, s1])
mochi_cheer = make_64_strip([extract_32_frame(5, c) for c in range(4)])
mochi_cry = make_64_strip([extract_32_frame(6, c) for c in range(4)])

SPRITES_DIR = "public/assets/sprites"
os.makedirs(SPRITES_DIR, exist_ok=True)

mochi_walk.save(os.path.join(SPRITES_DIR, 'cat_mochi_walk.png'))
mochi_idle.save(os.path.join(SPRITES_DIR, 'cat_mochi_idle.png'))
mochi_sleep.save(os.path.join(SPRITES_DIR, 'cat_mochi_sleep.png'))
mochi_cheer.save(os.path.join(SPRITES_DIR, 'cat_mochi_cheer.png'))
mochi_cry.save(os.path.join(SPRITES_DIR, 'cat_mochi_cry.png'))

print('Saved clean mochi strips!')

def hex_to_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i+2], 16) for i in (0, 2, 4)]

CAT_THEMES = {
    'cat_pochi_cream': {
        'body': '#f6eee2',
        'patch': '#7d5236',
    },
    'cat_frajola': {
        'body': '#ffffff',
        'patch': '#24242e', # black tuxedo patch
        'eyes': '#00e676', # radiant emerald eyes!
    },
    'cat_white': {
        'body': '#ffffff',
        'patch': '#ffffff',
        'eyes': '#2979ff', # sapphire blue eyes!
    },
    'cat_black': {
        'body': '#2c2c36',
        'patch': '#2c2c36',
        'eyes': '#ffd600', # amber gold eyes!
    },
    'cat_grey': {
        'body': '#8a96a4',
        'patch': '#8a96a4',
        'eyes': '#64dd17', # lime eyes!
    },
    'cat_ginger': {
        'body': '#f59838',
        'patch': '#cf6014',
    },
    'cat_calico': {
        'body': '#ffffff',
        'patch': '#d97842', # warm calico orange
    },
    'cat_sakura': {
        'body': '#fdf6f7',
        'patch': '#f28da8',
    },
    'cat_matcha': {
        'body': '#f4faf3',
        'patch': '#68a660',
    },
    'cat_blueberry': {
        'body': '#f5f5fc',
        'patch': '#5866ba',
    },
    'cat_lavender': {
        'body': '#f9f5fc',
        'patch': '#9666ba',
    },
    'cat_sec_cocoa': {
        'body': '#e8d4be',
        'patch': '#5c301c',
    },
    'cat_sec_gold': {
        'body': '#fff4cc',
        'patch': '#f0b41c',
    },
    'cat_sec_sunset': {
        'body': '#ffecd4',
        'patch': '#ff6644',
    },
    'cat_sec_galaxy': {
        'body': '#e4daf4',
        'patch': '#6230a0',
        'eyes': '#00e5ff',
    },
    'cat_sec_cyber': {
        'body': '#d4f6fc',
        'patch': '#ff007f',
        'eyes': '#00f5d4',
    },
}

BASE_ANIMS = {
    'walk': mochi_walk,
    'idle': mochi_idle,
    'sleep': mochi_sleep,
    'cheer': mochi_cheer,
    'cry': mochi_cry
}

def recolor_strip(base_img, theme):
    arr = np.array(base_img).copy()
    h, w, _ = arr.shape
    num_frames = w // 64
    
    r, g, b, a = [arr[:, :, i].astype(int) for i in range(4)]
    is_opaque = (a == 255)
    
    c_body = hex_to_rgb(theme['body'])
    c_patch = hex_to_rgb(theme['patch'])
    custom_eyes = hex_to_rgb(theme['eyes']) if 'eyes' in theme else None
    
    for f in range(num_frames):
        x0, x1 = f * 64, (f + 1) * 64
        sub_arr = arr[:, x0:x1]
        
        f_r = r[:, x0:x1]
        f_g = g[:, x0:x1]
        f_b = b[:, x0:x1]
        f_op = is_opaque[:, x0:x1]
        
        # Dark pixels (eyes/mouth: r < 80, g < 80, b < 80)
        is_dark = f_op & (f_r < 80) & (f_g < 80) & (f_b < 80)
        
        # Fur masks:
        # Patch is orange: r > 180 and g in 100..185 and b < 140
        f_patch = f_op & (f_r > 180) & (f_g >= 100) & (f_g <= 185) & (f_b < 140) & ~is_dark
        # Body is cream: r >= 210 and g >= 200 and b >= 150
        f_body = f_op & (f_r >= 210) & (f_g >= 200) & (f_b >= 150) & ~f_patch & ~is_dark
        
        # Apply body & patch (NO NAIVE MIRRORING!)
        sub_arr[f_body, :3] = c_body
        sub_arr[f_patch, :3] = c_patch
        
        # Custom eye color for cats that need it (black, white, frajola, grey, galaxy, cyber)
        if custom_eyes is not None:
            # In each frame, separate eyes from mouth:
            # Eyes are the higher dark pixels (lower y value) or side pixels
            ys_d, xs_d = np.where(is_dark)
            if len(ys_d) > 0:
                y_max = ys_d.max()
                # Nose/mouth is at the bottom of the face feature cluster
                for y, x in zip(ys_d, xs_d):
                    # If this dark pixel is part of the eyes (not mouth)
                    # Mouth is strictly at the lowest row of features and centered
                    if y >= y_max - 1 and (xs_d.min() + 3 <= x <= xs_d.max() - 3):
                        continue # keep mouth dark
                    sub_arr[y, x, :3] = custom_eyes
                    
    return Image.fromarray(arr)

for cat_id, theme in CAT_THEMES.items():
    print(f'Generating clean strips for {cat_id}...')
    for anim_name, base_img in BASE_ANIMS.items():
        recolored = recolor_strip(base_img, theme)
        out_name = f"{cat_id}_{anim_name}.png"
        recolored.save(os.path.join(SPRITES_DIR, out_name))

print('All 16 cat variants cleanly generated without any corruption!')

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
    # Scale exactly 2x using NEAREST filter for razor-sharp pixel art
    return strip_32.resize((64 * len(frames_32), 64), Image.Resampling.NEAREST)

# 2. Extract 5 animation sets for Mochi
# Walk: row 1, cols 0..3
mochi_walk = make_64_strip([extract_32_frame(1, c) for c in range(4)])

# Idle: row 4, cols 2 & 3 (seated, smooth loop)
i2 = extract_32_frame(4, 2)
i3 = extract_32_frame(4, 3)
mochi_idle = make_64_strip([i2, i3, i2, i3])

# Sleep: row 7, cols 0 & 1 (true loaf frames looped 0, 1, 0, 1)
s0 = extract_32_frame(7, 0)
s1 = extract_32_frame(7, 1)
mochi_sleep = make_64_strip([s0, s1, s0, s1])

# Cheer: row 5, cols 0..3 (licking paw / grooming)
mochi_cheer = make_64_strip([extract_32_frame(5, c) for c in range(4)])

# Cry: row 6, cols 0..3 (stretching lie-down)
mochi_cry = make_64_strip([extract_32_frame(6, c) for c in range(4)])

SPRITES_DIR = "public/assets/sprites"
os.makedirs(SPRITES_DIR, exist_ok=True)

mochi_walk.save(os.path.join(SPRITES_DIR, 'cat_mochi_walk.png'))
mochi_idle.save(os.path.join(SPRITES_DIR, 'cat_mochi_idle.png'))
mochi_sleep.save(os.path.join(SPRITES_DIR, 'cat_mochi_sleep.png'))
mochi_cheer.save(os.path.join(SPRITES_DIR, 'cat_mochi_cheer.png'))
mochi_cry.save(os.path.join(SPRITES_DIR, 'cat_mochi_cry.png'))

print('Saved clean mochi strips!')

# 3. Themes definition
def hex_to_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i+2], 16) for i in (0, 2, 4)]

CAT_THEMES = {
    'cat_pochi_cream': {
        'body': '#f6eee2',
        'patch': '#7d5236',
        'eyes': '#24140a',
        'nose': '#e89c9c',
    },
    'cat_frajola': {
        'body': '#fdfdfd',
        'patch': '#2c2d36',
        'eyes': '#00e676', # emerald green
        'nose': '#ff8fa3', # cute pink nose
        'is_tuxedo': True,
    },
    'cat_white': {
        'body': '#fefefe',
        'patch': '#fefefe',
        'eyes': '#2979ff', # sapphire blue
        'nose': '#ff8fa3',
    },
    'cat_black': {
        'body': '#2c2c36',
        'patch': '#2c2c36',
        'eyes': '#ffd600', # golden amber
        'nose': '#f48c8c',
    },
    'cat_grey': {
        'body': '#8a96a4',
        'patch': '#8a96a4',
        'eyes': '#64dd17', # lime emerald
        'nose': '#e098a0',
    },
    'cat_ginger': {
        'body': '#f59838',
        'patch': '#cf6014',
        'eyes': '#2d1406',
        'nose': '#f48c7c',
    },
    'cat_calico': {
        'body': '#fdfcfc',
        'patch': '#d97842',
        'eyes': '#241812',
        'nose': '#f49a9a',
        'is_calico': True,
    },
    'cat_sakura': {
        'body': '#fdf6f7',
        'patch': '#f28da8',
        'eyes': '#3a1824',
        'nose': '#ff8fa3',
    },
    'cat_matcha': {
        'body': '#f4faf3',
        'patch': '#68a660',
        'eyes': '#183018',
        'nose': '#e89ca4',
    },
    'cat_blueberry': {
        'body': '#f5f5fc',
        'patch': '#5866ba',
        'eyes': '#161c48',
        'nose': '#e498c0',
    },
    'cat_lavender': {
        'body': '#f9f5fc',
        'patch': '#9666ba',
        'eyes': '#2a1640',
        'nose': '#e896c8',
    },
    'cat_sec_cocoa': {
        'body': '#e8d4be',
        'patch': '#5c301c',
        'eyes': '#1a0c06',
        'nose': '#e2948a',
    },
    'cat_sec_gold': {
        'body': '#fff4cc',
        'patch': '#f0b41c',
        'eyes': '#382404',
        'nose': '#f0a860',
    },
    'cat_sec_sunset': {
        'body': '#ffecd4',
        'patch': '#ff6644',
        'eyes': '#2c0a14',
        'nose': '#ff8ca0',
    },
    'cat_sec_galaxy': {
        'body': '#e4daf4',
        'patch': '#6230a0',
        'eyes': '#00e5ff', # cyan stars
        'nose': '#d870ad',
    },
    'cat_sec_cyber': {
        'body': '#d4f6fc',
        'patch': '#ff007f',
        'eyes': '#00f5d4', # neon cyan
        'nose': '#ff54a4',
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
    is_trans = (a == 0)
    
    # Precompute transparency border
    touches_trans = np.zeros((h, w), dtype=bool)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0: continue
            y_src = slice(max(0, -dy), min(h, h - dy))
            x_src = slice(max(0, -dx), min(w, w - dx))
            y_dst = slice(max(0, dy), min(h, h + dy))
            x_dst = slice(max(0, dx), min(w, w + dx))
            touches_trans[y_dst, x_dst] |= is_trans[y_src, x_src]
            
    # Internal dark pixels (eyes & mouth)
    is_dark = is_opaque & (r < 75) & (g < 75) & (b < 75)
    internal_dark = is_dark & ~touches_trans
    
    # Colors
    c_body = hex_to_rgb(theme['body'])
    c_patch = hex_to_rgb(theme['patch'])
    c_eyes = hex_to_rgb(theme['eyes'])
    c_nose = hex_to_rgb(theme.get('nose', '#f48c8c'))
    
    for f in range(num_frames):
        x0, x1 = f * 64, (f + 1) * 64
        sub_arr = arr[:, x0:x1]
        
        f_r = r[:, x0:x1]
        f_g = g[:, x0:x1]
        f_b = b[:, x0:x1]
        f_dark = internal_dark[:, x0:x1]
        f_op = is_opaque[:, x0:x1]
        
        # Eyes vs mouth separation
        # Eyes are on sides (x < 30 or x > 34), mouth is centered (30 <= x <= 34)
        f_eyes = np.zeros((64, 64), dtype=bool)
        f_mouth = np.zeros((64, 64), dtype=bool)
        
        ys_d, xs_d = np.where(f_dark)
        for y, x in zip(ys_d, xs_d):
            # Center of mouth in 64x64 is roughly 31..34
            if 30 <= x <= 34 and y >= 28:
                f_mouth[y, x] = True
            else:
                f_eyes[y, x] = True
                
        # Fur masks
        f_patch = f_op & (f_r > 180) & (f_g >= 115) & (f_g <= 185) & (f_b <= 135) & ~f_dark
        f_body = f_op & (f_r >= 220) & (f_g >= 210) & (f_b >= 160) & ~f_patch & ~f_dark
        
        # Tuxedo or calico mirroring
        if theme.get('is_tuxedo') or theme.get('is_calico'):
            for y in range(16, 40):
                for dx in range(3, 20):
                    xr = 32 + dx
                    xl = 32 - dx
                    if 0 <= xl < 64 and 0 <= xr < 64:
                        if f_patch[y, xr] and f_body[y, xl] and not f_eyes[y, xl] and not f_mouth[y, xl]:
                            f_patch[y, xl] = True
                            f_body[y, xl] = False
                            
        # Apply body
        sub_arr[f_body, :3] = c_body
        
        # Apply patch
        if theme.get('is_calico'):
            for y in range(64):
                for x in range(64):
                    if f_patch[y, x]:
                        if x < 32:
                            sub_arr[y, x, :3] = [40, 38, 44] # black
                        else:
                            sub_arr[y, x, :3] = c_patch # orange
        else:
            sub_arr[f_patch, :3] = c_patch
            
        # Apply eyes
        sub_arr[f_eyes, :3] = c_eyes
        # Apply nose
        sub_arr[f_mouth, :3] = c_nose
        
    return Image.fromarray(arr)

for cat_id, theme in CAT_THEMES.items():
    print(f'Generating clean strips for {cat_id}...')
    for anim_name, base_img in BASE_ANIMS.items():
        recolored = recolor_strip(base_img, theme)
        out_name = f"{cat_id}_{anim_name}.png"
        recolored.save(os.path.join(SPRITES_DIR, out_name))

print('All 16 cat variants cleanly generated!')

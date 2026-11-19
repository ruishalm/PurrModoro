import numpy as np
from PIL import Image
import os

SPRITES_DIR = "public/assets/sprites"
os.makedirs(SPRITES_DIR, exist_ok=True)

BASE_ANIMS = ['idle', 'walk', 'sleep', 'cheer', 'cry']
base_images = {
    anim: np.array(Image.open(f"{SPRITES_DIR}/cat_mochi_{anim}.png"))
    for anim in BASE_ANIMS
}

def hex_to_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i+2], 16) for i in (0, 2, 4)]

# Define themes with clear, bright, expressive eye colors!
CAT_THEMES = {
    'cat_pochi_cream': {
        'body': '#f6eee2',
        'patch': '#7d5236',
        'eyes': '#24140a',
        'nose': '#e89c9c',
    },
    'cat_frajola': {
        'body': '#fdfdfd', # white muzzle, chest, paws
        'patch': '#2c2d36', # tuxedo black fur
        'eyes': '#00e676', # radiant emerald green!
        'nose': '#ff8fa3', # cute pink nose!
        'is_tuxedo': True,
    },
    'cat_white': {
        'body': '#fefefe', # pure snowy white
        'patch': '#fefefe', # solid white
        'eyes': '#2979ff', # vivid crystal blue eyes!
        'nose': '#ff8fa3', # pink nose
    },
    'cat_black': {
        'body': '#2c2c36', # sleek midnight black
        'patch': '#2c2c36', # solid black
        'eyes': '#ffd600', # glowing golden amber eyes!
        'nose': '#f48c8c',
    },
    'cat_grey': {
        'body': '#8a96a4', # misty grey
        'patch': '#8a96a4', # solid grey
        'eyes': '#64dd17', # bright lime/emerald eyes!
        'nose': '#e098a0',
    },
    'cat_ginger': {
        'body': '#f59838', # warm ginger marmalade
        'patch': '#cf6014', # rich ginger stripes/patch
        'eyes': '#2d1406',
        'nose': '#f48c7c',
    },
    'cat_calico': {
        'body': '#fdfcfc', # white
        'patch': '#d97842', # orange
        'eyes': '#241812',
        'nose': '#f49a9a',
        'is_calico': True,
    },
    'cat_sakura': {
        'body': '#fdf6f7', # pale petal cream
        'patch': '#f28da8', # sakura pink
        'eyes': '#3a1824',
        'nose': '#ff8fa3',
    },
    'cat_matcha': {
        'body': '#f4faf3', # pale cream mint
        'patch': '#68a660', # matcha green
        'eyes': '#183018',
        'nose': '#e89ca4',
    },
    'cat_blueberry': {
        'body': '#f5f5fc', # pale starry lavender
        'patch': '#5866ba', # blueberry blue
        'eyes': '#161c48',
        'nose': '#e498c0',
    },
    'cat_lavender': {
        'body': '#f9f5fc', # pale lilac
        'patch': '#9666ba', # lavender
        'eyes': '#2a1640',
        'nose': '#e896c8',
    },
    'cat_sec_cocoa': {
        'body': '#e8d4be', # warm caramel
        'patch': '#5c301c', # dark cocoa
        'eyes': '#1a0c06',
        'nose': '#e2948a',
    },
    'cat_sec_gold': {
        'body': '#fff4cc', # golden cream
        'patch': '#f0b41c', # gold
        'eyes': '#382404',
        'nose': '#f0a860',
    },
    'cat_sec_sunset': {
        'body': '#ffecd4', # sunset peach
        'patch': '#ff6644', # sunset orange
        'eyes': '#2c0a14',
        'nose': '#ff8ca0',
    },
    'cat_sec_galaxy': {
        'body': '#e4daf4', # nebula mist
        'patch': '#6230a0', # cosmic violet
        'eyes': '#00e5ff', # bright cyan star eyes!
        'nose': '#d870ad',
    },
    'cat_sec_cyber': {
        'body': '#d4f6fc', # neon ice
        'patch': '#ff007f', # cyber magenta
        'eyes': '#00f5d4', # neon cyan eyes!
        'nose': '#ff54a4',
    },
}

def recolor_strip(base_arr, theme):
    res = base_arr.copy()
    h, w, _ = res.shape
    num_frames = w // 64
    
    r, g, b, a = [res[:, :, i].astype(int) for i in range(4)]
    is_opaque = a == 255
    
    # In each 64x64 frame, detect eyes and nose precisely:
    for f in range(num_frames):
        x_start = f * 64
        x_end = x_start + 64
        
        # Frame sub-region
        f_r = r[:, x_start:x_end]
        f_g = g[:, x_start:x_end]
        f_b = b[:, x_start:x_end]
        f_a = is_opaque[:, x_start:x_end]
        
        # Dark pixels (R,G,B < 75)
        is_dark = f_a & (f_r < 75) & (f_g < 75) & (f_b < 75)
        
        # In a 64x64 frame:
        # Head area is Y: 22..38, X: 20..50
        # Mouth is centered around x=32..35, y=31..34
        # Eyes are on the left (x: 24..29, y: 27..32) and right (x: 38..43, y: 27..32)
        y_grid = np.arange(64)[:, None]
        x_grid = np.arange(64)[None, :]
        
        # Eyes mask within frame
        f_left_eye = is_dark & (y_grid >= 26) & (y_grid <= 32) & (x_grid >= 23) & (x_grid <= 29)
        f_right_eye = is_dark & (y_grid >= 26) & (y_grid <= 32) & (x_grid >= 37) & (x_grid <= 43)
        f_eyes = f_left_eye | f_right_eye
        
        # Mouth / nose within frame
        f_mouth = is_dark & (y_grid >= 30) & (y_grid <= 35) & (x_grid >= 31) & (x_grid <= 36)
        
        # Patch: orange fur (R > 180, G in 120..185, B <= 135)
        f_patch = f_a & (f_r > 180) & (f_g >= 115) & (f_g <= 185) & (f_b <= 135) & ~f_mouth & ~f_eyes
        
        # Body: cream fur (R >= 220, G >= 210, B >= 160) & ~f_patch & ~f_mouth & ~f_eyes
        f_body = f_a & (f_r >= 220) & (f_g >= 210) & (f_b >= 160) & ~f_patch & ~f_mouth & ~f_eyes

        c_body = hex_to_rgb(theme['body'])
        c_patch = hex_to_rgb(theme['patch'])
        c_eyes = hex_to_rgb(theme['eyes'])
        c_nose = hex_to_rgb(theme.get('nose', '#f48c8c'))
        
        # Tuxedo or Calico head patch:
        if theme.get('is_tuxedo') or theme.get('is_calico'):
            # Mirror patch to left side of head ONLY, keeping forehead blaze and protecting eyes!
            for y in range(20, 36):
                for dx in range(3, 20):
                    xr = 32 + dx
                    xl = 32 - dx
                    if 0 <= xl < 64 and 0 <= xr < 64:
                        if f_patch[y, xr] and f_body[y, xl] and not f_eyes[y, xl] and not f_mouth[y, xl]:
                            f_patch[y, xl] = True
                            f_body[y, xl] = False

        # Apply to global array
        sub_res = res[:, x_start:x_end]
        
        # Apply body
        sub_res[f_body, :3] = c_body
        
        # Apply patch
        if theme.get('is_calico'):
            for y in range(64):
                for x in range(64):
                    if f_patch[y, x]:
                        if x < 32:
                            sub_res[y, x, :3] = [40, 38, 44] # black calico patch
                        else:
                            sub_res[y, x, :3] = c_patch # orange calico patch
        else:
            sub_res[f_patch, :3] = c_patch
            
        # Apply glowing eyes
        sub_res[f_eyes, :3] = c_eyes
        
        # Apply cute nose
        sub_res[f_mouth, :3] = c_nose
        
        # OUTLINE IS KEPT 100% ORIGINAL! No muddy outline or bloated pixels!
        
    return res

for cat_id, theme in CAT_THEMES.items():
    print(f"Generating clean sprites for {cat_id}...")
    for anim in BASE_ANIMS:
        recolored = recolor_strip(base_images[anim], theme)
        im_out = Image.fromarray(recolored)
        out_name = f"{cat_id}_{anim}.png"
        im_out.save(os.path.join(SPRITES_DIR, out_name))

print("All clean cats regenerated successfully!")

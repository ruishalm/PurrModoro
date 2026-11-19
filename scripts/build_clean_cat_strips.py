import numpy as np
from PIL import Image
import os
from collections import deque

orig = Image.open('a857918ae417c7569c42179215fb86e6.jpg')
arr = np.array(orig)
h_img, w_img, _ = arr.shape

bg_r, bg_g, bg_b = 247, 247, 247

col_zones = [
    (115, 250), # Col 0
    (275, 410), # Col 1
    (435, 570), # Col 2
    (595, 735), # Col 3
]

row_zones = [
    (40, 140),   # Row 0: Walk front
    (205, 300),  # Row 1: Walk side
    (350, 460),  # Row 2: Walk back
    (520, 620),  # Row 3: Walk diag
    (680, 780),  # Row 4: Sit / Idle
    (840, 940),  # Row 5: Lick / Cheer
    (1000, 1100),# Row 6: Lie / Stretch / Cry
    (1170, 1265) # Row 7: Sleep
]

def clean_isolated_specks(mask_2d, min_size=25):
    # Pure python connected components
    h, w = mask_2d.shape
    visited = np.zeros((h, w), dtype=bool)
    cleaned = mask_2d.copy()
    
    for y in range(h):
        for x in range(w):
            if cleaned[y, x] and not visited[y, x]:
                # BFS
                comp = []
                q = deque([(y, x)])
                visited[y, x] = True
                while q:
                    cy, cx = q.popleft()
                    comp.append((cy, cx))
                    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and cleaned[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            q.append((ny, nx))
                if len(comp) < min_size:
                    for cy, cx in comp:
                        cleaned[cy, cx] = False
    return cleaned

def extract_isolated_clean_sprite(row_idx, col_idx):
    y0, y1 = row_zones[row_idx]
    x0, x1 = col_zones[col_idx]
    
    cell = arr[y0:y1, x0:x1].copy()
    ch, cw, _ = cell.shape
    
    # Distance to pure background
    dist = np.sqrt(
        (cell[:, :, 0].astype(float) - bg_r)**2 +
        (cell[:, :, 1].astype(float) - bg_g)**2 +
        (cell[:, :, 2].astype(float) - bg_b)**2
    )
    
    r, g, b = [cell[:, :, i].astype(int) for i in range(3)]
    is_shadow = (np.abs(r - g) <= 15) & (np.abs(g - b) <= 15) & (r >= 90) & (r <= 190)
    
    # White / light grey compression noise
    is_light = (cell[:, :, 0] > 225) & (cell[:, :, 1] > 225) & (cell[:, :, 2] > 225) & (dist < 32)
    
    # Floodfill from borders to clear any connected background
    bg_mask = np.zeros((ch, cw), dtype=bool)
    queue = deque()
    
    for y in range(ch):
        for x in (0, cw-1):
            if is_light[y, x] or dist[y, x] < 40:
                bg_mask[y, x] = True
                queue.append((y, x))
    for x in range(cw):
        for y in (0, ch-1):
            if (is_light[y, x] or dist[y, x] < 40) and not bg_mask[y, x]:
                bg_mask[y, x] = True
                queue.append((y, x))
                
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < ch and 0 <= nx < cw and not bg_mask[ny, nx]:
                if dist[ny, nx] < 30 or is_light[ny, nx]:
                    bg_mask[ny, nx] = True
                    queue.append((ny, nx))
                    
    rgba = np.zeros((ch, cw, 4), dtype=np.uint8)
    cat_mask = ~bg_mask & ~is_shadow
    
    # Remove small isolated noise specks
    cat_mask = clean_isolated_specks(cat_mask, min_size=20)
    
    rgba[cat_mask, :3] = cell[cat_mask]
    rgba[cat_mask, 3] = 255
    
    # Shadow (soft 20% alpha)
    shadow_mask = ~bg_mask & is_shadow
    shadow_mask[:ch//3, :] = False # only bottom
    shadow_mask = clean_isolated_specks(shadow_mask, min_size=15)
    
    rgba[shadow_mask, 0] = 35
    rgba[shadow_mask, 1] = 25
    rgba[shadow_mask, 2] = 25
    rgba[shadow_mask, 3] = 48
            
    return rgba

def build_64x64_frame(sprite_rgba):
    alpha = sprite_rgba[:, :, 3] > 0
    ys, xs = np.where(alpha)
    if len(ys) == 0:
        return Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        
    y_min, y_max = ys.min(), ys.max()
    x_min, x_max = xs.min(), xs.max()
    
    cropped = Image.fromarray(sprite_rgba[y_min:y_max+1, x_min:x_max+1])
    
    new_w = max(1, int(round(cropped.width * 0.42)))
    new_h = max(1, int(round(cropped.height * 0.42)))
    
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    frame = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    # Ground feet at y = 56
    pos_x = (64 - new_w) // 2
    pos_y = 56 - new_h
    frame.paste(resized, (pos_x, pos_y), resized)
    return frame

def create_strip(frames):
    strip = Image.new('RGBA', (64 * len(frames), 64), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * 64, 0))
    return strip

# 1. Walk: Row 1 (Cols 0, 1, 2, 3)
walk_frames = [build_64x64_frame(extract_isolated_clean_sprite(1, c)) for c in range(4)]
strip_walk = create_strip(walk_frames)

# 2. Idle: Row 4 (Cols 2 and 3 - seated and blinking smoothly without standing up repeatedly)
i2 = build_64x64_frame(extract_isolated_clean_sprite(4, 2))
i3 = build_64x64_frame(extract_isolated_clean_sprite(4, 3))
idle_frames = [i2, i3, i2, i3]
strip_idle = create_strip(idle_frames)

# 3. Sleep: Row 7 (Cols 0, 1 - 2 loaf frames looped as 0, 1, 0, 1)
s0 = build_64x64_frame(extract_isolated_clean_sprite(7, 0))
s1 = build_64x64_frame(extract_isolated_clean_sprite(7, 1))
strip_sleep = create_strip([s0, s1, s0, s1])

# 4. Cheer (Grooming / Licking paw): Row 5 (Cols 0, 1, 2, 3)
cheer_frames = [build_64x64_frame(extract_isolated_clean_sprite(5, c)) for c in range(4)]
strip_cheer = create_strip(cheer_frames)

# 5. Cry (Espreguiçando / Lie down): Row 6 (Cols 0, 1, 2, 3)
cry_frames = [build_64x64_frame(extract_isolated_clean_sprite(6, c)) for c in range(4)]
strip_cry = create_strip(cry_frames)

os.makedirs('public/assets/sprites', exist_ok=True)
strip_walk.save('public/assets/sprites/cat_mochi_walk.png')
strip_idle.save('public/assets/sprites/cat_mochi_idle.png')
strip_sleep.save('public/assets/sprites/cat_mochi_sleep.png')
strip_cheer.save('public/assets/sprites/cat_mochi_cheer.png')
strip_cry.save('public/assets/sprites/cat_mochi_cry.png')

# Save animated GIFs for preview
walk_frames[0].save('public/preview_clean_walk.gif', save_all=True, append_images=walk_frames[1:], duration=150, loop=0, disposal=2)
idle_frames[0].save('public/preview_clean_idle.gif', save_all=True, append_images=idle_frames[1:], duration=250, loop=0, disposal=2)
s0.save('public/preview_clean_sleep.gif', save_all=True, append_images=[s1, s0, s1], duration=350, loop=0, disposal=2)
cheer_frames[0].save('public/preview_clean_cheer.gif', save_all=True, append_images=cheer_frames[1:], duration=200, loop=0, disposal=2)
cry_frames[0].save('public/preview_clean_cry.gif', save_all=True, append_images=cry_frames[1:], duration=250, loop=0, disposal=2)

print('Built all 5 clean strips and animated preview GIFs successfully!')

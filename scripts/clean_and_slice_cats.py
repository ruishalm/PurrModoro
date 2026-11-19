import numpy as np
from PIL import Image

orig = Image.open('a857918ae417c7569c42179215fb86e6.jpg')
arr = np.array(orig)

# 1. Clean background using floodfill / threshold
# Background color in the original JPG is around 246..248
# Let's inspect background color
bg_r, bg_g, bg_b = 247, 247, 247

# For each row and column, let's define precise column X zones where each cat lives:
# Column 0: X in [110, 255]
# Column 1: X in [270, 415]
# Column 2: X in [430, 575]
# Column 3: X in [590, 740]
col_zones = [
    (110, 255),
    (270, 415),
    (430, 575),
    (590, 740),
]

row_zones = [
    (40, 140),   # Row 0: Walk front
    (205, 300),  # Row 1: Walk side
    (350, 460),  # Row 2: Walk back
    (520, 620),  # Row 3: Walk diag
    (680, 780),  # Row 4: Sit / Idle
    (840, 940),  # Row 5: Lick / Cheer
    (1000, 1100),# Row 6: Lie / Stretch
    (1170, 1265) # Row 7: Sleep
]

def extract_clean_cat_sprite(row_idx, col_idx):
    y0, y1 = row_zones[row_idx]
    x0, x1 = col_zones[col_idx]
    
    # Crop this isolated cell
    cell = arr[y0:y1, x0:x1].copy()
    h, w, _ = cell.shape
    
    # Detect background: pixels close to (247, 247, 247)
    # Background distance
    dist = np.sqrt(
        (cell[:, :, 0].astype(float) - bg_r)**2 +
        (cell[:, :, 1].astype(float) - bg_g)**2 +
        (cell[:, :, 2].astype(float) - bg_b)**2
    )
    
    # Shadow detection: grey pixels at the bottom
    # Shadow is grey: |R-G| < 15, |G-B| < 15, brightness < 200
    r, g, b = [cell[:, :, i].astype(int) for i in range(3)]
    is_shadow = (np.abs(r - g) <= 15) & (np.abs(g - b) <= 15) & (r >= 90) & (r <= 190)
    
    # Cat pixels: not background and not shadow
    is_bg = dist < 22 # strict background
    
    # Floodfill from borders to clear any connected background
    # using simple BFS floodfill from cell edges
    bg_mask = np.zeros((h, w), dtype=bool)
    from collections import deque
    queue = deque()
    
    # Add border pixels that are bg
    for y in range(h):
        for x in (0, w-1):
            if is_bg[y, x] or dist[y, x] < 35:
                bg_mask[y, x] = True
                queue.append((y, x))
    for x in range(w):
        for y in (0, h-1):
            if (is_bg[y, x] or dist[y, x] < 35) and not bg_mask[y, x]:
                bg_mask[y, x] = True
                queue.append((y, x))
                
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not bg_mask[ny, nx]:
                # If it's close to background or white JPEG noise
                if dist[ny, nx] < 28 or (cell[ny, nx, 0] > 230 and cell[ny, nx, 1] > 230 and cell[ny, nx, 2] > 230):
                    bg_mask[ny, nx] = True
                    queue.append((ny, nx))
                    
    # Create RGBA
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    # Cat body
    cat_mask = ~bg_mask & ~is_shadow
    rgba[cat_mask, :3] = cell[cat_mask]
    rgba[cat_mask, 3] = 255
    
    # Soft shadow: 20% alpha
    shadow_mask = ~bg_mask & is_shadow
    # only keep shadow at the bottom half of the sprite
    shadow_mask[:h//3, :] = False
    rgba[shadow_mask, 0] = 35
    rgba[shadow_mask, 1] = 25
    rgba[shadow_mask, 2] = 25
    rgba[shadow_mask, 3] = 48 # ~19% alpha
    
    # Remove isolated noise specks (components < 15 pixels)
    alpha = rgba[:, :, 3] > 0
    # simple clean
    return rgba

print('Function defined successfully')

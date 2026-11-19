import numpy as np
from PIL import Image

# We will generate a 4-frame animated strip of 3 baby chicks!
# Each frame: 40 px wide, 32 px high (total strip: 160 x 32)
# Colors:
# Yellow body: #ffd93b
# Yellow highlight: #fff07c
# Dark yellow/gold shade: #e5b324
# Orange beak: #ff7b00
# Orange feet: #e66000
# Eye: #1a1a1a with white glint
# Outline: #3a2a10

C_BG = (0, 0, 0, 0)
C_OUTLINE = (55, 38, 16, 255)
C_BODY = (255, 218, 55, 255)
C_SHADE = (230, 178, 35, 255)
C_HILIGHT = (255, 240, 125, 255)
C_BEAK = (255, 120, 0, 255)
C_FEET = (230, 95, 0, 255)
C_EYE = (25, 25, 25, 255)
C_SHADOW = (35, 25, 20, 45)

def draw_single_chick(canvas, cx, cy, facing_left=False, wing_flap=False):
    # cx, cy is center of chick body (width ~8, height ~8)
    # Body circle radius ~3.5
    # Pixels relative to (cx, cy):
    #   (-2,-3) to (2,-3): outline top
    # Head and body merged into a cute fluffy round ball
    # Matrix of 9x9 pixels:
    # row -4:   . . # # # . .
    # row -3: . # # B B # # .
    # row -2: # # B H B B # #
    # row -1: # B B B B B E # [beak extends on right if facing right]
    # row  0: # B B B B B B #
    # row +1: # # S S S S # #
    # row +2: . # # # # # # .
    # row +3: . . F . . F . . (feet)
    
    # We will draw directly into canvas array
    for dy in range(-4, 4):
        for dx in range(-4, 5):
            dist_sq = dx*dx + dy*dy
            px = cx + dx
            py = cy + dy
            if 0 <= px < canvas.shape[1] and 0 <= py < canvas.shape[0]:
                if dist_sq <= 11:
                    # Inside body
                    if dy == -2 and dx == -1:
                        canvas[py, px] = C_HILIGHT
                    elif dy >= 1:
                        canvas[py, px] = C_SHADE
                    else:
                        canvas[py, px] = C_BODY
                elif dist_sq <= 18:
                    canvas[py, px] = C_OUTLINE
                    
    # Eye
    eye_x = cx + (2 if not facing_left else -2)
    eye_y = cy - 1
    canvas[eye_y, eye_x] = C_EYE
    
    # Beak
    beak_x = cx + (4 if not facing_left else -4)
    beak_y = cy
    canvas[beak_y, beak_x] = C_BEAK
    canvas[beak_y, beak_x + (1 if not facing_left else -1)] = C_BEAK
    
    # Tiny wing
    wing_x = cx - (1 if not facing_left else -1)
    wing_y = cy if not wing_flap else cy - 1
    canvas[wing_y, wing_x] = C_SHADE
    
    # Feet
    foot_y = cy + 4
    canvas[foot_y, cx - 1] = C_FEET
    canvas[foot_y, cx + 2] = C_FEET
    
    # Shadow under feet (grounded at y = cy + 5)
    shadow_y = cy + 5
    for sx in range(cx - 3, cx + 4):
        if 0 <= sx < canvas.shape[1] and 0 <= shadow_y < canvas.shape[0]:
            canvas[shadow_y, sx] = C_SHADOW

def generate_chicks_strip():
    fw, fh = 40, 32
    num_frames = 4
    strip = np.zeros((fh, fw * num_frames, 4), dtype=np.uint8)
    
    # Base positions of 3 chicks in 40x32 frame:
    # Chick 1 (Leader): x = 28, y = 22
    # Chick 2 (Middle): x = 18, y = 23
    # Chick 3 (Trailing): x = 8, y = 24
    
    # 4 animation frames with alternating hopping:
    # Frame 0: Chick 1 hops (dy = -3), Chick 2 on ground (dy = 0), Chick 3 on ground (dy = 0)
    # Frame 1: Chick 1 lands (dy = 0), Chick 2 hops (dy = -3), Chick 3 on ground (dy = 0)
    # Frame 2: Chick 1 on ground, Chick 2 lands (dy = 0), Chick 3 hops (dy = -3)
    # Frame 3: Chick 3 lands, all bounce slightly (dy = -1, -1, -1)
    
    hop_offsets = [
        (-3, 0, 0),
        (0, -3, 0),
        (0, 0, -3),
        (-1, -1, -1)
    ]
    
    for f in range(num_frames):
        f_x = f * fw
        frame_canvas = np.zeros((fh, fw, 4), dtype=np.uint8)
        dy1, dy2, dy3 = hop_offsets[f]
        
        # Draw from back to front (Chick 3, then 2, then 1)
        draw_single_chick(frame_canvas, 9, 23 + dy3, facing_left=False, wing_flap=(dy3 < 0))
        draw_single_chick(frame_canvas, 19, 23 + dy2, facing_left=False, wing_flap=(dy2 < 0))
        draw_single_chick(frame_canvas, 29, 23 + dy1, facing_left=False, wing_flap=(dy1 < 0))
        
        strip[:, f_x : f_x + fw] = frame_canvas
        
    return Image.fromarray(strip)

strip = generate_chicks_strip()
strip.save('public/assets/sprites/pet_chicks.png')

# Save animated preview GIF
frames = [strip.crop((i*40, 0, (i+1)*40, 32)) for i in range(4)]
frames[0].save('public/preview_chicks.gif', save_all=True, append_images=frames[1:], duration=140, loop=0, disposal=2)

print('Generated pet_chicks.png and preview_chicks.gif!')

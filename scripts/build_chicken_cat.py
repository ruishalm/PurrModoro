from PIL import Image
import numpy as np
import os

im = Image.open('Chicken_Sprite_Sheet.png')
# Size 128x128 -> 4 cols x 4 rows of 32x32

# Let's check each row:
# Row 0 (Y: 0..32): Pecking grain (4 frames)
# Row 1 (Y: 32..64): Preparing to nest / sitting (4 frames)
# Row 2 (Y: 64..96): Sitting loafing / sleeping in nest (4 frames)
# Row 3 (Y: 96..128): Walking (4 frames)

# In 32x32:
# Walk: Row 3 (4 frames)
# Sleep: Row 2 (4 frames of cozy sitting in nest!)
# Cheer: Row 0 (4 frames of happy pecking / ciscar o chão!)
# Cry: Row 1 (4 frames of crouching down)
# Idle: Can be Row 2 frame 0/1 (standing alert looking around, blinking) or Row 3 frame 0

# Let's crop:
def get_row_strip(row_idx):
    return im.crop((0, row_idx * 32, 128, (row_idx + 1) * 32))

strip_walk = get_row_strip(3)
strip_sleep = get_row_strip(2)
strip_cheer = get_row_strip(0)
strip_cry = get_row_strip(1)

# For idle: let's use standing alert (Row 3 frame 0, Row 0 frame 0)
f_stand = im.crop((0, 3*32, 32, 4*32))
f_blink = im.crop((0, 0*32, 32, 1*32))
strip_idle = Image.new('RGBA', (128, 32))
strip_idle.paste(f_stand, (0, 0))
strip_idle.paste(f_blink, (32, 0))
strip_idle.paste(f_stand, (64, 0))
strip_idle.paste(f_stand, (96, 0))

os.makedirs('public/assets/sprites', exist_ok=True)
strip_walk.save('public/assets/sprites/cat_chicken_walk.png')
strip_sleep.save('public/assets/sprites/cat_chicken_sleep.png')
strip_cheer.save('public/assets/sprites/cat_chicken_cheer.png')
strip_cry.save('public/assets/sprites/cat_chicken_cry.png')
strip_idle.save('public/assets/sprites/cat_chicken_idle.png')

# Save animated GIFs for preview
for name, strip in [('walk', strip_walk), ('sleep', strip_sleep), ('cheer', strip_cheer), ('idle', strip_idle)]:
    frames = [strip.crop((i*32, 0, (i+1)*32, 32)) for i in range(4)]
    frames[0].save(f'public/preview_chicken_{name}.gif', save_all=True, append_images=frames[1:], duration=160, loop=0, disposal=2)

print('Built cat_chicken sprites and previews successfully!')

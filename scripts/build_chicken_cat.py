from PIL import Image, ImageOps
import os

im = Image.open('Chicken_Sprite_Sheet.png')
# Size 128x128 -> 4 cols x 4 rows of 32x32
# Source chicken natively faces left. In PurrModoro engine, actors natively face right
# and are flipped when moving left (dir < 0).
# Therefore, all frames MUST be mirrored (ImageOps.mirror) so she natively faces right.

def get_frame(r, c):
    f = im.crop((c * 32, r * 32, (c + 1) * 32, (r + 1) * 32))
    return ImageOps.mirror(f)

# 1. Walk: Row 3 (cols 0, 1, 2, 3) - Mirrored, walking forward to the right
walk_frames = [get_frame(3, c) for c in range(4)]
strip_walk = Image.new('RGBA', (128, 32))
for i, f in enumerate(walk_frames):
    strip_walk.paste(f, (i * 32, 0))

# 2. Idle: Calm standing with subtle curious head-tilt (never sitting/popping up)
idle_frames = [get_frame(0, 0), get_frame(0, 1), get_frame(0, 0), get_frame(0, 0)]
strip_idle = Image.new('RGBA', (128, 32))
for i, f in enumerate(idle_frames):
    strip_idle.paste(f, (i * 32, 0))

# 3. Sleep: Row 2 Col 2, Row 2 Col 3, Row 2 Col 2, Row 2 Col 3
# Stays nestled down on the ground in loaf position with gentle breathing (never standing up in loop)
sleep_frames = [get_frame(2, 2), get_frame(2, 3), get_frame(2, 2), get_frame(2, 3)]
strip_sleep = Image.new('RGBA', (128, 32))
for i, f in enumerate(sleep_frames):
    strip_sleep.paste(f, (i * 32, 0))

# 4. Cheer: Row 0 (cols 0, 1, 2, 3) - Mirrored, happy pecking / ciscar o chão
cheer_frames = [get_frame(0, c) for c in range(4)]
strip_cheer = Image.new('RGBA', (128, 32))
for i, f in enumerate(cheer_frames):
    strip_cheer.paste(f, (i * 32, 0))

# 5. Cry: Row 1 Col 1, Row 1 Col 2, Row 1 Col 2, Row 1 Col 1
# Crouched sadly, staying low (never standing up)
cry_frames = [get_frame(1, 1), get_frame(1, 2), get_frame(1, 2), get_frame(1, 1)]
strip_cry = Image.new('RGBA', (128, 32))
for i, f in enumerate(cry_frames):
    strip_cry.paste(f, (i * 32, 0))

os.makedirs('public/assets/sprites', exist_ok=True)
strip_walk.save('public/assets/sprites/cat_chicken_walk.png')
strip_idle.save('public/assets/sprites/cat_chicken_idle.png')
strip_sleep.save('public/assets/sprites/cat_chicken_sleep.png')
strip_cheer.save('public/assets/sprites/cat_chicken_cheer.png')
strip_cry.save('public/assets/sprites/cat_chicken_cry.png')

# Save animated GIFs for preview
for name, frames, dur in [
    ('walk', walk_frames, 140),
    ('idle', idle_frames, 240),
    ('sleep', sleep_frames, 300),
    ('cheer', cheer_frames, 140),
    ('cry', cry_frames, 250)
]:
    frames[0].save(f'public/preview_chicken_{name}.gif', save_all=True, append_images=frames[1:], duration=dur, loop=0, disposal=2)

print('Built cat_chicken sprites and previews successfully!')

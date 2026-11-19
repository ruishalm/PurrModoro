"""
Processa, recorta e cataloga todos os assets pixel art da pasta assets/
para public/assets/ (sprites, itens de decoração, UI e catalog.json).
"""

import json
import os
import shutil
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets"
OUT = ROOT / "public" / "assets"
SPRITES_DIR = OUT / "sprites"
ITEMS_DIR = OUT / "items"
UI_DIR = OUT / "ui"


def ensure_dirs():
    for d in (SPRITES_DIR, ITEMS_DIR, UI_DIR):
        d.mkdir(parents=True, exist_ok=True)


def crop_save(
    src_rel: str,
    rect: tuple[int, int, int, int],
    dest_path: Path,
    clear_corner_rects: list[tuple[int, int, int, int]] | None = None,
) -> tuple[int, int]:
    src_path = SRC / src_rel
    with Image.open(src_path).convert("RGBA") as img:
        cropped = img.crop(rect)
        if clear_corner_rects:
            px = cropped.load()
            w, h = cropped.size
            for x0, y0, x1, y1 in clear_corner_rects:
                for y in range(max(0, y0), min(h, y1)):
                    for x in range(max(0, x0), min(w, x1)):
                        px[x, y] = (0, 0, 0, 0)
        cropped.save(dest_path)
        return cropped.size


def build_uniform_strip(
    src_rel: str,
    row_y0: int,
    row_y1: int,
    num_frames: int,
    cell_w: int = 64,
    out_size: int = 64,
    dest_name: str = "",
):
    """Recorta faixas de uma sprite sheet (ex: FreeCats.png) e centraliza cada frame."""
    src_path = SRC / src_rel
    with Image.open(src_path).convert("RGBA") as img:
        strip = Image.new("RGBA", (num_frames * out_size, out_size), (0, 0, 0, 0))
        for i in range(num_frames):
            cell = img.crop((i * cell_w, row_y0, (i + 1) * cell_w, row_y1))
            bbox = cell.getbbox()
            if not bbox:
                continue
            trimmed = cell.crop(bbox)
            tw, th = trimmed.size
            # Alinha pela base com pequena margem para não cortar
            dx = (out_size - tw) // 2
            dy = max(0, out_size - th - 2)
            strip.paste(trimmed, (i * out_size + dx, dy), trimmed)
        dest_path = SPRITES_DIR / dest_name
        strip.save(dest_path)
        return strip.size


def copy_sprite(src_rel: str, dest_name: str) -> tuple[int, int]:
    src_path = SRC / src_rel
    dest_path = SPRITES_DIR / dest_name
    shutil.copy2(src_path, dest_path)
    with Image.open(dest_path) as img:
        return img.size


def _plot_mask(img: Image.Image, rows: list[str], palette: dict[str, tuple[int, int, int, int]], ox: int = 0, oy: int = 0):
    """Desenha uma matriz ASCII de pixel art em uma imagem RGBA."""
    px = img.load()
    w, h = img.size
    for ry, row in enumerate(rows):
        py = oy + ry
        if py < 0 or py >= h:
            continue
        for rx, ch in enumerate(row):
            col = palette.get(ch)
            if not col:
                continue
            px_x = ox + rx
            if 0 <= px_x < w:
                px[px_x, py] = col


def generate_dino_sprites(
    sprites_dir: Path,
    prefix: str = "cat_dino",
    body_col: tuple[int, int, int, int] = (88, 92, 98, 255),
    belly_col: tuple[int, int, int, int] = (132, 138, 146, 255),
    outline_col: tuple[int, int, int, int] = (44, 42, 48, 255),
):
    """Gera as sprite sheets de Dino Sem Wi-Fi (idle, sleep, cheer, cry) com paleta customizável."""
    pal = {
        "O": outline_col,            # contorno escuro legível em tema claro e escuro
        "B": body_col,               # corpo principal
        "L": belly_col,              # barriga/highlight
        "E": (255, 255, 255, 255),   # olho branco
        "G": (95, 168, 88, 255),     # cacto verde
        "D": (62, 120, 58, 255),     # sombra do cacto
        "Z": (124, 198, 255, 255),   # Zzz do sono
        "T": (96, 186, 255, 255),    # lágrima
        "R": (224, 92, 92, 255),     # X de erro no choro
        "Y": (244, 180, 26, 255),    # brilho dourado
    }

    # Base T-Rex voltado para direita (altura ~26px dentro de 32x32)
    dino_upper = [
        "..............OOOOOOOOOOOO....",
        ".............OBBBBBBBBBBBBO...",
        "............OBBBBEOBBBBBBBBO..",
        "............OBBBBBBBBBBBBBBO..",
        "............OBBBBBBBBBBBBBBO..",
        "............OBBBBBBBBBBBBBBO..",
        "............OBBBBBBBOOOOOOO...",
        "............OBBBBBBBBBBO......",
        "...........OBBBBBBBOOOO.......",
        "..O.......OBBBBBBO............",
        "..OO.....OBBBBBBBBOOO.........",
        "..OBO...OBBBBBBBBOBBO.........",
        "..OBBO.OBBBBLLBBBBO.O.........",
        "..OBBBOBBBBLLLBBBBO...........",
        "...OBBBBBBBLLLLBBBO...........",
        "....OBBBBBBLLLLBBBO...........",
        ".....OBBBBBBLLLBBBO...........",
        "......OBBBBBBLLBBBO...........",
        ".......OBBBBBBBBBBO...........",
        "........OBBBBOBBBO............",
    ]
    legs_stand = [
        ".........OBBO..OBBO...........",
        ".........OBO....OBO...........",
        ".........OBO....OBO...........",
        ".........OBBO...OBBO..........",
    ]
    legs_walk_a = [
        ".........OBBO..OBBO...........",
        ".........OBO....OBBO..........",
        ".........OBO..................",
        ".........OBBO.................",
    ]
    legs_walk_b = [
        ".........OBBO..OBBO...........",
        ".........OBBO...OBO...........",
        "................OBO...........",
        "................OBBO..........",
    ]
    legs_jump = [
        ".........OBBO..OBBO...........",
        "..........OBBO..OBBO..........",
        "..............................",
    ]

    # 1. Idle / corrida suave (8 frames, 32x32)
    idle_strip = Image.new("RGBA", (32 * 8, 32), (0, 0, 0, 0))
    idle_poses = [
        (0, legs_stand),
        (-1, legs_walk_a),
        (0, legs_walk_a),
        (0, legs_stand),
        (0, legs_stand),
        (-1, legs_walk_b),
        (0, legs_walk_b),
        (0, legs_stand),
    ]
    for i, (bob_y, legs) in enumerate(idle_poses):
        _plot_mask(idle_strip, dino_upper + legs, pal, ox=i * 32 + 1, oy=7 + bob_y)
    idle_strip.save(sprites_dir / f"{prefix}_idle.png")

    # 2. Sleep (4 frames, 32x32 — Dino deitadinho com Zzz)
    dino_sleep_body = [
        ".............OOOOOOOOOOOO.....",
        "............OBBBBBBBBBBBBO....",
        "...........OBBBBBBBBBBBBBBO...",
        "...........OBBBBOOOBBBBBBBO...",
        "...........OBBBBBBBBBBBBBBO...",
        "...........OBBBBBBBBBBBBBBO...",
        "...........OBBBBBBOOOOOOOO....",
        "..........OBBBBBBBBBBO........",
        "..OO....OOBBBBBBBOOOO.........",
        "..OBOOOOOBBBBBBBBBOOO.........",
        "...OBBBBBBBBBLLBBBOBO.........",
        "....OBBBBBBBBLLLBBBO..........",
        ".....OBBBBBBBLLLBBBO..........",
        "......OOOOOOOOOOOOO...........",
        ".......OBBOO...OBBOO..........",
    ]
    sleep_strip = Image.new("RGBA", (32 * 4, 32), (0, 0, 0, 0))
    for i in range(4):
        by = 16 + (1 if i == 2 else 0)
        _plot_mask(sleep_strip, dino_sleep_body, pal, ox=i * 32 + 1, oy=by)
        if i >= 1:
            _plot_mask(sleep_strip, ["ZZZ", ".Z.", "ZZZ"], pal, ox=i * 32 + 24, oy=max(5, 12 - i * 2))
    sleep_strip.save(sprites_dir / f"{prefix}_sleep.png")

    # 3. Cheer (4 frames, 32x32 — pulando cacto + brilhos!)
    cheer_strip = Image.new("RGBA", (32 * 4, 32), (0, 0, 0, 0))
    cactus = [
        "..GG..",
        "G.GD.G",
        "G.GD.G",
        "GGGDGG",
        "..GD..",
        "..GD..",
    ]
    cheer_bobs = [0, -3, -4, -2]
    for i, by in enumerate(cheer_bobs):
        _plot_mask(cheer_strip, dino_upper + legs_jump, pal, ox=i * 32 + 1, oy=7 + by)
        _plot_mask(cheer_strip, cactus, pal, ox=i * 32 + 25, oy=25)
        if i in (1, 2):
            _plot_mask(cheer_strip, [".Y.", "YYY", ".Y."], pal, ox=i * 32 + 3, oy=5)
            _plot_mask(cheer_strip, ["Y"], pal, ox=i * 32 + 28, oy=8)
    cheer_strip.save(sprites_dir / f"{prefix}_cheer.png")

    # 4. Cry (4 frames, 32x32 — olhão assustado de Game Over + lágrima)
    dino_cry_upper = list(dino_upper)
    dino_cry_upper[1] = ".............OBBEEEBBBBBBBO..."
    dino_cry_upper[2] = "............OBBBEOEBBBBBBBBO.."
    dino_cry_upper[3] = "............OBBBEEEBBBBBBBBO.."
    cry_strip = Image.new("RGBA", (32 * 4, 32), (0, 0, 0, 0))
    for i in range(4):
        by = 7 + (i % 2)
        _plot_mask(cry_strip, dino_cry_upper + legs_stand, pal, ox=i * 32 + 1, oy=by)
        _plot_mask(cry_strip, ["T", "T"], pal, ox=i * 32 + 17, oy=by + 4 + (i % 2))
        if i % 2 == 0:
            _plot_mask(cry_strip, ["R.R", ".R.", "R.R"], pal, ox=i * 32 + 6, oy=3)
    cry_strip.save(sprites_dir / f"{prefix}_cry.png")

    # 5. Walk (4 frames, 32x32 — corrida/passo alternado)
    walk_strip = Image.new("RGBA", (32 * 4, 32), (0, 0, 0, 0))
    walk_poses = [
        (0, legs_walk_a),
        (-1, legs_stand),
        (0, legs_walk_b),
        (-1, legs_stand),
    ]
    for i, (bob_y, legs) in enumerate(walk_poses):
        _plot_mask(walk_strip, dino_upper + legs, pal, ox=i * 32 + 1, oy=7 + bob_y)
    walk_strip.save(sprites_dir / f"{prefix}_walk.png")



def generate_mochi_walk_sprite(sprites_dir: Path):
    """Gera o ciclo de caminhada de 4 frames (32x32) com patinhas alternadas e barriguinha arqueada."""
    src_idle = SRC / "CatPackFree/CatPackFree/Idle.png"
    if not src_idle.exists():
        src_idle = SPRITES_DIR / "cat_mochi_idle.png"
    with Image.open(src_idle).convert("RGBA") as idle_img:
        f0 = idle_img.crop((0, 0, 32, 32))

    pal = {
        "O": (33, 33, 33, 255),
        "W": (254, 245, 230, 255),
        "w": (253, 213, 181, 255),
        "S": (230, 180, 160, 255),
        "B": (215, 140, 119, 255),
        ".": (0, 0, 0, 0),
    }

    legs_p0 = [
        "....OWWWwOWWWWSWWOO.OWSO..",
        "....OWWWWOWWWwSWWWWOOWSO..",
        ".OOOO.WWw.WWWOOOOSWOWWSO..",
        "OwwwwO.Ww.OWWWWS..OWWSSO..",
        "OSBwwO....OWWWW..SSWSSO...",
        "OSBwO.....OWWW...SSSSO....",
        ".OSSO.....OWW.....OOOO....",
        "..OO......OOO.............",
    ]

    legs_p1 = [
        "....OWWWwOWWWWSWWOO.OWSO..",
        "....OWWWWOWWWwSWWWWOOWSO..",
        "..OOOSWWwOWWW.OOOSWOWWSO..",
        ".OwwwOSWW.OWW...SSWOWSSO..",
        ".OSBwOSW..OWW...SSWSSO....",
        "..OSBwO...OW.....SSSSO....",
        "...OO.....OO......OOO.....",
        "..........................",
    ]

    legs_p2 = [
        "....OWWWwOWWWWSWWOO.OWSO..",
        "....OWWWWOWWWwSWWWWOOWSO..",
        "..OOOO.WWw..WWOOOOSWOWWSO.",
        "..OwwwO.Ww..OWWWWS.WOWSSO.",
        "..OSBwwO....OWWWW.SSWSSO..",
        "...OSBwO....OWWW..SSSSO...",
        "....OSSO....OWW....OOOO...",
        ".....OO......OO...........",
    ]

    legs_p3 = list(legs_p1)

    strip = Image.new("RGBA", (32 * 4, 32), (0, 0, 0, 0))
    upper = f0.crop((0, 0, 32, 24))

    for i, (bob, leg_m) in enumerate([(0, legs_p0), (-1, legs_p1), (0, legs_p2), (-1, legs_p3)]):
        fr = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        fr.paste(upper, (0, bob), upper)
        _plot_mask(fr, leg_m, pal, ox=0, oy=24 + bob)
        strip.paste(fr, (i * 32, 0))

    strip.save(sprites_dir / "cat_mochi_walk.png")


def generate_biped_walk_sprite(src_img_path: Path, dest_path: Path, frame_size: int = 64):
    """Gera caminhada de 4 frames a partir do frame parado de gatos maiores (Pochi, Frajola, Neve)."""
    with Image.open(src_img_path).convert("RGBA") as img:
        f0 = img.crop((0, 0, frame_size, frame_size))
        split_y = 53 if frame_size == 64 else int(frame_size * 0.8)
        upper = f0.crop((0, 0, frame_size, split_y))
        paw_l = f0.crop((18, split_y, 33, frame_size))
        paw_r = f0.crop((33, split_y, 48, frame_size))

        strip = Image.new("RGBA", (frame_size * 4, frame_size), (0, 0, 0, 0))
        for phase in range(4):
            fr = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
            bob = -1 if phase in (1, 3) else 0
            fr.paste(upper, (0, bob), upper)
            if phase == 0:
                fr.paste(paw_l, (18 - 2, split_y), paw_l)
                fr.paste(paw_r, (33 + 2, split_y), paw_r)
            elif phase == 1:
                fr.paste(paw_l, (18, split_y - 1), paw_l)
                fr.paste(paw_r, (33, split_y - 1), paw_r)
            elif phase == 2:
                fr.paste(paw_l, (18 + 2, split_y), paw_l)
                fr.paste(paw_r, (33 - 2, split_y), paw_r)
            elif phase == 3:
                fr.paste(paw_l, (18, split_y - 1), paw_l)
                fr.paste(paw_r, (33, split_y - 1), paw_r)
            strip.paste(fr, (phase * frame_size, 0))

        strip.save(dest_path)


def generate_box_walk_sprite(src_img_path: Path, dest_path: Path):
    """Gera caminhada para gatinho dentro da caixa (waddle / gingado lateral e bobbing)."""
    with Image.open(src_img_path).convert("RGBA") as img:
        f0 = img.crop((0, 0, 32, 32))
        strip = Image.new("RGBA", (32 * 4, 32), (0, 0, 0, 0))
        offsets = [(-1, 0), (0, -1), (1, 0), (0, -1)]
        for i, (dx, dy) in enumerate(offsets):
            fr = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
            fr.paste(f0, (dx, dy), f0)
            strip.paste(fr, (i * 32, 0))
        strip.save(dest_path)


def _lerp_rgb(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(round(c1[0] + (c2[0] - c1[0]) * t)),
        int(round(c1[1] + (c2[1] - c1[1]) * t)),
        int(round(c1[2] + (c2[2] - c1[2]) * t)),
    )


def recolor_cat_sheet(
    src_name: str,
    dest_name: str,
    dark_rgb: tuple[int, int, int],
    mid_rgb: tuple[int, int, int],
    light_rgb: tuple[int, int, int],
):
    """Recoloriza apenas os tons quentes da pelagem mantendo contornos escuros, olhos e lágrimas."""
    src_path = SPRITES_DIR / src_name
    dest_path = SPRITES_DIR / dest_name
    with Image.open(src_path).convert("RGBA") as img:
        out = img.copy()
        px = out.load()
        w, h = out.size
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                # Apenas pixels quentes da pelagem (exclui contorno escuro, branco puro e azul)
                if r > b + 16 and lum >= 65:
                    t = max(0.0, min(1.0, (lum - 75.0) / 155.0))
                    if t < 0.5:
                        nr, ng, nb = _lerp_rgb(dark_rgb, mid_rgb, t * 2.0)
                    else:
                        nr, ng, nb = _lerp_rgb(mid_rgb, light_rgb, (t - 0.5) * 2.0)
                    px[x, y] = (nr, ng, nb, a)
        out.save(dest_path)


CAT_RECOLOR_PALETTES = {
    "cat_sakura": ((196, 98, 134), (242, 162, 192), (255, 224, 236)),
    "cat_blueberry": ((66, 114, 178), (124, 178, 234), (214, 238, 255)),
    "cat_matcha": ((74, 132, 76), (134, 194, 120), (218, 244, 206)),
    "cat_lavender": ((116, 86, 168), (176, 146, 224), (234, 220, 252)),
    "cat_sec_galaxy": ((48, 34, 96), (112, 74, 198), (196, 166, 255)),
    "cat_sec_gold": ((176, 118, 18), (236, 184, 52), (255, 240, 148)),
    "cat_sec_cyber": ((24, 128, 138), (64, 212, 216), (255, 116, 214)),
    "cat_sec_sunset": ((184, 58, 72), (244, 118, 86), (255, 204, 124)),
    "cat_sec_cocoa": ((86, 52, 38), (144, 96, 70), (222, 186, 152)),
}


def prepare_sprites():
    print("-> Processando sprite sheets de gatinhos e pets...")
    # Folhas já alinhadas horizontalmente
    copy_sprite("CatPackFree/CatPackFree/Idle.png", "cat_mochi_idle.png")
    copy_sprite("CatPackFree/CatPackFree/Box3.png", "cat_mochi_box.png")
    copy_sprite("CatPackFree/CatPackFree/drculacat.png", "cat_dracula.png")
    copy_sprite("CatPackHalloweenFREE/CatPackHalloweenFREE/VampireAngry.png", "cat_vampire_angry.png")
    copy_sprite("CatPackHalloweenFREE/CatPackHalloweenFREE/WitchFlying.png", "cat_witch.png")
    copy_sprite("CatPackHalloweenFREE/CatPackHalloweenFREE/EvilBox1.png", "cat_evil_box.png")
    copy_sprite("FreeDemo/FreeDemo/Eating.png", "cat_zombie_eating.png")
    copy_sprite("PetMobileFree/PetMobileFree/FreeBunny.png", "pet_bunny.png")
    copy_sprite("PetMobileFree/PetMobileFree/GoldenRetriver.png", "pet_golden.png")
    copy_sprite("FreeDemo/FreeDemo/BONUSZombieHand.png", "pet_zombie_hand.png")
    copy_sprite("CatPackHalloweenFREE/CatPackHalloweenFREE/EyeinJar/PNG/EyeinJar.png", "decor_eye_jar.png")
    generate_dino_sprites(SPRITES_DIR, "cat_dino")
    generate_dino_sprites(
        SPRITES_DIR,
        "cat_dino_green",
        body_col=(62, 166, 94, 255),
        belly_col=(156, 224, 140, 255),
        outline_col=(32, 68, 44, 255),
    )
    generate_dino_sprites(
        SPRITES_DIR,
        "cat_sec_dino_pink",
        body_col=(238, 128, 174, 255),
        belly_col=(255, 206, 226, 255),
        outline_col=(82, 34, 58, 255),
    )
    generate_dino_sprites(
        SPRITES_DIR,
        "cat_sec_dino_gold",
        body_col=(234, 178, 42, 255),
        belly_col=(255, 238, 144, 255),
        outline_col=(84, 54, 18, 255),
    )
    generate_dino_sprites(
        SPRITES_DIR,
        "cat_sec_dino_purple",
        body_col=(146, 98, 214, 255),
        belly_col=(214, 184, 252, 255),
        outline_col=(48, 28, 86, 255),
    )

    # Animações de caminhada (walk) para Mochi, Caixa e Bípedes
    generate_mochi_walk_sprite(SPRITES_DIR)
    generate_box_walk_sprite(SPRITES_DIR / "cat_mochi_box.png", SPRITES_DIR / "cat_mochi_box_walk.png")

    # Faixas verticais de FreeCats.png (Pochi Creme): cry (4), cheer (2), sleep (4)
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats.png", 0, 64, 4, 64, 64, "cat_cream_cry.png")
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats.png", 64, 128, 2, 64, 64, "cat_cream_cheer.png")
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats.png", 128, 192, 4, 64, 64, "cat_cream_sleep.png")

    # Recolorizações em pixel art (loja + brindes secretos "Adote um Dev")
    for cid, (dark_c, mid_c, light_c) in CAT_RECOLOR_PALETTES.items():
        recolor_cat_sheet("cat_mochi_idle.png", f"{cid}_idle.png", dark_c, mid_c, light_c)
        recolor_cat_sheet("cat_cream_sleep.png", f"{cid}_sleep.png", dark_c, mid_c, light_c)
        recolor_cat_sheet("cat_cream_cheer.png", f"{cid}_cheer.png", dark_c, mid_c, light_c)
        recolor_cat_sheet("cat_cream_cry.png", f"{cid}_cry.png", dark_c, mid_c, light_c)
        recolor_cat_sheet("cat_mochi_walk.png", f"{cid}_walk.png", dark_c, mid_c, light_c)

    # Faixas verticais de FreeCats2.png (Frajola Tuxedo): 256x188
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats2.png", 0, 60, 4, 64, 64, "cat_tuxedo_cry.png")
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats2.png", 60, 122, 2, 64, 64, "cat_tuxedo_cheer.png")
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats2.png", 122, 188, 4, 64, 64, "cat_tuxedo_sleep.png")

    # Gatinho Branco comemorando de RetroCatsFree.png (row 1: y=72..133)
    build_uniform_strip("RetroCatsFree.png/RetroCatsFree.png", 72, 133, 2, 64, 64, "cat_white_cheer.png")

    # Gerar ciclos de caminhada para gatos bípedes (Pochi, Frajola, Neve)
    generate_biped_walk_sprite(SPRITES_DIR / "cat_cream_cheer.png", SPRITES_DIR / "cat_cream_walk.png", 64)
    generate_biped_walk_sprite(SPRITES_DIR / "cat_tuxedo_cheer.png", SPRITES_DIR / "cat_tuxedo_walk.png", 64)
    generate_biped_walk_sprite(SPRITES_DIR / "cat_white_cheer.png", SPRITES_DIR / "cat_white_walk.png", 64)

    # Gatinho dormindo enroladinho (para UI / dormir / tray)
    crop_save("CatUIFree/CatUIFree/free.png", (66, 90, 109, 122), SPRITES_DIR / "cat_curled_sleep.png")


def prepare_ui():
    print("-> Recortando ícones e elementos de UI...")
    ui_src = "CatUIFree/CatUIFree/free.png"
    cozy_src = "UiCozyFree.png/UiCozyFree.png"

    # Tray icon 32x32 nitido 1:1 usando o primeiro frame do Mochi (sem distorção de resize)
    with Image.open(SRC / "CatPackFree/CatPackFree/Idle.png").convert("RGBA") as idle_img:
        frame0 = idle_img.crop((0, 0, 32, 32))
        bbox = frame0.getbbox()
        tray = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        if bbox:
            trimmed = frame0.crop(bbox)
            tw, th = trimmed.size
            tray.paste(trimmed, ((32 - tw) // 2, (32 - th) // 2), trimmed)
        tray.save(UI_DIR / "tray_icon.png")
        tray256 = tray.resize((256, 256), Image.Resampling.NEAREST)
        tray256.save(
            UI_DIR / "tray_icon.ico",
            format="ICO",
            sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
        )

    with Image.open(SRC / ui_src).convert("RGBA") as img:

        # HUD & balões de gato
        img.crop((2, 1, 78, 29)).save(UI_DIR / "cat_hud.png")
        img.crop((5, 39, 26, 57)).save(UI_DIR / "bubble_cream.png")
        img.crop((37, 39, 58, 57)).save(UI_DIR / "bubble_tan.png")
        img.crop((5, 71, 26, 89)).save(UI_DIR / "bubble_blue.png")
        img.crop((37, 71, 58, 89)).save(UI_DIR / "bubble_pink.png")

        # Ícones 16x16 creme/rosa do CatUIFree
        icons_map = {
            "btn_play.png": (128, 0, 144, 16),
            "btn_pause.png": (160, 0, 176, 16),
            "btn_plus.png": (128, 16, 144, 32),
            "btn_check.png": (160, 16, 176, 32),
            "btn_close.png": (128, 32, 144, 48),
            "btn_minus.png": (160, 32, 176, 48),
            "btn_help.png": (128, 48, 144, 64),
            "btn_shop.png": (160, 48, 176, 64),
            "btn_pink_play.png": (192, 64, 208, 80),
            "btn_pink_pause.png": (224, 64, 240, 80),
            "btn_pink_shop.png": (224, 112, 240, 128),
        }
        for name, rect in icons_map.items():
            img.crop(rect).save(UI_DIR / name)

    with Image.open(SRC / cozy_src).convert("RGBA") as cozy:
        cozy.crop((8, 167, 95, 248)).save(UI_DIR / "panel_cozy.png")
        cozy.crop((2, 5, 92, 32)).save(UI_DIR / "btn_play_wide.png")


def _draw_iso_prism(
    draw: ImageDraw.ImageDraw,
    bx: int,
    by: int,
    w_right: int,
    w_left: int,
    h: int,
    top_col,
    left_col,
    right_col,
    outline_col=(78, 64, 59, 255),
    top_trim=None,
):
    """Desenha um prisma isométrico 2:1 pixel art a partir do canto superior traseiro (bx, by)."""
    # w_right segue (+2x, +1y); w_left segue (-2x, +1y)
    p_back = (bx, by)
    p_right = (bx + 2 * w_right, by + w_right)
    p_left = (bx - 2 * w_left, by + w_left)
    p_front = (bx + 2 * (w_right - w_left), by + w_right + w_left)

    p_left_bot = (p_left[0], p_left[1] + h)
    p_front_bot = (p_front[0], p_front[1] + h)
    p_right_bot = (p_right[0], p_right[1] + h)

    draw.polygon([p_left, p_front, p_front_bot, p_left_bot], fill=left_col)
    draw.polygon([p_front, p_right, p_right_bot, p_front_bot], fill=right_col)
    draw.polygon([p_back, p_right, p_front, p_left], fill=top_col)

    if top_trim:
        draw.line([p_back, p_right, p_front, p_left, p_back], fill=top_trim, width=1)

    draw.line([p_back, p_right, p_right_bot, p_front_bot, p_left_bot, p_left, p_back], fill=outline_col, width=1)
    draw.line([p_left, p_front, p_right], fill=outline_col, width=1)
    draw.line([p_front, p_front_bot], fill=outline_col, width=1)


def generate_procedural_surfaces(items_dir: Path) -> list[dict]:
    """Gera mesas, aparador e prateleira de parede em pixel art isométrica 2:1."""
    pal_outline = (78, 64, 59, 255)
    pal_leg = (181, 126, 105, 255)
    pal_leg_dark = (152, 128, 124, 255)
    pal_wood_light = (232, 178, 147, 255)
    pal_wood_right = (181, 126, 105, 255)
    pal_top_cream = (253, 253, 239, 255)
    pal_top_rim = (241, 216, 206, 255)
    pal_shelf_inner = (198, 175, 172, 255)

    specs = []

    # 1. Mesinha de Centro Cozy (76x52)
    img1 = Image.new("RGBA", (76, 52), (0, 0, 0, 0))
    d1 = ImageDraw.Draw(img1)
    # 4 pezinhos de madeira
    for lx, ly in [(36, 16), (56, 26), (16, 26), (36, 36)]:
        _draw_iso_prism(d1, lx, ly, 2, 2, 12, pal_wood_light, pal_wood_light, pal_leg, pal_outline)
    # Tampo isométrico amplo 2:1 (w_right=18 -> 36px, w_left=18 -> 36px, espessura 6px)
    _draw_iso_prism(
        d1, 38, 2, 18, 18, 6,
        pal_top_cream, pal_wood_light, pal_wood_right, pal_outline, top_trim=pal_top_rim,
    )
    img1.save(items_dir / "table_coffee_wood.png")
    specs.append({
        "id": "table_coffee_wood",
        "name": "Mesinha de Centro Cozy",
        "category": "furniture",
        "subCategory": "movel",
        "price": 70,
        "image": "assets/items/table_coffee_wood.png",
        "width": 76,
        "height": 52,
        "wallItem": False,
        "isSurface": True,
        "description": "Mesinha baixa isométrica ideal para apoiar potinhos, plantas ou decorações!",
    })

    # 2. Aparador Cafeteria (72x64)
    img2 = Image.new("RGBA", (72, 64), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(img2)
    # Pés traseiros e base da prateleira inferior
    for lx, ly in [(34, 24), (56, 35), (12, 35), (34, 46)]:
        _draw_iso_prism(d2, lx, ly, 2, 2, 14, pal_wood_light, pal_wood_light, pal_leg_dark, pal_outline)
    # Prateleira inferior sombreada
    _draw_iso_prism(
        d2, 36, 24, 16, 15, 4,
        pal_shelf_inner, pal_wood_light, pal_leg_dark, pal_outline,
    )
    # Pés superiores ligando ao tampo
    for lx, ly in [(34, 11), (56, 22), (12, 22), (34, 33)]:
        _draw_iso_prism(d2, lx, ly, 2, 2, 14, pal_wood_light, pal_wood_light, pal_leg, pal_outline)
    # Tampo superior creme/madeira
    _draw_iso_prism(
        d2, 36, 2, 17, 16, 6,
        pal_top_cream, pal_wood_light, pal_wood_right, pal_outline, top_trim=pal_top_rim,
    )
    img2.save(items_dir / "table_side_wood.png")
    specs.append({
        "id": "table_side_wood",
        "name": "Aparador Cafeteria",
        "category": "furniture",
        "subCategory": "movel",
        "price": 85,
        "image": "assets/items/table_side_wood.png",
        "width": 72,
        "height": 64,
        "wallItem": False,
        "isSurface": True,
        "description": "Bancada de madeira com dois níveis para apoiar itens e velinhas.",
    })

    # 3. Prateleira Flutuante de Parede (68x48) — nativa na parede direita (+2x, +1y)
    img3 = Image.new("RGBA", (68, 48), (0, 0, 0, 0))
    d3 = ImageDraw.Draw(img3)
    # Prancha principal colada na parede direita (longa em w_right=20, rasa em w_left=11)
    # Primeiro desenhamos o suporte (mãos-francesas) visível logo abaixo da prancha
    _draw_iso_prism(d3, 24, 15, 2, 7, 13, pal_wood_light, pal_leg, pal_leg_dark, pal_outline)
    _draw_iso_prism(d3, 46, 26, 2, 7, 13, pal_wood_light, pal_leg, pal_leg_dark, pal_outline)
    _draw_iso_prism(
        d3, 24, 3, 20, 11, 5,
        pal_top_cream, pal_wood_light, pal_wood_right, pal_outline, top_trim=pal_top_rim,
    )
    img3.save(items_dir / "shelf_wall_wood.png")
    specs.append({
        "id": "shelf_wall_wood",
        "name": "Prateleira Flutuante",
        "category": "furniture",
        "subCategory": "movel",
        "price": 55,
        "image": "assets/items/shelf_wall_wood.png",
        "width": 68,
        "height": 48,
        "wallItem": True,
        "isSurface": True,
        "description": "Prateleira de parede que também funciona como apoio para plantinhas e mimos!",
    })

    return specs


def generate_procedural_foods(items_dir: Path) -> list[dict]:
    """Gera comidinhas e bebidas fofas em pixel art (28x28) para a aba de Café."""
    base_pal = {
        "O": (72, 54, 48, 255),      # contorno cozy
        "W": (255, 252, 245, 255),   # branco creme
        "C": (245, 224, 198, 255),   # creme sombra
        "P": (184, 134, 212, 255),   # canudo/detalhe lilás
        "T": (204, 166, 232, 255),   # taro boba
        "t": (162, 122, 196, 255),   # sombra taro
        "B": (58, 42, 46, 255),      # pérolas tapioca / alga nori
        "G": (122, 184, 114, 255),   # matcha verde
        "g": (88, 148, 82, 255),     # sombra matcha
        "L": (220, 242, 214, 255),   # espuma/brilho vidro
        "Y": (232, 170, 96, 255),    # massa dourada / caldo
        "y": (196, 130, 62, 255),    # sombra dourada
        "K": (106, 62, 44, 255),     # chocolate
        "R": (228, 78, 92, 255),     # morango / tigela vermelha
        "r": (176, 48, 62, 255),     # sombra vermelha
        "S": (248, 166, 178, 255),   # bochecha / naruto rosa
        "E": (250, 210, 88, 255),    # gema do ovo
        "I": (118, 214, 248, 255),   # picolé gelo
        "i": (74, 166, 218, 255),    # sombra picolé gelo
        "N": (204, 152, 98, 255),    # palito madeira
    }

    designs = [
        {
            "id": "food_catnip_freeze",
            "name": "Picolé de Catnip Congelado",
            "subCategory": "cafe",
            "price": 45,
            "particle": "❄️",
            "buff": {"type": "streak_freeze", "freezes": 1, "label": "+1 Escudo ❄️"},
            "description": "Protege sua ofensiva diária se você esquecer de abrir 1 dia!",
            "rows": [
                "......OOOOOO......",
                "....OOIIIIIIOO....",
                "...OIIWWIIIIiIO...",
                "..OIIWGGOIIIIiIO..",
                "..OIIGggGIIIIiIO..",
                "..OIIIGGOIIIIiIO..",
                "..OIIIIIIIIIIiIO..",
                "..OIIIIIIIIIIiIO..",
                "..OiiIIIIIIIIiIO..",
                "...OiiiiiiiiiiO...",
                "....OOOOOOOOOO....",
                ".......ONNO.......",
                ".......ONNO.......",
                ".......ONNO.......",
                "........OO........",
            ],
        },
        {
            "id": "coffee_boba",
            "name": "Bubble Tea de Taro",
            "subCategory": "cafe",
            "price": 25,
            "particle": "🧋",
            "buff": {"type": "coin_multiplier", "multiplier": 1.35, "label": "+35% moedas"},
            "description": "Chá cremoso de taro com pérolas doces: +35% de moedas no próximo foco!",
            "rows": [
                ".........OO.......",
                "........OPO.......",
                ".......OPO........",
                "....OOOOOOOOO.....",
                "...OWWWWWWWWWOO...",
                "..OWWWLLLLLWWWWO..",
                ".OOOOOOOOOOOOOOO..",
                "..OTTTTTTTTTTTTO..",
                "..OTWWTTTTTTTTtO..",
                "..OTTTTTTTTTTTtO..",
                "..OTTTtTTTTtTTtO..",
                "...OTTTTTtTTTTtO..",
                "...OBBTTTBBTTTBO..",
                "...OBBBTTBBTTBBO..",
                "....OBBTTTTTBBO...",
                "....OOOOOOOOOO....",
            ],
        },
        {
            "id": "coffee_matcha",
            "name": "Matcha Latte Gelado",
            "subCategory": "cafe",
            "price": 30,
            "particle": "🍵",
            "buff": {"type": "coin_multiplier", "multiplier": 1.4, "label": "+40% moedas"},
            "description": "Matcha cremoso com folhinha de hortelã: +40% de moedas no próximo foco!",
            "rows": [
                ".......OOO........",
                "......OGgGO.......",
                "....OOOOOOOOOO....",
                "...OWWWWWWWWWWO...",
                "...OWWWLLLLWWWO...",
                "..OOOOOOOOOOOOOO..",
                "..OWWWWWWWWWWWWO..",
                "..OLGGGGGGGGGGgO..",
                "..OGGGGGGGGGGGgO..",
                "..OGGGGGgGGGGggO..",
                "...OGGGGGGGGGGgO..",
                "...OGGGGgGGGGggO..",
                "...OggggggggggOO..",
                "....OOOOOOOOOOO...",
            ],
        },
        {
            "id": "food_taiyaki",
            "name": "Taiyaki de Chocolate",
            "subCategory": "comida",
            "price": 16,
            "particle": "🍫",
            "buff": {"type": "treat", "happiness": 30, "label": "Doce Crocante"},
            "description": "Waffle japonês de peixinho quentinho recheado com chocolate.",
            "rows": [
                "........OOOOO.......",
                "......OOYYYYYOO.....",
                "....OOYYYYyyyyyO....",
                "...OYYYYYYYYYyyYO...",
                "..OYYOYyYYYYyYYKKO..",
                "..OYYYYYYYYYyyKKKKO.",
                ".OOYYYYyYYYYyKKKKO..",
                "OYYOYYYYYYyYYYYyyO..",
                ".OO.OOYYYYYYYYyyO...",
                "......OOYYYYyyOO....",
                "........OOOOOO......",
            ],
        },
        {
            "id": "food_strawberry_cake",
            "name": "Shortcake de Morango",
            "subCategory": "comida",
            "price": 22,
            "particle": "🍰",
            "buff": {"type": "treat", "happiness": 35, "label": "Doce Real"},
            "description": "Fatiazinha fofa de bolo com chantilly e morango fresco!",
            "rows": [
                ".........OOO........",
                "........ORWRO.......",
                ".......ORRRRRO......",
                "........OOGGO.......",
                ".....OOOOOOOOOO.....",
                "....OWWWWWWWWWWO....",
                "...OWWWWWWWWWWWO....",
                "..OYYYYYYYYYYYYYO...",
                "..OWWWWWWWWWWWWWO...",
                "..ORRRRRRRRRRRRRO...",
                "..OYYYYYYYYYYYYYO...",
                "..OCCCCCCCCCCCCCO...",
                "...OOOOOOOOOOOOO....",
            ],
        },
        {
            "id": "food_onigiri",
            "name": "Onigiri de Salmão",
            "subCategory": "comida",
            "price": 14,
            "particle": "🍙",
            "buff": {"type": "treat", "happiness": 25, "label": "Lanchinho Zen"},
            "description": "Bolinho de arroz com carinha fofa e algas crocantes!",
            "rows": [
                ".......OOOO.......",
                "......OWWWWO......",
                ".....OWWWWWWO.....",
                "....OWWWWWWWWO....",
                "...OWWWWWWWWWWO...",
                "..OWWOBWWWWBOWWO..",
                "..OWSSWWWWWWSSWO..",
                ".OWWWOBBBBBOWWWWO.",
                ".OWWOBBBBBBBBOWWO.",
                ".OCCOBBBBBBBBOCOO.",
                "..OOOOOOOOOOOOOO..",
            ],
        },
        {
            "id": "food_ramen",
            "name": "Ramen Quentinho",
            "subCategory": "comida",
            "price": 24,
            "particle": "🍜",
            "buff": {"type": "treat", "happiness": 40, "label": "Barriga Quentinha"},
            "description": "Tigela fumegante de lámen com ovo e naruto para recarregar energias!",
            "rows": [
                "....L....L....L...",
                ".....L....L....L..",
                "..OOOOOOOOOOOOOO..",
                ".OYYYOOWWWOYYSSSO.",
                ".OYYYOOWEOOYYYSWO.",
                "OOOOOOOOOOOOOOSSSO",
                "ORRRRRRRRRRRRRRRRO",
                ".ORRRRRWWWWWRRRrO.",
                ".ORRRRRRRRRRRRRrO.",
                "..ORRRRRRRRRRRrO..",
                "...OOOOOOOOOOOO...",
                "....OBBBBBBBBBO...",
            ],
        },
        {
            "id": "food_ice_cream_tub",
            "name": "Pote de Sorvete",
            "subCategory": "cafe",
            "price": 110,
            "particle": "🍨",
            "buff": {"type": "streak_freeze", "freezes": 3, "label": "+3 Escudos ❄️"},
            "description": "Pote cremoso de sorvete: segura até 3 strikes (dias perdidos) da sua Ofensiva Diária!",
            "rows": [
                "....OOOOOOOOOO....",
                "...OWWPPPPPPWWO...",
                "..OPPPPPPPPPPPPO..",
                "..OOOOOOOOOOOOOO..",
                "..OIIIIIIIIIIIIO..",
                "..OIIWWIIIIIIiIO..",
                "..OIIWWWWIIIIiIO..",
                "..OIIPPWWPPIIiIO..",
                "..OIIPPPPPPIIiIO..",
                "..OIIIIIIIIIIiIO..",
                "...OIIiiiiiiiIO...",
                "...OIIIIIIIIiIO...",
                "....OOOOOOOOOO....",
            ],
        },
    ]

    out = []
    for spec in designs:
        rows = spec["rows"]
        mw = max(len(r) for r in rows)
        mh = len(rows)
        if spec["id"] == "food_taiyaki":
            img = Image.new("RGBA", (28, 28), (0, 0, 0, 0))
            ox = (28 - mw) // 2
            oy = (28 - mh) // 2
            _plot_mask(img, rows, base_pal, ox=ox, oy=oy)
        else:
            raw_food = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
            _plot_mask(raw_food, rows, base_pal, ox=0, oy=0)
            scaled_food = raw_food.resize((mw * 2, mh * 2), Image.Resampling.NEAREST)
            size = max(42, mw * 2 + 4, mh * 2 + 4)
            img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            img.paste(scaled_food, ((size - scaled_food.width) // 2, (size - scaled_food.height) // 2), scaled_food)
        dest = items_dir / f"{spec['id']}.png"
        img.save(dest)
        out.append({
            "id": spec["id"],
            "name": spec["name"],
            "category": "food",
            "subCategory": spec["subCategory"],
            "price": spec["price"],
            "image": f"assets/items/{spec['id']}.png",
            "width": img.width,
            "height": img.height,
            "wallItem": False,
            "particle": spec["particle"],
            "buff": spec["buff"],
            "description": spec["description"],
        })
    return out


def generate_procedural_hats(items_dir: Path) -> list[dict]:
    """Gera 10 chapeuzinhos e acessórios em pixel art (24x20) para os gatinhos."""
    pal = {
        "O": (52, 40, 44, 255),      # contorno escuro
        "Y": (248, 200, 62, 255),    # dourado
        "y": (204, 144, 34, 255),    # sombra dourada
        "R": (224, 72, 86, 255),     # vermelho / rubi
        "r": (166, 42, 58, 255),     # sombra vermelha / vinho
        "P": (248, 142, 184, 255),   # rosa fofo
        "p": (208, 92, 138, 255),    # sombra rosa
        "W": (255, 252, 246, 255),   # branco
        "C": (224, 218, 214, 255),   # cinza claro sombra branco
        "V": (106, 74, 172, 255),    # roxo mago
        "v": (74, 48, 128, 255),     # sombra roxa
        "G": (108, 194, 92, 255),    # verde broto
        "g": (68, 142, 62, 255),     # sombra verde
        "K": (58, 56, 68, 255),      # preto elegante cartola/fone
        "k": (96, 94, 112, 255),     # brilho cinza escuro
        "S": (236, 194, 114, 255),   # palha
        "s": (196, 152, 76, 255),    # sombra palha
        "A": (96, 184, 246, 255),    # azul fone lo-fi
        "a": (64, 138, 204, 255),    # sombra azul
        "H": (255, 244, 150, 255),   # brilho auréola
        "B": (146, 214, 252, 255),   # azul celeste / vidro astronauta
        "N": (82, 238, 178, 255),    # verde menta / neon / disco
        "M": (196, 172, 132, 255),   # bege / metal claro / detetive
        "m": (142, 118, 84, 255),    # sombra bege
    }

    hats = [
        {
            "id": "hat_crown",
            "name": "Coroinha Real",
            "price": 65,
            "description": "Coroa dourada com rubis para o soberano do foco!",
            "oy": 9,
            "rows": [
                "...O....O....O....",
                "..OYO..OYO..OYO...",
                "..OYYOOYYYOYYYO...",
                "..OYRYYYYYRYYyO...",
                "..OYYYYYYYYYYyO...",
                "..OyyRyyyyyRyyO...",
                "..OOOOOOOOOOOOO...",
            ],
        },
        {
            "id": "hat_chef",
            "name": "Chapéu Mestre Cuca",
            "price": 45,
            "description": "Para amassar pãozinhos e cozinhar suas tarefas!",
            "oy": 7,
            "rows": [
                "...OOOOOOOOOOOO...",
                "..OWWWWWWWWWWWWO..",
                ".OWWWWCWWWWWCWWWO.",
                ".OWWWWWWWWWWWWWWO.",
                "..OWWCWWWWWWCWWO..",
                "...OWWWWWWWWWWO...",
                "...OCCCCCCCCCCO...",
                "...OWWWWWWWWWWO...",
                "...OOOOOOOOOOOO...",
            ],
        },
        {
            "id": "hat_wizard",
            "name": "Chapéu de Mago",
            "price": 70,
            "description": "Chapéu pontudo estrelado cheio de magia arcana!",
            "oy": 6,
            "rows": [
                ".........OOO......",
                "........OVVVO.....",
                ".......OVYYVO.....",
                "......OVVVVVVO....",
                "......OVVVvVVVO...",
                ".....OVVVYVVVvO...",
                "....OYYYYYYYYYOO..",
                "..OOOVVVVVVVVVOOO.",
                ".OVVVvvvvvvvvvVVVO",
                "..OOOOOOOOOOOOOOO.",
            ],
        },
        {
            "id": "hat_bow_pink",
            "name": "Lacinho Rosa Doce",
            "price": 30,
            "description": "Fita delicada rosa pastel que deixa qualquer gato irresistível.",
            "oy": 9,
            "rows": [
                "..OOOO......OOOO..",
                ".OPPPPO.OO.OPPPPO.",
                ".OPWWpOOPpOOpWWPO.",
                ".OPPPpOPPPPpPPPPO.",
                "..OOOpO.OO.OpOOO..",
                "....OPO....OPO....",
                "....OO......OO....",
            ],
        },
        {
            "id": "hat_sprout",
            "name": "Brotinho da Sorte",
            "price": 25,
            "description": "Duas folhinhas verdes brotando no topo da cabecinha!",
            "oy": 8,
            "rows": [
                "..OOOO......OOOO..",
                ".OGGGGO....OGGGGO.",
                ".OgGGGGO..OGGGGgO.",
                "..OOOOGO..OGOOOO..",
                "......OOGGOO......",
                ".......OGGO.......",
                ".......OGGO.......",
                ".......OOOO.......",
            ],
        },
        {
            "id": "hat_tophat",
            "name": "Cartola Elegante",
            "price": 60,
            "description": "Visual aristocrático com fita vermelha para grandes feitos.",
            "oy": 7,
            "rows": [
                "....OOOOOOOOOO....",
                "....OKkKKKKKKO....",
                "....OKkKKKKKKO....",
                "....OKKKKKKKKO....",
                "....OKKKKKKKKO....",
                "....ORRRRRRRRO....",
                ".OOOKKKKKKKKKKOOO.",
                "OKKKKKKKKKKKKKKKKO",
                ".OOOOOOOOOOOOOOOO.",
            ],
        },
        {
            "id": "hat_straw",
            "name": "Chapéu de Palha",
            "price": 40,
            "description": "Clássico chapéu de aventura com fita vermelha!",
            "oy": 9,
            "rows": [
                "....OOOOOOOOOO....",
                "...OSSSSSSSSSSO...",
                "...OSSsSSSSsSSO...",
                "...ORRRRRRRRRRO...",
                ".OOSSSSSSSSSSSSOO.",
                "OSSSSSSSSssssSSSSO",
                ".OOOOOOOOOOOOOOOO.",
            ],
        },
        {
            "id": "hat_beret",
            "name": "Boina de Artista",
            "price": 50,
            "description": "Boina charmosa estilo parisiense para momentos criativos.",
            "oy": 9,
            "rows": [
                ".......OOOO.......",
                "...OOOORRRROOOO...",
                "..ORRRRRRRRRRRRO..",
                ".ORRRWRRRRRRRRRrO.",
                ".ORRRRRRRRRRRRrrO.",
                "..OrrrrrrrrrrrrO..",
                "...OOOOOOOOOOOO...",
            ],
        },
        {
            "id": "hat_headphones",
            "name": "Headphone Lo-Fi",
            "price": 75,
            "description": "Fones confortáveis para ouvir batidas chill enquanto foca!",
            "oy": 9,
            "rows": [
                "...OOOOOOOOOOOO...",
                "..OAAAAAAAAAAAAO..",
                ".OAaOOOOOOOOOOaAO.",
                ".OAO..........OAO.",
                ".OAO..........OAO.",
                "OKKO..........OKKO",
                "OKaKO........OKaKO",
                "OKKKO........OKKKO",
                ".OO............OO.",
            ],
        },
        {
            "id": "hat_halo",
            "name": "Auréola de Anjinho",
            "price": 80,
            "description": "Flutua brilhando sobre o gatinho mais disciplinado!",
            "oy": 3,
            "rows": [
                "....OOOOOOOOOO....",
                "..OOOHHHHHHHHOOO..",
                ".OHYYOOOOOOOOYYHO.",
                ".OYYYYYYYYYYYYYYO.",
                "..OOOOyyyyyyOOOO..",
            ],
        },
        {
            "id": "hat_cloud_star",
            "name": "Chapéu Nuvem Mágica",
            "price": 0,
            "loginReward": True,
            "description": "Exclusivo de boas-vindas ao conectar sua conta Google na nuvem!",
            "oy": 5,
            "rows": [
                "......OOOOOO......",
                "....OOWWWWWWOO....",
                "..OOWWWWWWWWWWOO..",
                ".OWWWBBBWWYYWWWWO.",
                ".OWWBBBBWYYYYWWWO.",
                ".OWWWWWWWWYYWWWWO.",
                "..OOOOOOOOOOOOOO..",
            ],
        },
        # --- 8 CHAPÉUS SECRETOS (Adote um Dev) ---
        {
            "id": "hat_sec_astronaut",
            "name": "Capacete Astronauta",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: explore galáxias inteiras mantendo o foco!",
            "oy": 4,
            "rows": [
                "...OOOOOOOOOOOO...",
                "..OWWWWWWWWWWWWO..",
                ".OWWOOOOOOOOOOWWO.",
                ".OWOBBBBBBBBBBOWO.",
                ".OWOBWWBBBBBBBOWO.",
                ".OWOBBBBBBBBBBOWO.",
                ".OWWOOOOOOOOOOWWO.",
                "..OCCCCCCCCCCCCO..",
                "...OOOOOOOOOOOO...",
            ],
        },
        {
            "id": "hat_sec_viking",
            "name": "Elmo Viking Miau",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: chifrinhos épicos para conquistar suas metas!",
            "oy": 5,
            "rows": [
                "OO..............OO",
                "OWO...OOOOOO...OWO",
                "OWWO.OMMMMMMO.OWWO",
                ".OWOOMMMMMMMMOOWO.",
                "..OOOMmmYYmmMOOO..",
                "...OMMMMMMMMMMO...",
                "...OYYYYYYYYYYO...",
                "...OOOOOOOOOOOO...",
            ],
        },
        {
            "id": "hat_sec_pirate",
            "name": "Chapéu de Pirata",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: ahoy! Navegando em águas tranquilas de foco!",
            "oy": 6,
            "rows": [
                "....OOOOOOOOOO....",
                "..OOKKKKKKKKKKOO..",
                ".OKKKKKKWWKKKKKKO.",
                ".OKKKKKWWWWKKKKKO.",
                "OOKKKKKKKKKKKKKKOO",
                "OKKKKYYYYYYYYKKKKO",
                ".OOOOOOOOOOOOOOOO.",
            ],
        },
        {
            "id": "hat_sec_flower_crown",
            "name": "Coroa de Flores",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: guirlanda delicada de primavera!",
            "oy": 8,
            "rows": [
                "..OO..OOOO..OO....",
                ".OPPOOYYYYOOPPO...",
                "OPWPOGGGGGGGOWPO..",
                ".OPPOYYYYYYOPPO...",
                "..OOGGGGGGGGOO....",
            ],
        },
        {
            "id": "hat_sec_rgb_ears",
            "name": "Headset Gatinho RGB",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: orelhinhas gamer neon que brilham!",
            "oy": 5,
            "rows": [
                ".OOO..........OOO.",
                "OPNPO........OPNPO",
                "OOKKKOOOOOOOOOKKOO",
                ".OKKKKKKKKKKKKKKO.",
                ".OKAOOOOOOOOOOAKO.",
                "OKNO..........ONKO",
                "OKKO..........OKKO",
                ".OO............OO.",
            ],
        },
        {
            "id": "hat_sec_detective",
            "name": "Chapéu de Detetive",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: elementar, meu caro gatinho!",
            "oy": 7,
            "rows": [
                "....OOOOOOOOOO....",
                "...OMMMMMMMMMMO...",
                "..OMMMMmmmmMMMMO..",
                "..OkkkkkkkkkkkkO..",
                ".OOMMMMMMMMMMMMOO.",
                "OMMMMMMmmmmMMMMMMO",
                ".OOOOOOOOOOOOOOOO.",
            ],
        },
        {
            "id": "hat_sec_party",
            "name": "Chapéu de Festa",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: todo ciclo concluído merece confete!",
            "oy": 4,
            "rows": [
                ".......OOO........",
                "......OYYYO.......",
                ".......OAO........",
                "......OAPAO.......",
                ".....OANAAAO......",
                "....OAAYYAAAO.....",
                "...OAPAAAAAPAO....",
                "..OOOOOOOOOOOOO...",
            ],
        },
        {
            "id": "hat_sec_ufo",
            "name": "Mini Disco Voador",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: abduzido pela concentração absoluta!",
            "oy": 5,
            "rows": [
                ".....OOOOOOOO.....",
                "....OBBBBBBBBO....",
                "....OBWWBBBBBO....",
                "..OOKKKKKKKKKKOO..",
                ".OKKNKKYKKNKKYKKO.",
                "..OOOOOOOOOOOOOO..",
            ],
        },
        {
            "id": "hat_sec_propeller",
            "name": "Boné de Hélice",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: hélice colorida girando ideias brilhantes!",
            "oy": 4,
            "rows": [
                "...OOOOO..OOOOO...",
                "..OYYYYYOOYYYYYO..",
                "........OO........",
                "....OOOOOOOOOO....",
                "...ORRRAAAAGGGO...",
                "..ORRRRAAAAAGGGO..",
                "..OYYYYYYYYYYYYOO.",
                "..OOOOOOOOOOOOOO..",
            ],
        },
        {
            "id": "hat_sec_samurai",
            "name": "Elmo Samurai",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: armadura Kabuto de guerreiro disciplinado!",
            "oy": 5,
            "rows": [
                "..OO..........OO..",
                ".OYYO........OYYO.",
                ".OYYO.OOOOOO.OYYO.",
                "..OOOKKKKKKKKOOO..",
                "..OKKRRRRRRRRKKO..",
                ".OKKKKKKKKKKKKKKO.",
                "OKkOOOOOOOOOOOOkkO",
                "OO..............OO",
            ],
        },
        {
            "id": "hat_sec_cowboy",
            "name": "Chapéu Cowboy",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: xerife das metas no Velho Oeste!",
            "oy": 6,
            "rows": [
                ".....OOOOOOOO.....",
                "....OMMMMMMMMO....",
                "....OMMMmmMMMO....",
                "....OKKRRRRKKO....",
                ".OOOMMMMMMMMMMOOO.",
                "OMMMMMMMMMMMMMMMMO",
                ".OOOOOOOOOOOOOOOO.",
            ],
        },
        {
            "id": "hat_sec_devil_horns",
            "name": "Chifrinhos Travessos",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: um toque travesso para virar a noite focando!",
            "oy": 7,
            "rows": [
                "..OO..........OO..",
                ".ORRO........ORRO.",
                ".ORrRO......ORrRO.",
                "..ORrRO....ORrRO..",
                "...ORRRO..ORRRO...",
                "...OOOOO..OOOOO...",
            ],
        },
        {
            "id": "hat_sec_unicorn",
            "name": "Chifre de Unicórnio",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: magia arco-íris e concentração pura!",
            "oy": 4,
            "rows": [
                ".......OO.......",
                "......OYYO......",
                "......OYHO......",
                ".....OYYHYO.....",
                ".....OYyYYO.....",
                "....OPPYAANO....",
                "....OOOOOOOO....",
            ],
        },
        {
            "id": "hat_sec_grad_cap",
            "name": "Capelo de Formatura",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: PhD em Pomodoro e zero procrastinação!",
            "oy": 6,
            "rows": [
                "...OOOOOOOOOOOO...",
                "..OKKKKKKKKKKKKO..",
                ".OKKKKKKYYKKKKKKO.",
                "..OOOOOKKKYOOOOO..",
                "....OKKKKKYKKO....",
                "....OKKKKKYKKO....",
                ".....OOOOOYYO.....",
                "..........OO......",
            ],
        },
        {
            "id": "hat_sec_coffee_cup",
            "name": "Xícara Equilibrada",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: café quentinho equilibrado sem derramar!",
            "oy": 4,
            "rows": [
                ".....W....W.....",
                "......W..W......",
                "....OOOOOOOO....",
                "...OWWWWWWWWOO..",
                "...OWMMMMMMOWO..",
                "...OWWWWWWWOWO..",
                "....OWWWWWWOO...",
                ".....OOOOOOO....",
            ],
        },
        {
            "id": "hat_sec_sakura_pin",
            "name": "Flor de Sakura",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: florzinha de cerejeira super delicada!",
            "oy": 6,
            "rows": [
                "....OO..OO....",
                "...OPPOOPPO...",
                "..OPPPYYPPPO..",
                "..OPPYYYYPPO..",
                "...OPPOOPPO...",
                "....OOGGGO....",
                "......OOO.....",
            ],
        },
    ]

    out = []
    for spec in hats:
        img = Image.new("RGBA", (24, 20), (0, 0, 0, 0))
        rows = spec["rows"]
        mw = max(len(r) for r in rows)
        ox = (24 - mw) // 2
        oy = spec["oy"]
        _plot_mask(img, rows, pal, ox=ox, oy=oy)
        dest = items_dir / f"{spec['id']}.png"
        img.save(dest)
        entry = {
            "id": spec["id"],
            "name": spec["name"],
            "category": "hats",
            "subCategory": "chapeu",
            "price": spec["price"],
            "image": f"assets/items/{spec['id']}.png",
            "width": 24,
            "height": 20,
            "description": spec["description"],
        }
        if spec.get("secret"):
            entry["secret"] = True
            entry["supporterDrop"] = True
        if spec.get("loginReward"):
            entry["loginReward"] = True
        out.append(entry)
    return out


def generate_secret_furniture(items_dir: Path) -> list[dict]:
    """Gera 8 móveis extras inéditos disponíveis na loja normal do quarto."""
    pal = {
        "O": (48, 36, 40, 255),
        "Y": (248, 202, 68, 255),
        "y": (196, 138, 30, 255),
        "W": (255, 250, 240, 255),
        "K": (42, 40, 56, 255),
        "k": (74, 70, 96, 255),
        "P": (244, 134, 180, 255),
        "p": (198, 84, 134, 255),
        "V": (132, 88, 212, 255),
        "v": (92, 54, 166, 255),
        "A": (92, 204, 248, 255),
        "N": (96, 232, 166, 255),
        "R": (236, 82, 98, 255),
        "M": (176, 120, 82, 255),
        "m": (124, 80, 52, 255),
        "G": (106, 174, 96, 255),
    }

    furns = [
        {
            "id": "furn_sec_gold_trophy",
            "name": "Troféu Foco Dourado",
            "subCategory": "brinquedo",
            "price": 95,
            "wallItem": False,
            "description": "Troféu reluzente de ouro maciço para coroar seu quarto!",
            "size": (32, 36),
            "rows": [
                "....OOOOOOOOOOOO....",
                "..OOYYYYYYYYYYYYOO..",
                ".OYYOYYYYWWYYYYOYYO.",
                ".OYO.OYYYYYYYYO.OYO.",
                ".OYYOOYYYYYYYYOOYYO.",
                "..OO..OYYYYYYO..OO..",
                ".......OYYYYO.......",
                "........OYYO........",
                ".......OYYYYO.......",
                ".....OOMMMMMMOO.....",
                "....OMMMMMMMMMMO....",
                "....OOOOOOOOOOOO....",
            ],
        },
        {
            "id": "furn_sec_arcade",
            "name": "Fliperama Retrô",
            "subCategory": "movel",
            "price": 135,
            "wallItem": False,
            "description": "Máquina arcade isométrica brilhante para relaxar nas pausas!",
            "scale": 4,
            "size": (92, 108),
            "rows": [
                "..........OOOOOO..........",
                "........OOVVVVVVOO........",
                "......OOVVYYYYYYVVOO......",
                ".....OVVYYYYYYYYYYvvO.....",
                ".....OVVOOYYYYYYOOVvO.....",
                ".....OVVOKKKKKKKKOVvO.....",
                ".....OVVOKAAAAAOKOVvO.....",
                ".....OVVOKAANAOKKOVvO.....",
                ".....OVVOKAAAAAOKOVvO.....",
                ".....OVVOKKKKKKKKOVvO.....",
                "....OVVVOOVVVVVVOOvvO.....",
                "...OVVRRVVVVVVVVvvvVO.....",
                "..OVVRRRRVVVVVVVvvvvO.....",
                "..OOVVVVVVVVVVVVvvvvO.....",
                "....OOVVVVVVVVVVvvvvO.....",
                "....OVVVVVVVVVVVvvvvO.....",
                "....OVVVVAAVVVVVvvvvO.....",
                "....OVVVVAAVVVVVvvvvO.....",
                "....OVVVVVVVVVVVvvvvO.....",
                "....OVVVVVVVVVVVvvvvO.....",
                ".....OOVVVVVVVVVvvOO......",
                ".......OOVVVVVVVOO........",
                ".........OOOOOOO..........",
            ],
        },
        {
            "id": "furn_sec_sakura_bonsai",
            "name": "Bonsai Sakura",
            "subCategory": "planta",
            "price": 75,
            "wallItem": False,
            "description": "Cerejeira miniatura em flor super serena para a mesa ou chão.",
            "size": (40, 42),
            "rows": [
                ".....OOOOO..OOOO........",
                "...OOPPPPPPOPPPPO.......",
                "..OPPWPPPPPWWPPPPO......",
                ".OPPPPPPPPppPPPPpPO.....",
                ".OPPPpPPPOOOOPPpPPO.....",
                "..OOOOO.OMMMO.OOOO......",
                "........OMmMO...........",
                ".......OMMmMMO..........",
                "......OMMMmMMO..........",
                "....OOOMMMMMMOOO........",
                "...OKKKKKKKKKKKKO.......",
                "...OKkKKKKKKKKkKO.......",
                "....OOOOOOOOOOOO........",
            ],
        },
        {
            "id": "furn_sec_lava_lamp",
            "name": "Lâmpada de Lava Mística",
            "subCategory": "movel",
            "price": 70,
            "wallItem": False,
            "description": "Luminária retrô relaxante com bolhas roxas e rosas.",
            "size": (28, 42),
            "rows": [
                "......OOOO......",
                ".....OKKKKO.....",
                ".....OVVVVO.....",
                "....OVPPVVVO....",
                "....OVPPVVVO....",
                "...OVVVPPVVVO...",
                "...OVVVVVPPVO...",
                "...OVPPVVVVVO...",
                "....OVVVVVVO....",
                "....OKKKKKKO....",
                "...OKKKKKKKKO...",
                "...OOOOOOOOOO...",
            ],
        },
        {
            "id": "furn_sec_gramophone",
            "name": "Vitrola Lo-Fi",
            "subCategory": "movel",
            "price": 115,
            "wallItem": False,
            "description": "Toca-discos isométrico de vinil com trompete dourado!",
            "size": (48, 52),
            "rows": [
                "............OOOOOO....",
                "..........OOYYYYYYO...",
                ".........OYYWWWWYYYO..",
                "........OYYYYYYYYYYO..",
                "........OYYYYYYOOOO...",
                ".........OOOOYYYO.....",
                ".............OYYO.....",
                "......OOOOOOOOYYOO....",
                "....OOMMMMMMMMOYMMOO..",
                "..OOMMMMKKKKMMMMMMMmO.",
                ".OMMMMMKKKKKKMMMMMmmO.",
                ".OMMMOOOKYYKOOOMMmmmO.",
                ".OMmO..OMMMMOOOMmmmmO.",
                "..OOOMMMMMMMMOOmmmmO..",
                "....OOMMMMMMMOmmmOO...",
                "......OOMMMMMOmOO.....",
                "........OOOOOOO.......",
            ],
        },
        {
            "id": "furn_sec_crystal_ball",
            "name": "Bola de Cristal",
            "subCategory": "halloween",
            "price": 85,
            "wallItem": False,
            "description": "Prevê um futuro cheio de produtividade e boas notas!",
            "size": (32, 34),
            "rows": [
                ".....OOOOOOOO.....",
                "...OOAAAAAAAOOO...",
                "..OAAWWAAAAAAAOO..",
                ".OAAWAAAAAAAAVVOO.",
                ".OAAAAAAAAAAVVVVO.",
                ".OAAAAVVVVVVVVVVO.",
                "..OOAAVVVVVVVVOO..",
                "...OOKKKKKKKKOO...",
                "...OYYYYYYYYYYO...",
                "..OOKKKKKKKKKKOO..",
                "..OOOOOOOOOOOOOO..",
            ],
        },
        {
            "id": "furn_sec_plush_dev",
            "name": "Pelúcia Dev Mascote",
            "subCategory": "brinquedo",
            "price": 90,
            "wallItem": False,
            "description": "Gatinho de pelúcia fofo usando óculos de programador!",
            "size": (34, 34),
            "rows": [
                "..OO........OO..",
                ".OPPO......OPPO.",
                ".OWWOOOOOOOOOWO.",
                "OWWWWWWWWWWWWWWO",
                "OWOKKKOOWOKKKOWO",
                "OWOKAKOOWOKAKOWO",
                "OWWWWWOWOWWWWWWO",
                ".OWWWPPPPPPWWWO.",
                ".OWWWWWWWWWWWWO.",
                "..OOOOOOOOOOOO..",
            ],
        },
        {
            "id": "furn_sec_neon_heart",
            "name": "Placa Neon Coração",
            "subCategory": "quadro",
            "price": 80,
            "wallItem": True,
            "description": "Letreiro neon brilhante rosa em perspectiva para a parede do quarto!",
            "size": (44, 42),
            "rows": [
                "...............OOOOO..",
                "............OOOKKKKKO.",
                ".........OOOKKKKKKKKO.",
                "......OOOKKPPPKKPPPKO.",
                "...OOOKKKPPWWPPPPPPKO.",
                ".OOKKKKKKPWPPPPPPPPKO.",
                ".OKKKKKKKPPPPPPPPpPKO.",
                ".OKKPPPKKKPPPPPPpPPKO.",
                ".OKPPWPPKKKPPPPpPKKKO.",
                ".OKPPPPPPKKKPPpPKKKO..",
                ".OKPPPPPPPPKKpPKKKO...",
                ".OKKPPPPPPPPpPKKKO....",
                "..OKKKPPPPpPPKKKO.....",
                "...OKKKKPPKKKKOO......",
                "....OKKKKKKKOO........",
                ".....OOOOOOO..........",
            ],
        },
    ]

    out = []
    for spec in furns:
        tw, th = spec["size"]
        scale_factor = int(spec.get("scale", 2))
        rows = spec["rows"]
        mw = max(len(r) for r in rows)
        mh = len(rows)
        raw_img = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
        _plot_mask(raw_img, rows, pal, 0, 0)
        scaled = raw_img.resize((mw * scale_factor, mh * scale_factor), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (max(tw, mw * scale_factor + 4), max(th, mh * scale_factor + 4)), (0, 0, 0, 0))
        cx = (canvas.width - scaled.width) // 2
        cy = (canvas.height - scaled.height) // 2
        canvas.paste(scaled, (cx, cy), scaled)
        dest = items_dir / f"{spec['id']}.png"
        canvas.save(dest)
        out.append({
            "id": spec["id"],
            "name": spec["name"],
            "category": "furniture",
            "subCategory": spec["subCategory"],
            "price": spec["price"],
            "image": f"assets/items/{spec['id']}.png",
            "width": canvas.width,
            "height": canvas.height,
            "wallItem": spec["wallItem"],
            "description": spec["description"],
        })
    return out


def prepare_items_and_catalog():
    print("-> Recortando móveis, decorações, comidas e gerando catalog.json...")

    # Definição dos itens recortados de spritesheets
    crop_specs = [
        # --- JANELAS (Furnitures.png) ---
        ("window_cream", "CatPackFree/CatPackFree/Furnitures.png", (19, 0, 80, 95),
         "Janela Brisa Creme", "furniture", "janela", 45, True, "Ilumina o cantinho com luz suave da manhã."),
        ("window_cocoa", "CatPackFree/CatPackFree/Furnitures.png", (115, 0, 176, 95),
         "Janela Madeira Cacau", "furniture", "janela", 50, True, "Moldura aconchegante estilo cafeteria."),
        ("window_grey", "CatPackFree/CatPackFree/Furnitures.png", (19, 96, 80, 191),
         "Janela Nuvem Cinza", "furniture", "janela", 45, True, "Visual moderno e calmo para dias chuvosos."),
        ("window_oak", "CatPackFree/CatPackFree/Furnitures.png", (115, 96, 176, 191),
         "Janela Carvalho Quente", "furniture", "janela", 55, True, "Madeira natural para um quarto acolhedor."),

        # --- CAMAS & CASINHA ---
        ("bed_blue", "CatPackFree/CatPackFree/Furnitures.png", (202, 137, 312, 219),
         "Caminha Nuvem Azul", "furniture", "cama", 60, False, "Caminha macia azul-sereno para sonecas entre ciclos."),
        ("bed_charcoal", "CatPackFree/CatPackFree/Furnitures.png", (329, 137, 439, 219),
         "Caminha Grafite", "furniture", "cama", 60, False, "Caminha escura elegante que combina com tudo."),
        ("bed_berry", "CatPackFree/CatPackFree/Furnitures.png", (202, 235, 312, 317),
         "Caminha Vinho Rosé", "furniture", "cama", 65, False, "Aconchegante e quentinha no tom framboesa."),
        ("bed_moss", "CatPackFree/CatPackFree/Furnitures.png", (329, 235, 439, 317),
         "Caminha Musgo Zen", "furniture", "cama", 65, False, "Inspirada em jardins tranquilos."),
        ("house_cozy", "PetMobileFree/PetMobileFree/FreeDemo.png", (145, 83, 207, 137),
         "Casinha Toca Azul", "furniture", "cama", 95, False, "Uma cabana privativa para o gatinho tirar cochilos."),

        # --- ARRANHADORES, TORRES & ESTANTE ---
        ("post_pink", "CatPackFree/CatPackFree/Furnitures.png", (191, 16, 255, 126),
         "Arranhador Torre Rosé", "furniture", "arranhador", 75, False, "Plataforma alta rosa pastel com corda de sisal."),
        ("post_olive", "CatPackFree/CatPackFree/Furnitures.png", (287, 15, 351, 125),
         "Arranhador Torre Oliva", "furniture", "arranhador", 75, False, "Arranhador alto em tom verde-oliva."),
        ("post_blue", "CatPackFree/CatPackFree/Furnitures.png", (383, 15, 447, 125),
         "Arranhador Torre Azul", "furniture", "arranhador", 75, False, "Poste de sisal clássico com topo azulado."),
        ("scratch_low_white", "CatPackFree/CatPackFree/Furnitures.png", (197, 331, 252, 408),
         "Arranhador Baixo Creme", "furniture", "arranhador", 40, False, "Compacto e fofo para afiar as unhas."),
        ("scratch_low_wood", "CatPackFree/CatPackFree/Furnitures.png", (197, 425, 252, 502),
         "Arranhador Baixo Madeira", "furniture", "arranhador", 40, False, "Base rústica de madeira natural."),
        ("tower_deluxe", "PetMobileFree/PetMobileFree/FreeDemo.png", (204, 3, 256, 111),
         "Mega Torre 4 Andares", "furniture", "arranhador", 140, False, "Torre luxuosa com pompons pendurados!"),
        ("shelf_wood", "CatPackFree/CatPackFree/Furnitures.png", (14, 288, 114, 416),
         "Estante Aconchegante", "furniture", "movel", 110, False, "Prateleira de madeira clara para deixar o quarto organizado."),

        # --- PLANTAS & QUADROS ---
        ("plant_mini", "CatPackFree/CatPackFree/Furnitures.png", (132, 225, 155, 254),
         "Vasinho Suculenta", "furniture", "planta", 25, False, "Pequena plantinha segura para gatinhos."),
        ("plant_tall", "CatPackFree/CatPackFree/Furnitures.png", (140, 298, 185, 406),
         "Planta Ficus Alta", "furniture", "planta", 55, False, "Traz vida e ar fresco para o cantinho de estudos."),
        ("art_stripes", "CatPackFree/CatPackFree/Furnitures.png", (12, 225, 53, 288),
         "Quadro Listras Suaves", "furniture", "quadro", 35, True, "Arte minimalista para decorar a parede."),
        ("art_abstract", "CatPackFree/CatPackFree/Furnitures.png", (79, 225, 117, 287),
         "Quadro Aquarela", "furniture", "quadro", 35, True, "Pintura abstrata em tons terrosos."),
        ("art_plant", "CatPackFree/CatPackFree/Furnitures.png", (460, 194, 499, 283),
         "Quadro Botânico", "furniture", "quadro", 40, True, "Ilustração de plantinha em moldura clara."),
        ("art_cat_portrait", "PetMobileFree/PetMobileFree/FreeDemo.png", (71, 224, 88, 256),
         "Retrato do Mochi", "furniture", "quadro", 30, True, "Quadrinho pendurado do gatinho laranja."),
        ("art_heart_grey", "PetMobileFree/PetMobileFree/FreeDemo.png", (7, 224, 24, 256),
         "Quadrinho Coração", "furniture", "quadro", 25, True, "Demonstra todo o carinho pelo seu pet."),
        ("art_dog_golden", "PetMobileFree/PetMobileFree/FreeDemo.png", (215, 162, 249, 207),
         "Quadro Golden Amigo", "furniture", "quadro", 45, True, "Homenagem ao melhor amigo canino."),

        # --- POTINHOS ---
        ("bowl_food_blue", "CatPackFree/CatPackFree/Furnitures.png", (266, 335, 309, 372),
         "Potinho Ração Azul", "furniture", "potinho", 25, False, "Sempre cheio de croquetes crocantes."),
        ("bowl_water_blue", "CatPackFree/CatPackFree/Furnitures.png", (395, 335, 438, 372),
         "Potinho Água Azul", "furniture", "potinho", 25, False, "Água fresquinha para manter a hidratação."),
        ("bowl_food_purple", "CatPackFree/CatPackFree/Furnitures.png", (265, 400, 308, 437),
         "Potinho Ração Lilás", "furniture", "potinho", 25, False, "Estilo lavanda super fofo."),
        ("bowl_water_mint", "CatPackFree/CatPackFree/Furnitures.png", (460, 463, 503, 500),
         "Potinho Água Menta", "furniture", "potinho", 25, False, "Tom verde-menta refrescante."),

        # --- BRINQUEDOS ---
        ("ball_sage", "CatPackFree/CatPackFree/Furnitures.png", (67, 453, 89, 473),
         "Bolinha Sálvia", "furniture", "brinquedo", 15, False, "Ótima para empurrar pelo piso."),
        ("ball_indigo", "CatPackFree/CatPackFree/Furnitures.png", (132, 454, 154, 474),
         "Bolinha Índigo", "furniture", "brinquedo", 15, False, "Salta macio sem fazer barulho no foco."),
        ("yarn_pink", "PetMobileFree/PetMobileFree/FreeDemo.png", (114, 162, 127, 175),
         "Novelo de Lã Vinho", "furniture", "brinquedo", 20, False, "Para desenrolar nas pausas."),
        ("yarn_blue", "PetMobileFree/PetMobileFree/FreeDemo.png", (130, 178, 143, 191),
         "Novelo de Lã Azul", "furniture", "brinquedo", 20, False, "Fofinho e irresistível para patinhas."),
        ("toy_mouse_grey", "PetMobileFree/PetMobileFree/FreeDemo.png", (35, 104, 62, 120),
         "Ratinho de Pelúcia", "furniture", "brinquedo", 30, False, "O brinquedo favorito para caçar no intervalo."),
        ("toy_wand", "PetMobileFree/PetMobileFree/FreeDemo.png", (210, 115, 253, 129),
         "Varinha Guizo", "furniture", "brinquedo", 30, False, "Varinha de madeira clássica."),
        ("toy_bowtie", "CatPackFree/CatPackFree/Furnitures.png", (132, 427, 156, 439),
         "Brinquedo Ossinho/Laço", "furniture", "brinquedo", 20, False, "Pequeno mimo decorativo."),

        # --- HALLOWEEN DECOR ---
        ("decor_skull", "CatPackHalloweenFREE/CatPackHalloweenFREE/EvilCatItems.png", (40, 6, 57, 24),
         "Caveirinha Gótica", "furniture", "halloween", 45, False, "Toque misterioso para o quarto noturno."),
        ("decor_candle", "CatPackHalloweenFREE/CatPackHalloweenFREE/EvilCatItems.png", (44, 41, 51, 53),
         "Velinha Mística", "furniture", "halloween", 30, False, "Ilumina sessões noturnas de estudo."),
        ("toy_evil_mouse", "CatPackHalloweenFREE/CatPackHalloweenFREE/EvilCatItems.png", (0, 7, 32, 29),
         "Rato Sombrio", "furniture", "halloween", 40, False, "Ratinho de pelúcia edição Halloween."),

        # --- COMIDINHAS & CAFÉ (consumíveis / buffs) ---
        ("coffee_latte", "UiCozyFree.png/UiCozyFree.png", (134, 41, 170, 71),
         "Café Latte Art", "food", "cafe", 20, False, "Xícara quentinha: dá +25% de moedas no próximo ciclo de Foco!"),
        ("coffee_moka", "UiCozyFree.png/UiCozyFree.png", (196, 27, 250, 93),
         "Cafeteira Italiana Moka", "food", "cafe", 35, False, "Café reforçado: dá +50% de moedas no próximo ciclo de Foco!"),
        ("food_fish_plate", "PetMobileFree/PetMobileFree/FreeDemo.png", (133, 4, 189, 32),
         "Prato de Peixinho", "food", "comida", 15, False, "Alimenta o gatinho na hora e deixa ele super feliz!"),
        ("food_kibble_bag", "PetMobileFree/PetMobileFree/FreeDemo.png", (0, 99, 32, 142),
         "Ração Gourmet", "food", "comida", 18, False, "Enche a barriguinha e rende muito ronronar."),
        ("food_can_salmon", "PetMobileFree/PetMobileFree/FreeDemo.png", (72, 151, 90, 169),
         "Latinha de Salmão", "food", "comida", 12, False, "Petisco cremoso para comemorar uma pausa."),
        ("food_drumstick", "PetMobileFree/PetMobileFree/FreeDemo.png", (4, 181, 28, 204),
         "Franguinho Assado", "food", "comida", 15, False, "Lanche especial compartilhado com os pets."),
    ]

    items_catalog = []
    for item_id, src_rel, rect, name, cat, sub, price, wall_item, desc in crop_specs:
        dest = ITEMS_DIR / f"{item_id}.png"
        clear_rects = [(0, 100, 6, 108)] if item_id == "tower_deluxe" else None
        w, h = crop_save(src_rel, rect, dest, clear_corner_rects=clear_rects)
        if item_id in ("food_can_salmon", "food_drumstick"):
            with Image.open(dest) as fimg:
                resized = fimg.resize((fimg.width * 2, fimg.height * 2), Image.Resampling.NEAREST)
                resized.save(dest)
                w, h = resized.size
        elif item_id == "food_fish_plate":
            with Image.open(dest) as fimg:
                resized = fimg.resize((round(fimg.width * 1.4), round(fimg.height * 1.4)), Image.Resampling.NEAREST)
                resized.save(dest)
                w, h = resized.size
        entry = {
            "id": item_id,
            "name": name,
            "category": cat,
            "subCategory": sub,
            "price": price,
            "image": f"assets/items/{item_id}.png",
            "width": w,
            "height": h,
            "wallItem": wall_item,
            "description": desc,
        }
        if item_id == "coffee_latte":
            entry["buff"] = {"type": "coin_multiplier", "multiplier": 1.25, "label": "+25% moedas"}
        elif item_id == "coffee_moka":
            entry["buff"] = {"type": "coin_multiplier", "multiplier": 1.5, "label": "+50% moedas"}
        elif cat == "food":
            entry["buff"] = {"type": "treat", "happiness": 25, "label": "Carinho & Energia"}
        if item_id == "shelf_wood":
            entry["isSurface"] = True
        items_catalog.append(entry)

    # Mesas e prateleira de parede geradas em código (suportam itens em cima!)
    items_catalog.extend(generate_procedural_surfaces(ITEMS_DIR))
    # Comidinhas e bebidas extras em pixel art
    items_catalog.extend(generate_procedural_foods(ITEMS_DIR))
    # 8 móveis secretos exclusivos de drops ("Adote um Dev")
    items_catalog.extend(generate_secret_furniture(ITEMS_DIR))

    # Item animado especial de Halloween: Olho no Pote
    items_catalog.append({
        "id": "decor_eye_jar",
        "name": "Pote Mágico Animado",
        "category": "furniture",
        "subCategory": "halloween",
        "price": 120,
        "image": "assets/sprites/decor_eye_jar.png",
        "width": 128,
        "height": 128,
        "animated": True,
        "frames": 17,
        "frameWidth": 128,
        "frameHeight": 128,
        "fps": 6,
        "wallItem": False,
        "description": "Frasco animado de Halloween que observa seu foco!",
    })

    # --- GATINHOS & SKINS ---
    cats_catalog = [
        {
            "id": "cat_mochi",
            "name": "Mochi Laranja",
            "category": "cats",
            "subCategory": "skin",
            "price": 0,
            "starter": True,
            "description": "Seu companheiro inicial! Abana o rabo e entra em caixinhas.",
            "animations": {
                "idle": {"src": "assets/sprites/cat_mochi_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_mochi_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "box": {"src": "assets/sprites/cat_mochi_box.png", "frames": 4, "fw": 32, "fh": 32, "fps": 4},
                "sleep": {"src": "assets/sprites/cat_cream_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_cream_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_cream_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_mochi_box",
            "name": "Mochi na Caixa",
            "category": "cats",
            "subCategory": "skin",
            "price": 45,
            "description": "Trabalha com você escondido dentro da caixa de papelão favorita.",
            "animations": {
                "idle": {"src": "assets/sprites/cat_mochi_box.png", "frames": 4, "fw": 32, "fh": 32, "fps": 4},
                "walk": {"src": "assets/sprites/cat_mochi_box_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_curled_sleep.png", "frames": 1, "fw": 43, "fh": 32, "fps": 1},
                "cheer": {"src": "assets/sprites/cat_cream_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_cream_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_pochi_cream",
            "name": "Pochi Creme",
            "category": "cats",
            "subCategory": "skin",
            "price": 75,
            "description": "Gatinho creme super expressivo: tira sonecas zZz e vibra quando você conclui!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_cream_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 3},
                "walk": {"src": "assets/sprites/cat_cream_walk.png", "frames": 4, "fw": 64, "fh": 64, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_cream_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_cream_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 6},
                "cry": {"src": "assets/sprites/cat_cream_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 5},
            },
            "previewScale": 1.15,
        },
        {
            "id": "cat_frajola",
            "name": "Frajola Tuxedo",
            "category": "cats",
            "subCategory": "skin",
            "price": 90,
            "description": "Elegante de smoking preto e branco, ótimo parceiro de produtividade.",
            "animations": {
                "idle": {"src": "assets/sprites/cat_tuxedo_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 3},
                "walk": {"src": "assets/sprites/cat_tuxedo_walk.png", "frames": 4, "fw": 64, "fh": 64, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_tuxedo_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_tuxedo_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 6},
                "cry": {"src": "assets/sprites/cat_tuxedo_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 5},
            },
            "previewScale": 1.15,
        },
        {
            "id": "cat_white",
            "name": "Neve Olhos Azuis",
            "category": "cats",
            "subCategory": "skin",
            "price": 100,
            "description": "Gatinho branquinho de olhos azuis brilhantes.",
            "animations": {
                "idle": {"src": "assets/sprites/cat_white_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 3},
                "walk": {"src": "assets/sprites/cat_white_walk.png", "frames": 4, "fw": 64, "fh": 64, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_curled_sleep.png", "frames": 1, "fw": 43, "fh": 32, "fps": 1},
                "cheer": {"src": "assets/sprites/cat_white_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 6},
                "cry": {"src": "assets/sprites/cat_cream_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 5},
            },
            "previewScale": 1.15,
        },
        {
            "id": "cat_dracula",
            "name": "Conde Miau-cula",
            "category": "cats",
            "subCategory": "skin",
            "price": 120,
            "description": "Capa de vampiro e presinhas fofas para estudar até de madrugada!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_dracula.png", "frames": 6, "fw": 32, "fh": 32, "fps": 5},
                "walk": {"src": "assets/sprites/cat_dracula.png", "frames": 6, "fw": 32, "fh": 32, "fps": 8},
                "sleep": {"src": "assets/sprites/cat_tuxedo_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_dracula.png", "frames": 6, "fw": 32, "fh": 32, "fps": 8},
                "cry": {"src": "assets/sprites/cat_vampire_angry.png", "frames": 9, "fw": 32, "fh": 32, "fps": 7},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_witch",
            "name": "Bruxinho Voador",
            "category": "cats",
            "subCategory": "skin",
            "price": 150,
            "description": "Flutua na vassoura mágica com chapéu de bruxa perto do seu relógio!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_witch.png", "frames": 6, "fw": 48, "fh": 64, "fps": 6},
                "walk": {"src": "assets/sprites/cat_witch.png", "frames": 6, "fw": 48, "fh": 64, "fps": 7},
                "sleep": {"src": "assets/sprites/cat_curled_sleep.png", "frames": 1, "fw": 43, "fh": 32, "fps": 1},
                "cheer": {"src": "assets/sprites/cat_witch.png", "frames": 6, "fw": 48, "fh": 64, "fps": 9},
                "cry": {"src": "assets/sprites/cat_cream_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 5},
            },
            "previewScale": 1.45,
        },
        {
            "id": "cat_evil_box",
            "name": "Sombra na Caixa",
            "category": "cats",
            "subCategory": "skin",
            "price": 110,
            "description": "Gatinho preto de olhos vermelhos vigiando sua produtividade da caixa.",
            "animations": {
                "idle": {"src": "assets/sprites/cat_evil_box.png", "frames": 12, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_evil_box.png", "frames": 12, "fw": 32, "fh": 32, "fps": 8},
                "sleep": {"src": "assets/sprites/cat_tuxedo_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_evil_box.png", "frames": 12, "fw": 32, "fh": 32, "fps": 10},
                "cry": {"src": "assets/sprites/cat_tuxedo_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 5},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_zombie",
            "name": "Gato Zumbi Guloso",
            "category": "cats",
            "subCategory": "skin",
            "price": 135,
            "description": "Ama lanchinhos no potinho e não larga o foco por nada!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_zombie_eating.png", "frames": 15, "fw": 32, "fh": 32, "fps": 7},
                "walk": {"src": "assets/sprites/cat_zombie_eating.png", "frames": 15, "fw": 32, "fh": 32, "fps": 8},
                "sleep": {"src": "assets/sprites/cat_tuxedo_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_zombie_eating.png", "frames": 15, "fw": 32, "fh": 32, "fps": 10},
                "cry": {"src": "assets/sprites/cat_tuxedo_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 5},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_dino",
            "name": "Dino Sem Wi-Fi",
            "category": "cats",
            "subCategory": "skin",
            "price": 0,
            "starter": True,
            "description": "Caiu a internet? Esse 'gatinho' pré-histórico pula cactos de procrastinação com você!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_dino_idle.png", "frames": 8, "fw": 32, "fh": 32, "fps": 7},
                "walk": {"src": "assets/sprites/cat_dino_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 8},
                "sleep": {"src": "assets/sprites/cat_dino_sleep.png", "frames": 4, "fw": 32, "fh": 32, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_dino_cheer.png", "frames": 4, "fw": 32, "fh": 32, "fps": 7},
                "cry": {"src": "assets/sprites/cat_dino_cry.png", "frames": 4, "fw": 32, "fh": 32, "fps": 5},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_dino_green",
            "name": "Dino Verde Esmeralda",
            "category": "cats",
            "subCategory": "skin",
            "price": 85,
            "description": "O clássico dinossaurinho pré-histórico em verde esmeralda vibrante!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_dino_green_idle.png", "frames": 8, "fw": 32, "fh": 32, "fps": 7},
                "walk": {"src": "assets/sprites/cat_dino_green_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 8},
                "sleep": {"src": "assets/sprites/cat_dino_green_sleep.png", "frames": 4, "fw": 32, "fh": 32, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_dino_green_cheer.png", "frames": 4, "fw": 32, "fh": 32, "fps": 7},
                "cry": {"src": "assets/sprites/cat_dino_green_cry.png", "frames": 4, "fw": 32, "fh": 32, "fps": 5},
            },
            "previewScale": 2.0,
        },
        # --- NOVAS PELAGENS COLORIDAS (Loja Normal) ---
        {
            "id": "cat_sakura",
            "name": "Mochi Sakura Rosa",
            "category": "cats",
            "subCategory": "skin",
            "price": 95,
            "description": "Pelagem cor de flor de cerejeira com orelhinhas doces!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_sakura_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_sakura_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_sakura_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_sakura_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_sakura_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_blueberry",
            "name": "Mochi Azul Gelo",
            "category": "cats",
            "subCategory": "skin",
            "price": 95,
            "description": "Tom azul-celeste suave e tranquilo para dias focados.",
            "animations": {
                "idle": {"src": "assets/sprites/cat_blueberry_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_blueberry_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_blueberry_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_blueberry_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_blueberry_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_matcha",
            "name": "Mochi Verde Matcha",
            "category": "cats",
            "subCategory": "skin",
            "price": 100,
            "description": "Gatinho verde-menta zen inspirado em casas de chá!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_matcha_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_matcha_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_matcha_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_matcha_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_matcha_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_lavender",
            "name": "Mochi Lavanda",
            "category": "cats",
            "subCategory": "skin",
            "price": 110,
            "description": "Pelagem lilás sonhadora cheia de serenidade.",
            "animations": {
                "idle": {"src": "assets/sprites/cat_lavender_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_lavender_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_lavender_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_lavender_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_lavender_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        # --- 8 GATINHOS & DINOS SECRETOS (Adote um Dev) ---
        {
            "id": "cat_sec_galaxy",
            "name": "Mochi Galáxia",
            "category": "cats",
            "subCategory": "skin",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: pelagem cósmica roxo-anil cheia de mistério!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_sec_galaxy_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_sec_galaxy_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_sec_galaxy_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_sec_galaxy_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_sec_galaxy_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_sec_gold",
            "name": "Mochi Dourado",
            "category": "cats",
            "subCategory": "skin",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: reluzente como ouro puro!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_sec_gold_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_sec_gold_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_sec_gold_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_sec_gold_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_sec_gold_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_sec_cyber",
            "name": "Mochi Cyber Neon",
            "category": "cats",
            "subCategory": "skin",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: brilho ciano e magenta futurista!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_sec_cyber_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_sec_cyber_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_sec_cyber_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_sec_cyber_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_sec_cyber_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_sec_sunset",
            "name": "Mochi Pôr-do-Sol",
            "category": "cats",
            "subCategory": "skin",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: coral quente com reflexos dourados do entardecer!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_sec_sunset_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_sec_sunset_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_sec_sunset_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_sec_sunset_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_sec_sunset_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_sec_cocoa",
            "name": "Mochi Cacau Quente",
            "category": "cats",
            "subCategory": "skin",
            "price": 105,
            "description": "Marrom achocolatado com patinhas de creme quentinho!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_sec_cocoa_idle.png", "frames": 10, "fw": 32, "fh": 32, "fps": 6},
                "walk": {"src": "assets/sprites/cat_sec_cocoa_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 6},
                "sleep": {"src": "assets/sprites/cat_sec_cocoa_sleep.png", "frames": 4, "fw": 64, "fh": 64, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_sec_cocoa_cheer.png", "frames": 2, "fw": 64, "fh": 64, "fps": 5},
                "cry": {"src": "assets/sprites/cat_sec_cocoa_cry.png", "frames": 4, "fw": 64, "fh": 64, "fps": 4},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_sec_dino_pink",
            "name": "Dino Algodão-Doce",
            "category": "cats",
            "subCategory": "skin",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: Dino pré-histórico cor-de-rosa super fofo!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_sec_dino_pink_idle.png", "frames": 8, "fw": 32, "fh": 32, "fps": 7},
                "walk": {"src": "assets/sprites/cat_sec_dino_pink_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 8},
                "sleep": {"src": "assets/sprites/cat_sec_dino_pink_sleep.png", "frames": 4, "fw": 32, "fh": 32, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_sec_dino_pink_cheer.png", "frames": 4, "fw": 32, "fh": 32, "fps": 7},
                "cry": {"src": "assets/sprites/cat_sec_dino_pink_cry.png", "frames": 4, "fw": 32, "fh": 32, "fps": 5},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_sec_dino_gold",
            "name": "Dino Rei Dourado",
            "category": "cats",
            "subCategory": "skin",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: T-Rex dourado lendário dos mestres do foco!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_sec_dino_gold_idle.png", "frames": 8, "fw": 32, "fh": 32, "fps": 7},
                "walk": {"src": "assets/sprites/cat_sec_dino_gold_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 8},
                "sleep": {"src": "assets/sprites/cat_sec_dino_gold_sleep.png", "frames": 4, "fw": 32, "fh": 32, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_sec_dino_gold_cheer.png", "frames": 4, "fw": 32, "fh": 32, "fps": 7},
                "cry": {"src": "assets/sprites/cat_sec_dino_gold_cry.png", "frames": 4, "fw": 32, "fh": 32, "fps": 5},
            },
            "previewScale": 2.0,
        },
        {
            "id": "cat_sec_dino_purple",
            "name": "Dino Ametista",
            "category": "cats",
            "subCategory": "skin",
            "price": 0,
            "secret": True,
            "supporterDrop": True,
            "description": "Brinde Secreto: Dino místico em roxo ametista brilhante!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_sec_dino_purple_idle.png", "frames": 8, "fw": 32, "fh": 32, "fps": 7},
                "walk": {"src": "assets/sprites/cat_sec_dino_purple_walk.png", "frames": 4, "fw": 32, "fh": 32, "fps": 8},
                "sleep": {"src": "assets/sprites/cat_sec_dino_purple_sleep.png", "frames": 4, "fw": 32, "fh": 32, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_sec_dino_purple_cheer.png", "frames": 4, "fw": 32, "fh": 32, "fps": 7},
                "cry": {"src": "assets/sprites/cat_sec_dino_purple_cry.png", "frames": 4, "fw": 32, "fh": 32, "fps": 5},
            },
            "previewScale": 2.0,
        },
    ]

    # --- CHAPÉUS & ACESSÓRIOS ---
    hats_catalog = generate_procedural_hats(ITEMS_DIR)

    # --- AMIGOS PETS (passeiam juntos no quarto!) ---
    pets_catalog = [
        {
            "id": "pet_bunny",
            "name": "Coelhinho Saltitante",
            "category": "pets",
            "subCategory": "amigo",
            "price": 85,
            "description": "Um amiguinho coelho que fica pulando alegremente pelo quarto!",
            "src": "assets/sprites/pet_bunny.png",
            "frames": 8,
            "fw": 32,
            "fh": 32,
            "fps": 7,
            "scale": 1.25,
        },
        {
            "id": "pet_golden",
            "name": "Golden Retriever",
            "category": "pets",
            "subCategory": "amigo",
            "price": 130,
            "description": "Cachorrinho dócil e leal que passeia fazendo companhia para o seu gato.",
            "src": "assets/sprites/pet_golden.png",
            "frames": 10,
            "fw": 64,
            "fh": 64,
            "fps": 7,
            "scale": 1.25,
        },
        {
            "id": "pet_zombie_hand",
            "name": "Mãozinha Amiga",
            "category": "pets",
            "subCategory": "amigo",
            "price": 95,
            "description": "Bônus divertido de Halloween que caminha dando apoio moral!",
            "src": "assets/sprites/pet_zombie_hand.png",
            "frames": 25,
            "fw": 32,
            "fh": 32,
            "fps": 9,
            "scale": 2.0,
        },
    ]

    premium_only_ids = {
        "cat_mochi_box",
        "cat_evil_box",
        "cat_zombie",
        "cat_witch",
        "pet_bunny",
        "pet_golden",
        "pet_zombie_hand",
        "coffee_moka",
        "food_ramen",
        "food_onigiri",
        "food_ice_cream_tub",
    }
    for col in (items_catalog, cats_catalog, pets_catalog):
        for entry in col:
            if entry.get("id") in premium_only_ids:
                entry["premiumOnly"] = True

    catalog = {
        "items": items_catalog,
        "cats": cats_catalog,
        "pets": pets_catalog,
        "hats": hats_catalog,
    }
    catalog_path = OUT / "catalog.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    print(
        f"-> Catálogo gerado em {catalog_path}: "
        f"{len(items_catalog)} itens, {len(cats_catalog)} gatinhos, {len(pets_catalog)} amigos pets, {len(hats_catalog)} chapéus."
    )


def main():
    ensure_dirs()
    prepare_sprites()
    prepare_ui()
    prepare_items_and_catalog()
    print("Tudo pronto em public/assets/!")


if __name__ == "__main__":
    main()

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


def generate_dino_sprites(sprites_dir: Path):
    """Gera as sprite sheets do Dino Sem Wi-Fi (idle, sleep, cheer, cry)."""
    pal = {
        "O": (44, 42, 48, 255),      # contorno escuro legível em tema claro e escuro
        "B": (88, 92, 98, 255),      # corpo cinza clássico
        "L": (132, 138, 146, 255),   # barriga/highlight
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
    idle_strip.save(sprites_dir / "cat_dino_idle.png")

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
    sleep_strip.save(sprites_dir / "cat_dino_sleep.png")

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
    cheer_strip.save(sprites_dir / "cat_dino_cheer.png")

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
    cry_strip.save(sprites_dir / "cat_dino_cry.png")


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
    generate_dino_sprites(SPRITES_DIR)

    # Faixas verticais de FreeCats.png (Pochi Creme): cry (4), cheer (2), sleep (4)
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats.png", 0, 64, 4, 64, 64, "cat_cream_cry.png")
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats.png", 64, 128, 2, 64, 64, "cat_cream_cheer.png")
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats.png", 128, 192, 4, 64, 64, "cat_cream_sleep.png")

    # Faixas verticais de FreeCats2.png (Frajola Tuxedo): 256x188
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats2.png", 0, 60, 4, 64, 64, "cat_tuxedo_cry.png")
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats2.png", 60, 122, 2, 64, 64, "cat_tuxedo_cheer.png")
    build_uniform_strip("PetMobileFree/PetMobileFree/FreeCats2.png", 122, 188, 4, 64, 64, "cat_tuxedo_sleep.png")

    # Gatinho Branco comemorando de RetroCatsFree.png (row 1: y=72..133)
    build_uniform_strip("RetroCatsFree.png/RetroCatsFree.png", 72, 133, 2, 64, 64, "cat_white_cheer.png")

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
    }

    designs = [
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
    ]

    out = []
    for spec in designs:
        img = Image.new("RGBA", (28, 28), (0, 0, 0, 0))
        rows = spec["rows"]
        mw = max(len(r) for r in rows)
        mh = len(rows)
        ox = (28 - mw) // 2
        oy = (28 - mh) // 2
        _plot_mask(img, rows, base_pal, ox=ox, oy=oy)
        dest = items_dir / f"{spec['id']}.png"
        img.save(dest)
        out.append({
            "id": spec["id"],
            "name": spec["name"],
            "category": "food",
            "subCategory": spec["subCategory"],
            "price": spec["price"],
            "image": f"assets/items/{spec['id']}.png",
            "width": 28,
            "height": 28,
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
        out.append({
            "id": spec["id"],
            "name": spec["name"],
            "category": "hats",
            "subCategory": "chapeu",
            "price": spec["price"],
            "image": f"assets/items/{spec['id']}.png",
            "width": 24,
            "height": 20,
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
            "price": 115,
            "description": "Caiu a internet? Esse 'gatinho' pré-histórico pula cactos de procrastinação com você!",
            "animations": {
                "idle": {"src": "assets/sprites/cat_dino_idle.png", "frames": 8, "fw": 32, "fh": 32, "fps": 7},
                "sleep": {"src": "assets/sprites/cat_dino_sleep.png", "frames": 4, "fw": 32, "fh": 32, "fps": 3},
                "cheer": {"src": "assets/sprites/cat_dino_cheer.png", "frames": 4, "fw": 32, "fh": 32, "fps": 7},
                "cry": {"src": "assets/sprites/cat_dino_cry.png", "frames": 4, "fw": 32, "fh": 32, "fps": 5},
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

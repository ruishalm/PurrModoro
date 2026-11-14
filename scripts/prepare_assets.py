"""
Processa, recorta e cataloga todos os assets pixel art da pasta assets/
para public/assets/ (sprites, itens de decoração, UI e catalog.json).
"""

import json
import os
import shutil
from pathlib import Path
from PIL import Image

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
        tray.save(UI_DIR / "tray_icon.ico", format="ICO", sizes=[(32, 32), (16, 16)])

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
        items_catalog.append(entry)

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
            "previewScale": 1.25,
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
    ]

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
            "scale": 2.0,
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
    }
    catalog_path = OUT / "catalog.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    print(
        f"-> Catálogo gerado em {catalog_path}: "
        f"{len(items_catalog)} itens, {len(cats_catalog)} gatinhos, {len(pets_catalog)} amigos pets."
    )


def main():
    ensure_dirs()
    prepare_sprites()
    prepare_ui()
    prepare_items_and_catalog()
    print("Tudo pronto em public/assets/!")


if __name__ == "__main__":
    main()

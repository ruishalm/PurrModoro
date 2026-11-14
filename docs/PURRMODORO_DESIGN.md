# PurrModoro — Documento de Design e Arquitetura 🐾🍅

## 1. Visão Geral do Projeto

O **PurrModoro** é um *Idle Companion* de desktop para Windows que combina um **Timer Pomodoro 100% regulável** com a decoração de um **quartinho isométrico 2:1** para o seu gatinho (e amigos pets).

Enquanto você trabalha, o gatinho passeia em uma barrinha discreta e transparente logo acima do relógio do Windows. Ao concluir cada task de foco, você recebe moedinhas proporcionais à duração da task para desbloquear e organizar móveis, janelas, quadros, fantasias, amigos pets e cafézinhos.

---

## 2. Experiência em Modo Duplo (Dual-Mode)

### 2.1 Modo Compacto (Perto do Relógio)

- **Janela**: Sem bordas (`frame: false`), fundo 100% transparente (`transparent: true`), sempre visível sobre outras janelas (`alwaysOnTop: true`).
- **Posicionamento**: Ancorada automaticamente no canto inferior direito (`workArea`), logo acima da barra de tarefas/relógio do Windows. Pode ser arrastada para qualquer outro ponto da tela.
- **Barrinha Fina (`6px`)**: Plataforma minimalista de apoio para dar a sensação do gatinho andando sobre a própria barra do Windows.
- **Painel Colapsável (`242×158` ↔ `396×172`)**:
  - Botão **`▸`** recolhe o HUD completo e reduz a janela deixando praticamente **apenas o gatinho** na barrinha fina e uma **micro-pílula** discreta com relógio, Play/Pause, `🏠` Quarto e `◂` Expandir.
- **Comportamento & Carinho**:
  - Alterna entre andar (*walk*), esperar (*idle*) e tirar soneca (*sleep*).
  - Clicar no gatinho dispara ronronar, corações em pixel art e falinhas contextuais.

### 2.2 Modo Expandido (`940×650` — Quartinho & Lojinha)

- Abre automaticamente ao fim de um ciclo para comemorar com chuva de moedas, ou sob demanda via botão **`🏠` / `$`**.
- **Diorama Isométrico 2:1 (`#roomBgCanvas`)**:
  - Canvas pixel-art dedicado (`260×260`, `imageSmoothingEnabled: false`) com projeção exata 2:1, parede esquerda mais iluminada, parede direita levemente sombreada, rodapé inclinado, piso ladrilhado com tapetinho central e borda 3D da maquete.
  - **4 Temas**: *Cozy*, *Pastel*, *Bamboo* e *Noite (Halloween com lua crescente e estrelas)*.
- **Drag & Drop Livre & Perspectiva Inteligente**:
  - Itens de chão e pets são limitados matematicamente ao losango isométrico do piso.
  - Janelas e quadros são limitados às duas paredes e **espelham automaticamente** (`scaleX(-1)`) conforme o lado da parede onde o usuário soltar (`WALL_NATIVE_SIDE`).
  - Barra flutuante para espelhar manualmente (`↔ Virar`), alterar ordem (`⬆ / ⬇`) e guardar (`📦 Guardar`).

---

## 3. Mecânicas do Pomodoro Regulável & Economia

### 3.1 Ciclos e Regulação Livre

- **Ajuste ao vivo (`-5m`, `-1m`, `+1m`, `+5m`)**: No modo expandido e direto no widget compacto (`-` / `+`, segurando `Shift` para `±5m`).
- **Configurações persistidas em disco (`userData/purrmodoro-save.json` + `localStorage`)**:
  - **Foco**: `1` a `180` minutos (padrão `25` min)
  - **Pausa Curta**: `1` a `60` minutos (padrão `5` min)
  - **Pausa Longa**: `1` a `90` minutos (padrão `15` min)
  - **Ciclos até Pausa Longa**: `2` a `8` ciclos (padrão `4`)
- **Presets**: *Clássico (25/5/15)*, *Sprint (15/3/10)*, *Deep Work (50/10/20)* e *Estudo Leve (20/5/15)*.

### 3.2 Recompensa de Moedas por Tempo de Task

| Fase | Regra | Recompensa |
| :--- | :--- | :--- |
| **Foco (1–24 min)** | `2 moedas × min` | `5m = 10` • `15m = 30` • `20m = 40` |
| **Foco Completo (25–44 min)** | `2 × min + round(0.2 × min)` | `25m = 55` • `30m = 66` |
| **Foco Profundo (45–180 min)** | `2 × min + round(0.4 × min)` | `45m = 108` • `50m = 120` • `60m = 144` |
| **Pausa Curta** | `1 × min` | `5m = 5` • `10m = 10` |
| **Pausa Longa** | `max(2, round(min × 1.2))` | `15m = 18` • `20m = 24` |

- **Bônus de Café**: *Café Latte (`+25%`)* e *Cafeteira Moka (`+50%`)* multiplicam a recompensa do próximo ciclo de foco concluído.
- **Desistência**: Clicar em *Desistir* durante um foco ativo faz o gatinho chorar (`cry`) e reinicia o foco sem moedas.

---

## 4. Pipeline de Assets & Instalador

- **`scripts/prepare_assets.py`**: Processa os sprites originais em `Assets/` para `public/assets/` (`sprites/`, `items/`, `ui/` incluindo `tray_icon.ico`, e manifesto `catalog.json` com 45 itens, 9 gatos e 3 amigos pets).
- **Instalador Simples (`install_purrmodoro.bat` / `scripts/install_shortcuts.ps1` / `launch_silent.vbs`)**:
  - Instala o Electron caso falte, cria atalhos na Área de Trabalho e Menu Iniciar apontando para `wscript.exe //B launch_silent.vbs` (abre sem janela de CMD) com `tray_icon.ico`.
  - `uninstall_purrmodoro.bat` remove os atalhos preservando o save do jogador.
  - `package.json` inclui configuração opcional do `electron-builder` (`npm run dist`).

---

## 5. Estrutura do Projeto

```text
PurrModoro/
├── Assets/                         # Sprites originais ToffeeCraft
├── docs/
│   ├── PURRMODORO_DESIGN.md        # Documento de design
│   └── screenshots/                # Capturas usadas no README
├── scripts/
│   ├── prepare_assets.py           # Recorte e geração de catalog.json + ícones
│   ├── launch.js                   # Wrapper que limpa ELECTRON_RUN_AS_NODE
│   └── install_shortcuts.ps1       # Criação/remoção de atalhos Windows (.lnk)
├── public/
│   ├── assets/                     # Sprites, móveis recortados, UI e catalog.json
│   ├── index.html                  # UI Dual-Mode + Quartinho + Lojinha
│   ├── styles.css                  # Pixel UI, 4 temas e barra compacta colapsável
│   ├── sound.js                    # Áudio cozy via Web Audio API
│   └── app.js                      # Motor Pomodoro, Diorama 2:1, Loja e IA dos pets
├── main.js                         # Electron (Tray, IPC, janela transparente e redimensionamento)
├── preload.js                      # ContextBridge seguro (window.purrAPI)
├── install_purrmodoro.bat          # Instalador 1-clique Windows
├── uninstall_purrmodoro.bat        # Desinstalador de atalhos Windows
├── start_purrmodoro.bat            # Inicializador direto sem CMD
├── launch_silent.vbs               # Launcher silencioso via WScript
├── package.json                    # Scripts & configuração electron-builder
└── README.md                       # Guia do usuário + screenshots
```

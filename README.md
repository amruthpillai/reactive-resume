<div align="center">
  <a href="https://rxresu.me">
    <img src="apps/web/public/opengraph/banner.jpg" alt="Reactive Resume" />
  </a>

  <h1>Reactive Resume</h1>

  <p>Reactive Resume is a free and open-source resume builder that makes it easy to create, update, and share your resume.</p>

  <p>
    <a href="https://rxresu.me"><strong>Get Started</strong></a>
    ·
    <a href="https://docs.rxresu.me"><strong>Learn More</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/github/package-json/v/amruthpillai/reactive-resume?style=flat-square" alt="Reactive Resume Version">
    <img src="https://img.shields.io/github/stars/amruthpillai/Reactive-Resume?style=flat-square" alt="GitHub Stars">
    <img src="https://img.shields.io/github/license/amruthpillai/Reactive-Resume?style=flat-square" alt="License" />
    <img src="https://img.shields.io/docker/pulls/amruthpillai/reactive-resume?style=flat-square" alt="Docker Pulls" />
    <a href="https://discord.gg/aSyA5ZSxpb"><img src="https://img.shields.io/discord/1173518977851473940?style=flat-square&label=discord" alt="Discord" /></a>
    <a href="https://crowdin.com/project/reactive-resume"><img src="https://badges.crowdin.net/reactive-resume/localized.svg?style=flat-square" alt="Crowdin" /></a>
    <a href="https://github.com/sponsors/AmruthPillai"><img src="https://img.shields.io/github/sponsors/AmruthPillai?style=flat-square&label=sponsors" alt="Sponsors" /></a>
    <a href="https://opencollective.com/reactive-resume/donate"><img src="https://img.shields.io/opencollective/backers/reactive-resume?style=flat-square&label=donations" alt="Donations" /></a>
  </p>
</div>

---

Pick a template, fill in your details, and export to PDF. Basic use needs no account. If you want more control, you can run the whole application on your own infrastructure.

You own your data. The codebase is open source under the MIT license, with no tracking, no ads, and no hidden costs.

## Features

**Resume Building**

- Live preview as you type
- Multiple export formats (PDF, JSON, DOCX)
- Drag-and-drop section ordering
- Custom sections for any content type
- Rich text editor

**Templates**

- 15 templates to choose from
- A4 and Letter page sizes
- Customizable colors, fonts, and spacing
- Structured Style Rules for section and text styling

**Privacy & Control**

- Self-host on your own infrastructure
- No tracking or analytics by default
- Full data export at any time
- Delete your data permanently with one click

**Extras**

- AI integration (OpenAI, Google Gemini, Anthropic Claude)
- Multi-language support
- Share resumes via unique links
- Import from JSON Resume format
- Dark mode
- Passkey and two-factor authentication

## Templates

<table>
  <tr>
    <td align="center">
      <img src="apps/web/public/templates/jpg/azurill.jpg" alt="Azurill" width="150" />
      <br /><sub><b>Azurill</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/bronzor.jpg" alt="Bronzor" width="150" />
      <br /><sub><b>Bronzor</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/chikorita.jpg" alt="Chikorita" width="150" />
      <br /><sub><b>Chikorita</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/ditto.jpg" alt="Ditto" width="150" />
      <br /><sub><b>Ditto</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="apps/web/public/templates/jpg/gengar.jpg" alt="Gengar" width="150" />
      <br /><sub><b>Gengar</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/glalie.jpg" alt="Glalie" width="150" />
      <br /><sub><b>Glalie</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/kakuna.jpg" alt="Kakuna" width="150" />
      <br /><sub><b>Kakuna</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/lapras.jpg" alt="Lapras" width="150" />
      <br /><sub><b>Lapras</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="apps/web/public/templates/jpg/leafish.jpg" alt="Leafish" width="150" />
      <br /><sub><b>Leafish</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/onyx.jpg" alt="Onyx" width="150" />
      <br /><sub><b>Onyx</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/pikachu.jpg" alt="Pikachu" width="150" />
      <br /><sub><b>Pikachu</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/rhyhorn.jpg" alt="Rhyhorn" width="150" />
      <br /><sub><b>Rhyhorn</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="apps/web/public/templates/jpg/ditgar.jpg" alt="Ditgar" width="150" />
      <br /><sub><b>Ditgar</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/meowth.jpg" alt="Meowth" width="150" />
      <br /><sub><b>Meowth</b></sub>
    </td>
    <td align="center">
      <img src="apps/web/public/templates/jpg/scizor.jpg" alt="Scizor" width="150" />
      <br /><sub><b>Scizor</b></sub>
    </td>
  </tr>
</table>

## Quick Start

The quickest way to run Reactive Resume locally:

```bash
# Clone the repository
git clone --depth=1  https://github.com/amruthpillai/reactive-resume.git
cd reactive-resume

# Start all services
docker compose up -d

# Access the app
open http://localhost:3000
```

[![Build with Ona](https://ona.com/build-with-ona.svg)](https://app.ona.com/#https://github.com/amruthpillai/reactive-resume)

For detailed setup instructions, environment configuration, and self-hosting guides, see the [documentation](https://docs.rxresu.me).

## Tech Stack

| Category         | Technology                      |
| ---------------- | ------------------------------- |
| Framework        | TanStack Start (React 19, Vite) |
| Runtime          | Node.js                         |
| Language         | TypeScript                      |
| Database         | PostgreSQL with Drizzle ORM     |
| API              | ORPC (Type-safe RPC)            |
| Auth             | Better Auth                     |
| Styling          | Tailwind CSS                    |
| UI Components    | Base UI + shadcn-style package  |
| State Management | Zustand + TanStack Query        |

## Documentation

The full documentation lives at [docs.rxresu.me](https://docs.rxresu.me):

| Guide                                                                        | Description                      |
| ---------------------------------------------------------------------------- | -------------------------------- |
| [Getting Started](https://docs.rxresu.me/getting-started)                    | First-time setup and basic usage |
| [Self-Hosting](https://docs.rxresu.me/self-hosting/docker)                   | Deploy on your own server        |
| [Development setup](https://docs.rxresu.me/contributing/development)         | Local development environment    |
| [Project architecture](https://docs.rxresu.me/contributing/architecture)     | Codebase structure and patterns  |
| [Exporting Your Resume](https://docs.rxresu.me/guides/exporting-your-resume) | PDF and JSON export options      |

## Self-Hosting

Reactive Resume can be self-hosted using Docker. The stack includes:

- **PostgreSQL** — Database for storing user data and resumes
- **SeaweedFS** (optional) — S3-compatible storage for file uploads

> **From v5.1.0 onwards** — PDF generation runs entirely client-side via `@react-pdf/renderer`. New deployments no longer need Browserless, Chromium, or any external print service. The `PRINTER_*` and `BROWSERLESS_*` environment variables are no longer read and can be removed from your `.env`.

Pull the latest image from Docker Hub or GitHub Container Registry:

```bash
# Docker Hub
docker pull amruthpillai/reactive-resume:latest

# GitHub Container Registry
docker pull ghcr.io/amruthpillai/reactive-resume:latest
```

See the [self-hosting guide](https://docs.rxresu.me/self-hosting/docker) for complete instructions.

## Support

Reactive Resume is and always will be free and open source. If it has helped you land a job or saved you time, please consider supporting continued development:

<p>
  <a href="https://github.com/sponsors/AmruthPillai">
    <img src="https://img.shields.io/badge/GitHub%20Sponsors-Support-ea4aaa?style=flat-square&logo=github-sponsors" alt="GitHub Sponsors" />
  </a>
  <a href="https://opencollective.com/reactive-resume/donate">
    <img src="https://img.shields.io/badge/Open%20Collective-Contribute-7FADF2?style=flat-square&logo=open-collective" alt="Open Collective" />
  </a>
</p>

Other ways to support:

- Star this repository
- Report reproducible bugs and suggest actionable features
- Help other users in [GitHub Discussions](https://github.com/amruthpillai/reactive-resume/discussions/categories/q-a)
- Improve documentation
- Help with translations

## Star History

<a href="https://www.star-history.com/?repos=amruthpillai%2Freactive-resume&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=amruthpillai/reactive-resume&type=date&theme=dark&legend=top-left&sealed_token=QmaOn4Ech499R6kpQe8ONn911UjGUaJfQBT0MXlQLU9hTo-Ie7lTxIILWbBvmtzDGHk7ziWKN_N5iM5mgP8widn_FGHd9-PHNokPtSji8XLgbFpqatgyqIDPnOys-IhO40W3J0HeH07FL-Q8Bq6ArRk3LDtJDwjh4m0ya-2L59ULb7BaqxkSDuCytkCr" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=amruthpillai/reactive-resume&type=date&legend=top-left&sealed_token=QmaOn4Ech499R6kpQe8ONn911UjGUaJfQBT0MXlQLU9hTo-Ie7lTxIILWbBvmtzDGHk7ziWKN_N5iM5mgP8widn_FGHd9-PHNokPtSji8XLgbFpqatgyqIDPnOys-IhO40W3J0HeH07FL-Q8Bq6ArRk3LDtJDwjh4m0ya-2L59ULb7BaqxkSDuCytkCr" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=amruthpillai/reactive-resume&type=date&legend=top-left&sealed_token=QmaOn4Ech499R6kpQe8ONn911UjGUaJfQBT0MXlQLU9hTo-Ie7lTxIILWbBvmtzDGHk7ziWKN_N5iM5mgP8widn_FGHd9-PHNokPtSji8XLgbFpqatgyqIDPnOys-IhO40W3J0HeH07FL-Q8Bq6ArRk3LDtJDwjh4m0ya-2L59ULb7BaqxkSDuCytkCr" />
 </picture>
</a>

## Contributing

Every contribution helps, whether it is a typo fix or a new feature.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See the [development setup guide](https://docs.rxresu.me/contributing/development) for how to run the project locally.

Maintainers review the [`status: needs triage` queue](https://github.com/amruthpillai/reactive-resume/issues?q=is%3Aissue+is%3Aopen+label%3A%22status%3A+needs+triage%22)
weekly. Triaged bugs become `status: confirmed`; feature proposals become `status: accepted`; reports that need details become
`status: needs info`.

## License

[MIT](./LICENSE) — do whatever you want with it.


## 🌐 Web Resources & Interactive Index
- [DARING JACK](https://iskillcrafts.pages.dev/daring-jack.html)
- [IDLE INVENTOR](https://thequizzone.pages.dev/idle-inventor.html)
- [CATEGORY UNBLOCKEDGAMES](https://studyquests.github.io/category-unblockedgames.html)
- [CATEGORY AGILITY](https://studyplayings.pages.dev/category-agility.html)
- [CATEGORY MAKEUP51](https://thelearnquester.web.app/category-makeup51.html)
- [SAFE MERGE](https://learnquester.pages.dev/safe-merge.html)
- [DUCK LUCK](https://learnquesters.pages.dev/duck-luck.html)
- [DEAD ZONE MECH OPS](https://studyplaying.github.io/dead-zone-mech-ops.html)
- [SPRUNKI MONSTER MUSIC BEATS](https://themindskillplayplay.pages.dev/sprunki-monster-music-beats.html)
- [2 PLAYER MINI CHALLENGE](https://ilearnworld.github.io/2-player-mini-challenge.html)
- [CATEGORY MAHJONG37](https://studyplayings.web.app/category-mahjong37.html)
- [SQUAREHEAD HERO](https://studyplaying.github.io/squarehead-hero.html)
- [CATEGORY FOOTBALL](https://themindskillplayplay.pages.dev/category-football.html)
- [SPACE STRIKE GALAXY SHOOTER](https://thelearnquester.web.app/space-strike-galaxy-shooter.html)
- [CATEGORY STICKMAN](https://studyplayings.web.app/category-stickman.html)
- [MAGICAL DIARY PAPER DRESS UP](https://iskillcrafts.pages.dev/magical-diary-paper-dress-up.html)
- [ESCAPE AGAIN](https://thelearnquester.web.app/escape-again.html)
- [CATEGORY IDLE](https://themindskillplayplay.pages.dev/category-idle.html)
- [STRYKON](https://iskillcrafts.pages.dev/strykon.html)
- [INDEX19](https://thelearnquesters.pages.dev/index19.html)
- [HAIR STACK 3D](https://studyplaying.github.io/hair-stack-3d.html)
- [CATEGORY ADVENTURE](https://studyplayings.web.app/category-adventure.html)
- [DEAR ISLAND](https://learnquester.pages.dev/dear-island.html)
- [WOOD SCREW PUZZLE](https://learnquester.pages.dev/wood-screw-puzzle.html)
- [MEME CHALLENGEIO](https://studyplaying.github.io/meme-challengeio.html)
- [MARBLE BUBBLE LEGEND](https://learnquester.github.io/marble-bubble-legend.html)
- [POPPING PETS](https://studyplaying.github.io/popping-pets.html)
- [CATEGORY BOAT26](https://esskillcrafts.pages.dev/category-boat26.html)
- [STUMBLE GUYS](https://frskillcrafts.pages.dev/stumble-guys.html)
- [CATEGORY MERGE224](https://themindskillplayplay.pages.dev/category-merge224.html)
- [BOTTLE LOGIC](https://studyplaying.github.io/bottle-logic.html)
- [CHICKEN WARS MERGE GUNS](https://studyplaying.github.io/chicken-wars-merge-guns.html)
- [WORLD WARS TANKS](https://thelearnquester.web.app/world-wars-tanks.html)
- [DREAM RESTAURANT 3D](https://learnquester.pages.dev/dream-restaurant-3d.html)
- [FESTIVAL VIBES MAKEUP](https://studyplaying.github.io/festival-vibes-makeup.html)
- [KABOOM MINER](https://iskillcrafts.pages.dev/kaboom-miner.html)
- [FACE CHANGES](https://enskillcrafts.pages.dev/face-changes.html)
- [NATURAL DISASTER SURVIVAL OBBY](https://thelearnquester.web.app/natural-disaster-survival-obby.html)
- [DRAWING SQUARES](https://skillplay.github.io/drawing-squares.html)
- [CATEGORY BLOODY29](https://themindskillplayplay.pages.dev/category-bloody29.html)
- [CATEGORY CAT](https://themindskillplayplay.pages.dev/category-cat.html)
- [REAL DRIVING SIMULATOR](https://studyplaying.github.io/real-driving-simulator.html)
- [PICKLE BALL CLASH](https://learnquester.pages.dev/pickle-ball-clash.html)
- [CATEGORY ARENA254](https://studyplayings.web.app/category-arena254.html)
- [ANIMAL RACING IDLE PARK](https://studyplaying.github.io/animal-racing-idle-park.html)
- [AYLA WORLD PRINCESS LIFE](https://studyplaying.github.io/ayla-world-princess-life.html)
- [CATEGORY LOGIC538](https://themindskillplayplay.pages.dev/category-logic538.html)
- [CATEGORY CARDS](https://studyplayings.web.app/category-cards.html)
- [CATEGORY TURN BASED](https://studyplaying.github.io/category-turn-based.html)
- [OVERTIDE IO](https://enskillcrafts.pages.dev/overtide-io.html)
- [FISH SORT](https://skillplay.github.io/fish-sort.html)
- [CATEGORY ANIMAL216](https://themindskillplayplay.pages.dev/category-animal216.html)
- [TRAVEL STORY MATCH](https://studyplaying.github.io/travel-story-match.html)
- [MIGHTY RUN](https://frskillcrafts.pages.dev/mighty-run.html)
- [ANIMALS MERGE](https://studyplayings.web.app/animals-merge.html)
- [DOGS VS ALIENS](https://learnquester.github.io/dogs-vs-aliens.html)
- [KNIT RESCUE](https://ptskillcrafts.pages.dev/knit-rescue.html)
- [CATCH THE GOOSE](https://studyplaying.github.io/catch-the-goose.html)
- [CALL OF THE JUNGLE ANIMAL EVOLUTION](https://skillplay.github.io/call-of-the-jungle-animal-evolution.html)
- [CATEGORY SOCCER 2](https://studyplayings.web.app/category-soccer-2.html)
- [CATEGORY ADVENTURE 2](https://ptskillcrafts.pages.dev/category-adventure-2.html)
- [INDEX12](https://themindskillplayplay.pages.dev/index12.html)
- [CATEGORY BUSINESS137](https://thelearnquesters.pages.dev/category-business137.html)
- [INDEX18](https://themindskillplayplay.pages.dev/index18.html)
- [ARCHERS RANDOM](https://studyplaying.github.io/archers-random.html)
- [OBBY SURVIVE PARKOUR](https://studyplaying.github.io/obby-survive-parkour.html)
- [DRAGON JOUST](https://enskillcrafts.pages.dev/dragon-joust.html)
- [PIN BOARD PUZZLE](https://skillplay.github.io/pin-board-puzzle.html)
- [SMASH DEFENSE](https://learnquester.github.io/smash-defense.html)
- [SOLITAIRE MAHJONG FARM 2](https://studyplaying.github.io/solitaire-mahjong-farm-2.html)
- [CUBE COMBO](https://skillplay.github.io/cube-combo.html)
- [BANANA FARM](https://iskillcrafts.web.app/banana-farm.html)
- [KICK AND RIDE](https://iskillcrafts.pages.dev/kick-and-ride.html)
- [TEXAS HOLDEM POKER](https://skillcrafts.github.io/texas-holdem-poker.html)
- [FIND RESTORE HIDDEN PUZZLE](https://iskillcrafts.pages.dev/find-restore-hidden-puzzle.html)
- [MERGE BALLS SHOOTER 2048 CONNECT FRUITS](https://iskillplay.web.app/merge-balls-shooter-2048-connect-fruits.html)
- [FEED THE PARROT](https://studyplaying.github.io/feed-the-parrot.html)
- [CODE MAZE](https://learnquesters.pages.dev/code-maze.html)
- [NORTHERN LIGHTS THE SECRET OF THE FOREST](https://iskillcrafts.web.app/northern-lights-the-secret-of-the-forest.html)
- [MAHJONG MAGIC ISLANDS](https://studyplaying.github.io/mahjong-magic-islands.html)
- [NOOB PARKOUR TRICKS](https://iskillcrafts.pages.dev/noob-parkour-tricks.html)
- [MY DREAMY FLORA FASHION LOOK](https://iskillcrafts.pages.dev/my-dreamy-flora-fashion-look.html)
- [CATEGORY POOL 2](https://studyplaying.github.io/category-pool-2.html)
- [WITCHY AND THE PUZZLE ADVENTURES](https://studyplaying.github.io/witchy-and-the-puzzle-adventures.html)
- [CATEGORY POOL 3](https://themindskillplayplay.pages.dev/category-pool-3.html)
- [CATEGORY THINKY 2](https://studyplayings.web.app/category-thinky-2.html)
- [PUZZLE BLOCKS ASMR MATCH](https://thelearnquester.web.app/puzzle-blocks-asmr-match.html)
- [INDEX41](https://thelearnquesters.pages.dev/index41.html)
- [BROOMCRAFT MYSTIC EVASION](https://studyplaying.github.io/broomcraft-mystic-evasion.html)
- [MEOW SLIDE](https://learnquester.github.io/meow-slide.html)
- [CATEGORY CASUAL 6](https://studyplayings.web.app/category-casual-6.html)
- [LABUBA HALLOWEEN INFESTATION](https://studyplaying.github.io/labuba-halloween-infestation.html)
- [CATEGORY PUZZLE 3](https://studyplaying.github.io/category-puzzle-3.html)
- [SNAKE CLASH](https://skillplay.github.io/snake-clash.html)
- [SPRING TILE MASTER](https://studyplaying.github.io/spring-tile-master.html)
- [STRATEGY OF WAR TANKS AND HELICOPTERS](https://learnquesters.pages.dev/strategy-of-war-tanks-and-helicopters.html)
- [HALLOWEEN CHALLENGE](https://studyplaying.github.io/halloween-challenge.html)
- [MAGNET TRUCK](https://learnquesters.pages.dev/magnet-truck.html)
- [FROGTASTIC MARBLE ADVENTURE](https://ptskillcrafts.pages.dev/frogtastic-marble-adventure.html)
- [MILITARY CUBES 2048](https://studyplaying.github.io/military-cubes-2048.html)
- [OBBY 3D SPRUNKI PARKOUR](https://enskillcrafts.pages.dev/obby-3d-sprunki-parkour.html)
- [GOKARTS IO](https://skillplay.github.io/gokarts-io.html)
- [CHROMA TREK](https://enskillcrafts.pages.dev/chroma-trek.html)
- [VEGA MIX SEA ADVENTURES](https://iskillplay.web.app/vega-mix-sea-adventures.html)
- [COUNT ESCAPE RUSH](https://iskillcrafts.web.app/count-escape-rush.html)
- [CATEGORY HERO72](https://skillcrafts.github.io/category-hero72.html)
- [FOREST TILES](https://studyplaying.github.io/forest-tiles.html)
- [BUBBITS](https://ptskillcrafts.pages.dev/bubbits.html)
- [WORD VOYAGER](https://thelearnquester.web.app/word-voyager.html)
- [EPIC CAR STUNT RACE OBBY](https://studyplaying.github.io/epic-car-stunt-race-obby.html)
- [DINO HUNTER KING](https://studyplaying.github.io/dino-hunter-king.html)
- [BUBBLE RACE PARTY](https://iskillcrafts.web.app/bubble-race-party.html)
- [CATEGORY MAHJONG](https://themindskillplayplay.pages.dev/category-mahjong.html)
- [CUPHEAD](https://studyplaying.github.io/cuphead.html)
- [MY ARCADE CENTER 2](https://skillplay.github.io/my-arcade-center-2.html)
- [SPRUNKI GETS SURGERY](https://studyplaying.github.io/sprunki-gets-surgery.html)
- [OFFROAD CLIMB 4X4](https://studyplaying.github.io/offroad-climb-4x4.html)
- [TILE ADVENTURE](https://enskillcrafts.pages.dev/tile-adventure.html)
- [SO DIFFERENT DRAGONS](https://thelearnquester.web.app/so-different-dragons.html)
- [LEGEND OF FIREBALL](https://iskillplay.web.app/legend-of-fireball.html)
- [DINO RANCH](https://frskillcrafts.pages.dev/dino-ranch.html)
- [CATEGORY MINECRAFT](https://themindskillplayplay.pages.dev/category-minecraft.html)
- [TERMS](https://themindskillplayplay.pages.dev/terms.html)
- [CATEGORY WATER39](https://studyplayings.web.app/category-water39.html)
- [GUESS THE DRAWING](https://iskillcrafts.web.app/guess-the-drawing.html)
- [DUSTY MAZE HUNTER](https://enskillcrafts.pages.dev/dusty-maze-hunter.html)
- [FLOWER FAIRY ADVENTURE STORY](https://thelearnquester.web.app/flower-fairy-adventure-story.html)
- [SNAKE IO](https://iskillplay.web.app/snake-io.html)
- [OLE BUNNY](https://iskillcrafts.pages.dev/ole-bunny.html)
- [INDEX35](https://frskillcrafts.pages.dev/index35.html)

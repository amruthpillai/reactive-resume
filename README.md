<div align="center" markdown="1">
  <a href="https://go.warp.dev/Reactive-Resume">
    <img alt="Warp Sponsorship" width="400" src="https://github.com/warpdotdev/brand-assets/blob/main/Github/Sponsor/Warp-Github-LG-03.png?raw=true" />
  </a>

  ### [Warp, built for coding with multiple AI agents.](https://go.warp.dev/Reactive-Resume)

  [Available for MacOS, Linux, & Windows](https://go.warp.dev/Reactive-Resume)
</div>

---

<div align="center">
  <a href="https://rxresu.me">
    <img src="public/opengraph/banner.jpg" alt="Reactive Resume" />
  </a>

  <h1>Reactive Resume</h1>

  <p>Reactive Resume is a free and open-source resume builder that simplifies the process of creating, updating, and sharing your resume.</p>

  <p>
    <a href="https://rxresu.me"><strong>Get Started</strong></a>
    ·
    <a href="https://docs.rxresu.me"><strong>Learn More</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/github/stars/amruthpillai/Reactive-Resume?style=flat-square" alt="Stars" />
    <img src="https://img.shields.io/github/license/amruthpillai/Reactive-Resume?style=flat-square" alt="License" />
    <img src="https://img.shields.io/docker/pulls/amruthpillai/reactive-resume?style=flat-square" alt="Docker Pulls" />
    <a href="https://discord.gg/EE8yFqW4"><img src="https://img.shields.io/discord/1173518977851473940?label=Discord&style=flat-square&logo=discord" alt="Discord" /></a>
    <a href="https://crowdin.com/project/reactive-resume"><img src="https://badges.crowdin.net/reactive-resume/localized.svg?style=flat-square" alt="Crowdin" /></a>
    <a href="https://opencollective.com/reactive-resume"><img src="https://img.shields.io/opencollective/all/reactive-resume?style=flat-square" alt="Open Collective" /></a>
  </p>

  <a href="https://www.producthunt.com/products/reactive-resume?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-reactive-resume-v5-2" target="_blank" rel="noopener"><img alt="Reactive Resume v5 - A free and open-source resume builder. | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1065182&amp;theme=light&amp;t=1768850745585"></a>
</div>

---

Reactive Resume makes building resumes straightforward. Pick a template, fill in your details, and export to PDF—no account required for basic use. For those who want more control, the entire application can be self-hosted on your own infrastructure.

Built with privacy as a core principle, Reactive Resume gives you complete ownership of your data. The codebase is fully open-source under the MIT license, with no tracking, no ads, and no hidden costs.

## Features

**Resume Building**

- Real-time preview as you type
- Multiple export formats (PDF, JSON)
- Drag-and-drop section ordering
- Custom sections for any content type
- Rich text editor with formatting support

**Templates**

- Professionally designed templates
- A4 and Letter size support
- Customizable colors, fonts, and spacing
- Custom CSS for advanced styling

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
- Dark mode support
- Passkey and two-factor authentication

## Templates

<table>
  <tr>
    <td align="center">
      <img src="public/templates/jpg/azurill.jpg" alt="Azurill" width="150" />
      <br /><sub><b>Azurill</b></sub>
    </td>
    <td align="center">
      <img src="public/templates/jpg/bronzor.jpg" alt="Bronzor" width="150" />
      <br /><sub><b>Bronzor</b></sub>
    </td>
    <td align="center">
      <img src="public/templates/jpg/chikorita.jpg" alt="Chikorita" width="150" />
      <br /><sub><b>Chikorita</b></sub>
    </td>
    <td align="center">
      <img src="public/templates/jpg/ditto.jpg" alt="Ditto" width="150" />
      <br /><sub><b>Ditto</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="public/templates/jpg/gengar.jpg" alt="Gengar" width="150" />
      <br /><sub><b>Gengar</b></sub>
    </td>
    <td align="center">
      <img src="public/templates/jpg/glalie.jpg" alt="Glalie" width="150" />
      <br /><sub><b>Glalie</b></sub>
    </td>
    <td align="center">
      <img src="public/templates/jpg/kakuna.jpg" alt="Kakuna" width="150" />
      <br /><sub><b>Kakuna</b></sub>
    </td>
    <td align="center">
      <img src="public/templates/jpg/lapras.jpg" alt="Lapras" width="150" />
      <br /><sub><b>Lapras</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="public/templates/jpg/leafish.jpg" alt="Leafish" width="150" />
      <br /><sub><b>Leafish</b></sub>
    </td>
    <td align="center">
      <img src="public/templates/jpg/onyx.jpg" alt="Onyx" width="150" />
      <br /><sub><b>Onyx</b></sub>
    </td>
    <td align="center">
      <img src="public/templates/jpg/pikachu.jpg" alt="Pikachu" width="150" />
      <br /><sub><b>Pikachu</b></sub>
    </td>
    <td align="center">
      <img src="public/templates/jpg/rhyhorn.jpg" alt="Rhyhorn" width="150" />
      <br /><sub><b>Rhyhorn</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="public/templates/jpg/ditgar.jpg" alt="Ditgar" width="150" />
      <br /><sub><b>Ditgar</b></sub>
    </td>
  </tr>
</table>

## Quick Start

The quickest way to run Reactive Resume locally:

```bash
# Clone the repository
git clone https://github.com/amruthpillai/reactive-resume.git
cd reactive-resume

# Start all services
docker compose up -d

# Access the app
open http://localhost:3000
```

For detailed setup instructions, environment configuration, and self-hosting guides, see the [documentation](https://docs.rxresu.me).

## Tech Stack

| Category         | Technology                           |
| ---------------- | ------------------------------------ |
| Framework        | TanStack Start (React 19, Vite)      |
| Runtime          | Node.js                              |
| Language         | TypeScript                           |
| Database         | PostgreSQL with Drizzle ORM          |
| API              | ORPC (Type-safe RPC)                 |
| Auth             | Better Auth                          |
| Styling          | Tailwind CSS                         |
| UI Components    | Radix UI                             |
| State Management | Zustand + TanStack Query             |

## Documentation

Comprehensive guides are available at [docs.rxresu.me](https://docs.rxresu.me):

| Guide                                                                       | Description                       |
| --------------------------------------------------------------------------- | --------------------------------- |
| [Getting Started](https://docs.rxresu.me/getting-started)                   | First-time setup and basic usage  |
| [Self-Hosting](https://docs.rxresu.me/guides/self-hosting-with-docker)      | Deploy on your own server         |
| [Development Setup](https://docs.rxresu.me/contributing/development)        | Local development environment     |
| [Project Architecture](https://docs.rxresu.me/contributing/architecture)    | Codebase structure and patterns   |
| [Exporting Your Resume](https://docs.rxresu.me/guides/exporting-your-resume)| PDF and JSON export options       |

## Self-Hosting

Reactive Resume can be self-hosted using Docker. The stack includes:

- **PostgreSQL** — Database for storing user data and resumes
- **Printer** — Headless Chromium service for PDF and screenshot generation
- **SeaweedFS** (optional) — S3-compatible storage for file uploads

Pull the latest image from Docker Hub or GitHub Container Registry:

```bash
# Docker Hub
docker pull amruthpillai/reactive-resume:latest

# GitHub Container Registry
docker pull ghcr.io/amruthpillai/reactive-resume:latest
```

See the [self-hosting guide](https://docs.rxresu.me/guides/self-hosting-with-docker) for complete instructions.

## Support

Reactive Resume is and always will be free and open-source. If it has helped you land a job or saved you time, please consider supporting continued development:

<p>
  <a href="https://github.com/sponsors/AmruthPillai">
    <img src="https://img.shields.io/badge/GitHub%20Sponsors-Support-ea4aaa?style=flat-square&logo=github-sponsors" alt="GitHub Sponsors" />
  </a>
  <a href="https://opencollective.com/reactive-resume">
    <img src="https://img.shields.io/badge/Open%20Collective-Contribute-7FADF2?style=flat-square&logo=open-collective" alt="Open Collective" />
  </a>
</p>

Other ways to support:

- Star this repository
- Report bugs and suggest features
- Improve documentation
- Help with translations

## Star History

<a href="https://www.star-history.com/#amruthpillai/reactive-resume&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=amruthpillai/reactive-resume&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=amruthpillai/reactive-resume&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=amruthpillai/reactive-resume&type=date&legend=top-left" />
 </picture>
</a>

## Contributing

Contributions make open-source thrive. Whether fixing a typo or adding a feature, all contributions are welcome.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See the [development setup guide](https://docs.rxresu.me/contributing/development) for detailed instructions on how to set up the project locally.

## License

[MIT](./LICENSE) — do whatever you want with it.

# TELETEXT-95 AI 📺

> *Kiroween 2026 Resurrection — A 1990s European CRT Teletext service resurrected with live AI intelligence.*

A zero-dependency static web app that renders an authentic Ceefax/Teletext experience in the browser with live data feeds and an interactive AI oracle.

## Live Demo

Deploy to GitHub Pages: upload `index.html`, `styles.css`, and `app.js` to any static host.

## Pages

| Page | Description |
|------|-------------|
| **P100** | Main Index & Live System Clock |
| **P200** | Live Crypto Market Ticker (CoinGecko) |
| **P300** | AI News & Tech Headlines (Hacker News) |
| **P400** | Interactive AI Teletext Oracle |
| **P500** | Retro ASCII Weather & Space Telemetry |

## Navigation

- **Keyboard**: Type any 3-digit page number (e.g. `2`, `0`, `0`) or use `F1`–`F5`
- **On-screen remote**: Click the numpad buttons
- **Fastext bar**: RED=P100 · GREEN=P200 · YELLOW=P300 · BLUE=P400

## AI Oracle Setup (P400)

The AI Oracle connects to any OpenAI-compatible endpoint:

1. Navigate to **P400**
2. Type `config` and press Enter
3. Enter your endpoint URL (e.g. `https://api.openai.com`)
4. Enter your API key
5. Enter model name (default: `gpt-3.5-turbo`)

Settings are saved to localStorage. No data leaves your browser except to your chosen endpoint.

## Live APIs Used

| API | Endpoint | Fallback |
|-----|----------|---------|
| CoinGecko | `api.coingecko.com/api/v3/simple/price` | Static demo table |
| Hacker News | `hn.algolia.com/api/v1/search` | Placeholder headlines |
| Open-Meteo | `api.open-meteo.com/v1/forecast` | "SIGNAL LOST" message |

All APIs are public and require no authentication.

## Features

- 🎨 Authentic 8-color Teletext palette with CRT scanline overlay and phosphor glow
- 🔊 Web Audio API retro keypad beeps (toggleable)
- ⌨️ 3-digit page navigation via keyboard numpad or on-screen remote
- 📡 Live crypto prices with 60-second auto-refresh
- 📰 Hacker News top stories formatted as 40-column bulletins
- 🤖 Interactive AI oracle with up to 3-entry conversation history
- 🌍 Real-time weather with ASCII art and mission elapsed time counter
- 📴 Graceful offline fallback for all network calls

## Tech Stack

- Pure HTML/CSS/JavaScript — zero dependencies, zero build step
- Deployable to GitHub Pages with a single drag-and-drop

## Kiro Spec

This project was built spec-first using [Kiro](https://kiro.dev):
- `.kiro/specs/teletext-95-ai/requirements.md` — 12 EARS-pattern requirements
- `.kiro/specs/teletext-95-ai/design.md` — Architecture, data models, 10 correctness properties
- `.kiro/specs/teletext-95-ai/tasks.md` — 51-task implementation plan
- `.kiro/steering/product.md` — Project steering document
- `.kiro/hooks/validate-on-save.json` — Save hook for HTML/JS validation

## License

MIT © 2026

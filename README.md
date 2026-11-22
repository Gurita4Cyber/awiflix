# CloudStream Web

A modern, responsive web recreation of **[CloudStream](https://github.com/recloudstream/cloudstream)** built with **React**, **Vite**, **TailwindCSS v4**, and **HLS.js**.

## Features

- **Authentic CloudStream Dark UI & Material Themes**: Switch between *CloudStream Dark*, *AMOLED Pitch Black*, *Midnight Navy*, and *Obsidian Violet*, plus 6 customizable accent colors.
- **Bilingual Interface (`ID` / `EN`)**: Switch instantly between Bahasa Indonesia and English.
- **Extensions & Repositories Manager**:
  - Install, uninstall, enable, or disable media providers per repository.
  - Add repositories via JSON manifest URL or CloudStream-style shortcodes (e.g. `anime`, `live`).
  - **Direct Stream & `#EXTM3U` Importer**: Paste any `.m3u8` / `.mp4` URL or import a full `#EXTM3U` IPTV playlist directly into the player.
- **Full-Featured CloudStream Video Player (`HLS.js`)**:
  - Real adaptive HLS (`.m3u8`) multi-bitrate quality switching & mirror switcher.
  - Custom subtitle engine (`ID` / `EN` / `Off`) with customizable font size & background opacity.
  - `+85s` Skip Intro button, `-10s` / `+10s` seek, playback speed (`0.5x–2x`), aspect ratio (`Fit` / `Fill` / `Stretch`), brightness control, screen lock, live clock, episode drawer, Picture-in-Picture, Fullscreen, and keyboard shortcuts.
- **Continue Watching & Watch History**: Automatically saves playback position per movie/episode and tracks watched episodes.
- **Library (Bookmarks)**: Organize titles into *Watching*, *Plan to Watch*, *Completed*, *On Hold*, *Dropped*, and *Watch History*.
- **Downloads Queue**: Queue movies/episodes with pause/resume controls and direct save links.
- **Backup & Restore**: Export and import all settings, repositories, library, and watch history as JSON.

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

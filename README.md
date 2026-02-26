# ShaderToy Cloner

> 🌐 [Versión en español](README.es.md)

Local server to clone and play shaders from [ShaderToy](https://www.shadertoy.com), designed to be used as an animated wallpaper with **[Lively Wallpaper](https://www.rocksdanister.com/lively/)**.

Bypasses Cloudflare restrictions by serving shaders from `localhost`, with support for multi-pass shaders, textures, and cubemaps.

---

## Features

- Clone shaders directly from a ShaderToy URL (requires API key)
- Import shaders from an exported JSON file (no API key needed)
- WebGL2 playback fully compatible with the ShaderToy format
- Support for single-pass and multi-pass shaders (Buffer A/B/C/D → Image)
- Transparent proxy for textures and cubemaps from the ShaderToy CDN
- Control panel with a gallery of cloned shaders
- Dark mode interface
- Install as a Windows service (auto-start with the system)
- UI language switcher (English / Spanish)

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or higher
- Windows 10/11
- A ShaderToy API key _(only needed to clone via URL; not required for JSON import)_

---

## Installation

```powershell
git clone https://github.com/your-user/shadertoy-cloner.git
cd shadertoy-cloner
npm install
```

---

## Usage

### Start manually

```powershell
npm start
```

The server starts at `http://localhost:7700`.

### Initial setup

1. Open `http://localhost:7700` in your browser.
2. Click **Settings** and enter your **ShaderToy API key**.
   - Get your key at [shadertoy.com/profile](https://www.shadertoy.com/profile) (requires a Gold account or higher).
3. Save the changes.

### Clone a shader

- **Via URL**: paste the ShaderToy URL into the clone field (requires API key).
- **Via JSON**: export the shader from ShaderToy and use the Import JSON option (no API key required).

### Use with Lively Wallpaper

1. In the control panel, copy the URL of the shader shown below its thumbnail.
2. In Lively Wallpaper, select **"Add wallpaper"** → **"URL/Web"** and paste the copied URL.

---

## Install as a Windows service

To have the server start automatically with Windows, without needing to keep a terminal open:

> **Requirement**: run as **Administrator**

```powershell
# Open PowerShell as Administrator and run:
node install-service.js
```

This registers the **"ShaderToy Cloner"** service in Windows with the following settings:

| Parameter | Value |
|---|---|
| Service name | `ShaderToy Cloner` |
| Port | `7700` |
| Auto-start | Yes (with the system) |
| Restart on failure | Yes (up to 5 attempts) |
| Environment | `NODE_ENV=production` |

### Verify the service is running

```powershell
Get-Service -Name "ShaderToy Cloner"
```

### Uninstall the service

```powershell
# Open PowerShell as Administrator and run:
node uninstall-service.js
```

---

## Project structure

```
shadertoy-cloner/
├── server.js               # Express server (entry point)
├── install-service.js      # Windows service installer
├── uninstall-service.js    # Windows service uninstaller
├── package.json
├── public/
│   ├── index.html          # Control panel
│   ├── player.html         # Shader player
│   ├── js/
│   │   ├── i18n.js         # Internationalization (EN/ES)
│   │   ├── app.js          # Control panel logic
│   │   └── renderer.js     # WebGL2 rendering engine
│   └── css/
│       └── style.css
└── data/
    ├── settings.json       # Configuration (API key, port)
    └── shaders/            # Cloned shaders (JSON)
```

---

## REST API

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/settings` | Get current configuration |
| `POST` | `/api/settings` | Update configuration |
| `GET` | `/api/shaders` | List cloned shaders |
| `GET` | `/api/shaders/:id` | Get shader data |
| `DELETE` | `/api/shaders/:id` | Delete a shader |
| `POST` | `/api/clone` | Clone shader from URL |
| `POST` | `/api/import` | Import shader from JSON |
| `GET` | `/proxy/*` | Proxy for ShaderToy CDN resources |
| `GET` | `/shader/:id` | Shader player page |

---

## Tech stack

- **Backend**: Node.js, Express, Axios, fs-extra
- **Frontend**: JavaScript (ES6+), WebGL2, HTML5/CSS3
- **Windows service**: node-windows

---

## License

MIT

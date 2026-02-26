# ShaderToy Cloner

> 🌐 [English version](README.md)

Servidor local para clonar y reproducir shaders de [ShaderToy](https://www.shadertoy.com), diseñado para usarse como fondo de pantalla animado con **[Lively Wallpaper](https://www.rocksdanister.com/lively/)**.

Evita las restricciones de Cloudflare sirviendo los shaders desde `localhost`, con soporte para shaders multipaso, texturas y cubemaps.

---

## Características

- Clonar shaders directamente desde la URL de ShaderToy (requiere API key)
- Importar shaders desde un JSON exportado (sin API key)
- Reproducción con WebGL2 compatible con el formato de ShaderToy
- Soporte para shaders de un solo paso y multipaso (Buffer A/B/C/D → Image)
- Proxy transparente de texturas y cubemaps desde el CDN de ShaderToy
- Panel de control con galería de shaders clonados
- Interfaz en modo oscuro
- Instalación como servicio de Windows (inicio automático con el sistema)
- Selector de idioma en la interfaz (inglés / español)

---

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- Windows 10/11
- Una API key de ShaderToy _(solo para clonar vía URL; no necesaria para importar JSON)_

---

## Instalación

```powershell
git clone https://github.com/tu-usuario/shadertoy-cloner.git
cd shadertoy-cloner
npm install
```

---

## Uso

### Iniciar manualmente

```powershell
npm start
```

El servidor arranca en `http://localhost:7700`.

### Configuración inicial

1. Abre `http://localhost:7700` en tu navegador.
2. Haz clic en **Settings** e introduce tu **ShaderToy API key**.
   - Obtén tu key en [shadertoy.com/profile](https://www.shadertoy.com/profile) (requiere cuenta Gold o superior).
3. Guarda los cambios.

### Clonar un shader

- **Vía URL**: pega la URL de ShaderToy en el campo de clonado (requiere API key).
- **Vía JSON**: exporta el shader desde ShaderToy y usa la opción de importar JSON (no requiere API key).

### Usar con Lively Wallpaper

1. En el panel de control, copia la URL del shader que aparece bajo su miniatura.
2. En Lively Wallpaper, selecciona **"Agregar fondo de pantalla"** → **"URL/Web"** y pega la URL copiada.

---

## Instalar como servicio de Windows

Para que el servidor arranque automáticamente con Windows, sin necesidad de mantener una terminal abierta:

> **Requisito**: ejecutar como **Administrador**

```powershell
# Abrir PowerShell como Administrador y ejecutar:
node install-service.js
```

Esto registra el servicio **"ShaderToy Cloner"** en Windows con las siguientes características:

| Parámetro | Valor |
|---|---|
| Nombre del servicio | `ShaderToy Cloner` |
| Puerto | `7700` |
| Inicio automático | Sí (con el sistema) |
| Reinicio ante fallos | Sí (hasta 5 intentos) |
| Entorno | `NODE_ENV=production` |

### Verificar que el servicio está activo

```powershell
Get-Service -Name "ShaderToy Cloner"
```

### Desinstalar el servicio

```powershell
# Abrir PowerShell como Administrador y ejecutar:
node uninstall-service.js
```

---

## Estructura del proyecto

```
shadertoy-cloner/
├── server.js               # Servidor Express (punto de entrada)
├── install-service.js      # Instalador del servicio Windows
├── uninstall-service.js    # Desinstalador del servicio Windows
├── package.json
├── public/
│   ├── index.html          # Panel de control
│   ├── player.html         # Reproductor de shaders
│   ├── js/
│   │   ├── i18n.js         # Internacionalización (EN/ES)
│   │   ├── app.js          # Lógica del panel de control
│   │   └── renderer.js     # Motor de renderizado WebGL2
│   └── css/
│       └── style.css
└── data/
    ├── settings.json       # Configuración (API key, puerto)
    └── shaders/            # Shaders clonados (JSON)
```

---

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/settings` | Obtener configuración actual |
| `POST` | `/api/settings` | Actualizar configuración |
| `GET` | `/api/shaders` | Listar shaders clonados |
| `GET` | `/api/shaders/:id` | Obtener datos de un shader |
| `DELETE` | `/api/shaders/:id` | Eliminar un shader |
| `POST` | `/api/clone` | Clonar shader desde URL |
| `POST` | `/api/import` | Importar shader desde JSON |
| `GET` | `/proxy/*` | Proxy de recursos del CDN de ShaderToy |
| `GET` | `/shader/:id` | Página del reproductor de un shader |

---

## Stack tecnológico

- **Backend**: Node.js, Express, Axios, fs-extra
- **Frontend**: JavaScript (ES6+), WebGL2, HTML5/CSS3
- **Servicio Windows**: node-windows

---

## Licencia

MIT

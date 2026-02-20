# Tibia Outfit Renderer (Cloudflare Worker)

High-performance Tibia outfit renderer built for Cloudflare Workers.

Generates static or animated outfits with custom colors using
pre-generated TAR asset containers served as static files.

Optimized for edge performance.

------------------------------------------------------------------------

## 🚀 Features

-   🎨 Colorized outfits (head, body, legs, feet)
-   🎨 Colorized Mounts (head, body, legs, feet)
-   🧩 Addon support (1--3)
-   🐎 Mount support
-   🔁 Static and animated rendering
-   📦 Single `.tar` asset per outfit
-   ⚡ Edge-optimized (Cloudflare Workers)
-   🎬 Animated GIF generation via `gifski-wasm`

------------------------------------------------------------------------

## 📦 Asset Structure

Each outfit is stored as a static TAR file:

/assets/outfits/{id}.tar

Containing:

-   1_1\_1_3.png
-   1_1\_1_3\_template.png
-   ...
-   outfit_data.json

The Worker fetches and parses the TAR file, minimizing network overhead.

------------------------------------------------------------------------

## 🌐 API

### Static Outfit

/static/{id}?head=45&body=80&legs=90&feet=120&addons=3&rotate=0&mount=1778

### Animated Outfit

/animate/{id}?head=45&body=80&legs=90&feet=120&addons=3&rotate=0&mount=1778&walk=1

------------------------------------------------------------------------

## 🧾 Query Parameters

Param         Description
  ------------- ---------------------
`head`        Head color (0--255)  
`body`        Body color (0--255)  
`legs`        Legs color (0--255)  
`feet`        Feet color (0--255)  
`mounthead`   Mount Head color (0--255)  
`mountbody`   Mount Body color (0--255)  
`mountlegs`   Mount Legs color (0--255)  
`mountfeet`   Mount Feet color (0--255)  
`addons`      0--3  
`mount`       Mount ID  
`direction`   1--4  
`animation`   Frame index (for static images, default 1)  
`rotate`      0 or 1  
`walk`        0 or 1 (animated outfits only)  

------------------------------------------------------------------------

## 🛠 Development

### Install

``` bash
npm install
```

### Run on edge (recommended)

``` bash
wrangler dev --remote
```

### Deploy

``` bash
wrangler deploy
```

------------------------------------------------------------------------

## ⚡ Performance

-   Single asset fetch per outfit
-   Minimal parsing overhead
-   Optimized frame rendering
-   WASM-based GIF encoding
-   Edge execution for low latency

------------------------------------------------------------------------

## 🧠 Architecture

1.  Node pipeline generates TAR containers
2.  TAR files are served as static assets
3.  Worker fetches + parses TAR
4.  PNG frames decoded and colorized
5.  Optional GIF encoding for animation

------------------------------------------------------------------------

## 📜 License

MIT

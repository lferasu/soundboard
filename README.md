# Super Soundboard

A colorful one-page soundboard app designed for 10-year-olds. It includes **8 big buttons**, and each button plays a unique sound effect when clicked (or when pressing keys **1-8**).

## Features

- Kid-friendly design with bright colors and playful emoji labels.
- 8 sound buttons:
  - ⚡ Laser
  - 🤖 Robot
  - 🌀 Boing
  - 🫧 Bubbles
  - 🥁 Drum
  - ✨ Chime
  - 🚀 Space
  - 👏 Clap
- Keyboard support (`1` through `8`).
- No backend required (static web app).

## Project structure

- `index.html` - App layout and sound buttons.
- `styles.css` - Playful visual styling.
- `script.js` - Sound generation and interaction logic using the Web Audio API.

## Run locally

Because this is a static app, any static server works.

### Option 1: Python

```bash
python3 -m http.server 8000
```

Then open: `http://localhost:8000`

### Option 2: VS Code Live Server

Open the folder in VS Code and run **Live Server**.

## Deploy to AWS (S3 + CloudFront)

This app can be hosted as a static website on AWS.

1. **Create an S3 bucket**
   - Name it (for example) `super-soundboard-app`.
   - Disable block public access if you plan to use static website hosting directly.

2. **Upload files**
   - Upload `index.html`, `styles.css`, and `script.js` to the bucket root.

3. **Enable static website hosting**
   - In bucket properties, enable static website hosting.
   - Set `index.html` as the index document.

4. **Set bucket policy** (public read for website hosting)
   - Add a bucket policy allowing `s3:GetObject` for your bucket objects.

5. **(Recommended) Add CloudFront**
   - Create a CloudFront distribution with the S3 bucket as origin.
   - Use CloudFront URL (or attach your custom domain).

6. **Invalidate cache when updating**
   - After deployments, create a CloudFront invalidation (e.g., `/*`).

## Deploy to Vercel

### Option 1: Deploy with Vercel CLI

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Deploy from project root:

```bash
vercel
```

3. For production deployment:

```bash
vercel --prod
```

### Option 2: Deploy from GitHub

1. Push this repo to GitHub.
2. Import the repository in Vercel.
3. Framework preset: **Other** (or no framework).
4. Build command: **none**.
5. Output directory: **root** (`.`).
6. Click deploy.

---

Have fun making noise! 🎉

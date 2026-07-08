# Star Fibre

A Next.js / React billing and account management scaffold for Starfibre Communications (Pty) Ltd.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Deploying to GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/deploy-github-pages.yml` that installs dependencies, builds the app as a static Next.js export, and deploys the generated `out/` folder to GitHub Pages.

### One-time GitHub setup

1. Push this branch to GitHub and merge it into `main`.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Optional Supabase secrets: open **Settings → Secrets and variables → Actions** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Push to `main` or manually run **Actions → Deploy Star Fibre to GitHub Pages → Run workflow**.

The workflow sets `GITHUB_PAGES=true`, so `next.config.mjs` automatically uses the repository name as the static `basePath` for project pages such as `https://OWNER.github.io/REPOSITORY/`.

## Deployment notes

- The workflow uses Node.js 24 and `npm install`, so it works before a `package-lock.json` has been committed. After the first successful local install, you can commit a lockfile and switch the workflow to `npm ci` if desired.
- The app uses `output: 'export'`, so it can be hosted on GitHub Pages as static files.
- Next.js image optimization is disabled with `images.unoptimized` because GitHub Pages cannot run the Next.js image optimization server.
- If deploying to a custom domain or user/organization root page, unset `GITHUB_PAGES` or adjust `basePath` in `next.config.mjs`.

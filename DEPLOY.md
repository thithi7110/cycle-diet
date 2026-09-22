# Vercel deployment

This is a static site. No build command or framework preset is required.

The repository now also contains a Next.js App Router migration. For the Vercel project, select the **Next.js** framework preset. Vercel will run the package build automatically. The Next.js route is the recommended production entrypoint; the root `index.html` remains as a legacy reference.

Set these Vercel environment variables for Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key)

Never set a Supabase `service_role` key as `NEXT_PUBLIC_*` or commit it.

## GitHub integration

1. Push this repository to GitHub.
2. Open Vercel and choose **Add New Project**.
3. Import the repository.
4. Select **Other** or leave the framework preset empty.
5. Leave Build Command empty.
6. Leave Output Directory empty.
7. Deploy.

After the first import, pushes to the connected default branch create a production deployment. Pull requests create Vercel preview deployments, so UI and Bluetooth changes can be reviewed before production.

### First push from this folder

Create an empty GitHub repository first, then replace the placeholder remote URL:

```powershell
git init
git add .
git commit -m "Initial CYCPLUS DC1 fat log app"
git branch -M main
git remote add origin https://github.com/<account>/<repository>.git
git push -u origin main
```

Do not put GitHub or Vercel tokens in the repository. Use the browser login flow or Git Credential Manager when Git asks for authentication.

`index.html`, `vercel.json`, and the four `.glb` files are deployed from the repository root. The GLB files are loaded by Three.js using their repository-relative paths.

## Vercel CLI

From the repository root:

```powershell
npx vercel
npx vercel --prod
```

The CLI prompts for Vercel login and project linking. Do not commit Vercel tokens.

## DC1 Bluetooth

The deployed Vercel URL is HTTPS, so Web Bluetooth can run in supported Chrome/Edge environments. The user must grant Bluetooth permission and select the CYCPLUS DC1 device. Only one browser/app should be connected to the DC1 at a time.

## Supabase production setup

1. Create a Supabase project and run [supabase-schema.sql](supabase-schema.sql) in SQL Editor.
2. Enable Email provider under Authentication > Providers.
3. Copy [supabase-config.example.js](supabase-config.example.js) to `supabase-config.js`.
4. Fill `url` and the browser-safe publishable/anon key in `supabase-config.js`.
5. Commit and push `supabase-config.js` so Vercel serves the same client configuration.

The Supabase anon/publishable key is safe to expose in a browser when RLS is configured. Never use or commit a `service_role` key.

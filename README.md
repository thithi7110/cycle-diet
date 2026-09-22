# FAT / CYCLE

CYCPLUS DC1の運動データを、消費カロリーと脂肪量の3Dモデルで可視化するダイエットログアプリです。

## Run locally

```powershell
python -m http.server 8000
```

Open <http://localhost:8000/index.html>.

Bluetooth接続には、対応ブラウザで `localhost` またはHTTPSを使ってください。

## Next.js app

The migrated App Router application runs with:

```powershell
npm run dev
```

Open <http://localhost:3000>. The original [index.html](index.html) remains available as a legacy/demo reference while the Next.js version is being adopted.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Only the browser-safe publishable/anon key is allowed. Never expose a Supabase `service_role` key in client code, `NEXT_PUBLIC_*`, GitHub, or Vercel browser environment variables.

## Supabase setup

1. Supabaseでプロジェクトを作成する。
2. SQL Editorで [supabase-schema.sql](supabase-schema.sql) を実行する。
3. Project Settings > APIのProject URLとpublishable/anon keyを [supabase-config.js](supabase-config.js) に設定する。
4. AuthでEmail providerを有効にする。

`supabase-config.js`にはブラウザ公開用のanon keyだけを入れてください。`service_role` keyは絶対に入れません。未設定の場合はローカルデモとして動作します。

## Deploy with GitHub and Vercel

1. GitHubで空のリポジトリを作成する。
2. このフォルダをGitへ登録してpushする。
3. VercelでGitHubリポジトリをImportする。
4. Framework Preset、Build Command、Output Directoryは空欄のままDeployする。

以後、GitHubのデフォルトブランチへのpushでVercelが自動デプロイし、Pull RequestごとにPreview Deploymentが作成されます。

詳しい手順は [DEPLOY.md](DEPLOY.md) を参照してください。

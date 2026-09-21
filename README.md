# FAT / CYCLE

CYCPLUS DC1の運動データを、消費カロリーと脂肪量の3Dモデルで可視化するダイエットログアプリです。

## Run locally

```powershell
python -m http.server 8000
```

Open <http://localhost:8000/index.html>.

Bluetooth接続には、対応ブラウザで `localhost` またはHTTPSを使ってください。

## Deploy with GitHub and Vercel

1. GitHubで空のリポジトリを作成する。
2. このフォルダをGitへ登録してpushする。
3. VercelでGitHubリポジトリをImportする。
4. Framework Preset、Build Command、Output Directoryは空欄のままDeployする。

以後、GitHubのデフォルトブランチへのpushでVercelが自動デプロイし、Pull RequestごとにPreview Deploymentが作成されます。

詳しい手順は [DEPLOY.md](DEPLOY.md) を参照してください。

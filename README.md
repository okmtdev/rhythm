# りずむ de あそぼう!

こども向けリズムアクションゲームです。リズムに合わせてジャンプ＆スライディングでポイントを稼ごう!

## ゲーム内容

- 進行方向から迫る障害物をジャンプ or しゃがむ（スライディング）でかわすリズムゲーム
- タイミングよく操作できると **+2 ポイント**、タイミングが悪いと **-1 ポイント**
- 制限時間内にできるだけ多くポイントを稼ごう!

### ステージ

| ステージ | スピード | 制限時間 |
| --- | --- | --- |
| かんたん | ゆっくり | 30秒 |
| ふつう | ふつう | 60秒 |
| むずかしい | はやい | 60秒 |

### 操作方法

| アクション | PC | スマホ / タブレット |
| --- | --- | --- |
| じゃんぷ | `Z` キー / 左クリック | 画面の左半分タップ |
| しゃがむ | `M` キー / 右クリック | 画面の右半分タップ |

## 開発

### 必要なもの

- Node.js 18 以上
- npm

### セットアップ

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開くとゲームが動きます。ファイルを編集するとホットリロードされます。

### ビルド

```bash
npm run build
```

`dist/` ディレクトリに静的ファイルが出力されます。

### ビルド結果のプレビュー

```bash
npm run preview
```

## デプロイ (Google Cloud Storage)

ビルドした静的ファイルを Google Cloud Storage にアップロードしてインターネットに公開します。

### 前提条件

- [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install) がインストール済み
- Google Cloud プロジェクトが作成済み
- 課金が有効になっていること

### 手順

#### 1. gcloud の初期設定

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### 2. Cloud Storage バケットを作成

バケット名はグローバルに一意である必要があります。公開用のドメイン名やプロジェクト名を含めるのがおすすめです。

```bash
gsutil mb -l asia-northeast1 gs://YOUR_BUCKET_NAME
```

#### 3. バケットを公開設定にする

```bash
gsutil iam ch allUsers:objectViewer gs://YOUR_BUCKET_NAME
```

#### 4. ウェブサイトの設定

```bash
gsutil web set -m index.html -e index.html gs://YOUR_BUCKET_NAME
```

#### 5. ビルドしてアップロード

```bash
npm run build
gsutil -m rsync -r -d dist/ gs://YOUR_BUCKET_NAME
```

#### 6. Content-Type の設定

```bash
gsutil -m setmeta -h "Content-Type:text/html" gs://YOUR_BUCKET_NAME/index.html
gsutil -m setmeta -h "Content-Type:text/css" "gs://YOUR_BUCKET_NAME/assets/*.css"
gsutil -m setmeta -h "Content-Type:application/javascript" "gs://YOUR_BUCKET_NAME/assets/*.js"
```

#### 7. 公開 URL

アップロードが完了すると、以下の URL でアクセスできます:

```
https://storage.googleapis.com/YOUR_BUCKET_NAME/index.html
```

### カスタムドメインを使う場合 (オプション)

Cloud Storage のバケット名をドメイン名と同じにし、DNS の CNAME レコードを `c.storage.googleapis.com` に向けることで、カスタムドメインでの公開も可能です。HTTPS が必要な場合は Cloud Load Balancing を併用してください。

詳細: https://cloud.google.com/storage/docs/hosting-static-website

### 更新時の再デプロイ

コードを変更した場合は、ビルドとアップロードを再実行します:

```bash
npm run build
gsutil -m rsync -r -d dist/ gs://YOUR_BUCKET_NAME
```

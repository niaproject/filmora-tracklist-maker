# Fimora TRACKLIST MAKER

![](images/logo.png)

## 概要

Fimora TRACKLIST MAKERは、Wondershare Filmoraのプロジェクトファイル（.wfp）からトラックリストを自動生成するツールです。ファイル選択、連番付与、拡張子の有無などのオプションを備え、簡単にトラックリストを作成・コピーできます。

## 操作方法

1. 「ファイルを選択」ボタンから、Filmoraのプロジェクトファイル（.wfp）を選択します。
2. 必要に応じて「連番付与」や「拡張子」などのオプションを設定します。
3. トラックリストが自動生成され、画面下部に表示されます。
4. 「トラックリストをコピー」ボタンを押すと、生成されたリストをクリップボードにコピーできます。


## JavaScriptミニファイ化

### 前準備

```
$ npm install terser --save-dev
```

-  package.json

```json
"scripts": {
  "minify": "terser js/main.js --compress --mangle --output js/main.min.js",
  "postminify": "npx replace-in-file 'js/main.js' 'js/main.min.js' index.html",
  "build": "npm run preminify && npm run minify && npm run postminify"
}
```

### ツールの実行

```
$ npm run build
```


## JavaScript難読化

### 難読化ツールのインストール

```
$ npm install javascript-obfuscator --save-dev
```

### ツールの実行

```
$ npx javascript-obfuscator js/main.js --output js/main.obf.js
```

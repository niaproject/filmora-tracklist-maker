# Fimora TRACKLIST MAKER

![](images/logo.png)

## 概要

Fimora TRACKLIST MAKERは、Wondershare Filmoraのプロジェクトファイル（.wfp）からトラックリストを自動生成するツールです。ファイル選択、連番付与、拡張子の有無などのオプションを備え、簡単にトラックリストを作成・コピーできます。

## 操作方法


＊＊＊＊


## JavaScriptミニファイ化

### 前準備

```
$ npm install terser --save-dev
```

-  package.json

```json
"scripts": {
  "minify": "terser js/main.js --compress --mangle --output js/main.min.js"
}
```

### ツールの実行

```
$ npm run minify
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

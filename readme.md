# Fimora TRACKLIST MAKER

![](images/logo.png)

## 概要


## 難読化

```
$ npm install javascript-obfuscator --save-dev
$ npx javascript-obfuscator js/main.js --output js/main.obf.js
```

## JS ミニファイ化

### 手動

```
$ npm install terser --save-dev
$ npx terser js/main.js --compress --mangle --output js/main.min.js
```

### package.json

```
"scripts": {
  "minify": "terser js/main.js --compress --mangle --output js/main.min.js"
}
```

```
$ npm run minify
```
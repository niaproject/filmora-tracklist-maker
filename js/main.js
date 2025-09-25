// main.js
$(function() {
    // 初期状態でオプションを非表示
    $('.numbering-row, .ext-row').hide();
    // オプション表示/非表示切り替え（アニメーション）
    $('#toggleOptions').on('click', function() {
        $('.numbering-row, .ext-row').each(function() {
            $(this).slideToggle(300);
        });
    });
    // タイムスタンプコピー機能
    $(document).on('click', '#copyTs', function() {
        const $lis = $('#fileList li:not(.header)');
        if ($lis.length === 0) {
            alert('コピーするタイムスタンプがありません');
            return;
        }
        const numberingMode = getNumberingMode();
        const lines = [];
        $lis.each(function(idx) {
            const ts = $(this).find('.ts').text();
            const name = $(this).find('.name').text();
            if (numberingMode === 'head') {
                lines.push(`${idx + 1} ${ts} ${name}`);
            } else if (numberingMode === 'beforeName') {
                lines.push(`${ts} ${idx + 1} ${name}`);
            } else {
                lines.push(`${ts} ${name}`);
            }
        });
        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            alert('タイムスタンプをコピーしました');
        });
    });

    // 拡張子付与ラジオボタン変更時にリスト再描画
    $(document).on('change', 'input[name="extOption"]', function() {
        const extOption = $('input[name="extOption"]:checked').val();
        const $ul = $('#fileList');
        $ul.children('li').each(function() {
            const $li = $(this);
            const original = $li.data('filename') || $li.find('.name').text();
            let name = original;
            // ファイル名だけにする
            name = name.split(/[/\\]/).pop();
            if (extOption === 'none') {
                name = name.replace(/\.[^/.]+$/, '');
            }
            $li.find('.name').text(name);
        });
    });

    const $fileInput = $('#fileInput');
    if ($fileInput.length === 0) return;


    $fileInput.on('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.name.endsWith('.wfp')) {
            alert('WFPファイルを選択してください');
            return;
        }
        readZipFile(file);
    });

    function readZipFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            JSZip.loadAsync(e.target.result).then(processZip);
        };
        reader.readAsArrayBuffer(file);
    }

    function processZip(zip) {
        const wesprojName = Object.keys(zip.files).find(name => name.endsWith('timeline.wesproj'));
        if (!wesprojName) {
            alert('timeline.wesproj ファイルがzip内に見つかりません');
            return;
        }
        zip.files[wesprojName].async('string').then(processWesprojContent);
    }

    function processWesprojContent(content) {
        const $ul = $('#fileList');
        $ul.empty();
        const numberingMode = getNumberingMode();
        // ヘッダー行を追加（内容はnumberingModeで切り替え、行自体は常に表示）
        $ul.append(getHeaderHtml(numberingMode));
        try {
            const json = JSON.parse(content);
            const found = [];
            extractKeys(json, found);
            if (found.length > 0) {
                sortByTlBegin(found);
                found.forEach((item, idx) => {
                    $ul.append(renderListItem(item, idx, numberingMode));
                });
            } else {
                $ul.append('<li>filenameとtlBeginが見つかりませんでした。</li>');
            }
        } catch (e) {
            $ul.append('<li>JSONのパースに失敗しました。</li>');
        }
    }

    // liを生成
    function renderListItem(item, idx, numberingMode) {
    const li = document.createElement('li');
    li.classList.add('data-row');
        const numSpan  = document.createElement('span'); numSpan.className  = 'num';
        const tsSpan   = document.createElement('span'); tsSpan.className   = 'ts';
        const nameSpan = document.createElement('span'); nameSpan.className = 'name';
        numSpan.textContent = idx + 1;
        tsSpan.textContent = formatNanoToTime(item.tlBegin);
        nameSpan.textContent = extractFileName(item.filename);
        // 元のファイル名をdata属性に保持
        li.dataset.filename = item.filename;
        if (numberingMode === 'head') {
            li.append(numSpan, tsSpan, nameSpan);
        } else if (numberingMode === 'beforeName') {
            li.append(tsSpan, numSpan, nameSpan);
        } else {
            li.append(tsSpan, nameSpan);
        }
        return li;
    }

    function getNumberingMode() {
        const checked = document.querySelector('input[name="numbering"]:checked');
        return checked ? checked.value : 'none';
    }

    // 連番ラジオボタン変更時にリスト再描画
    $(document).on('change', 'input[name="numbering"]', function() {
        // 再描画のために直近のzipデータを再利用するには、processWesprojContentを再呼び出しする必要がある
        // ここでは一度表示されたリストを再描画する簡易対応
        const $ul = $('#fileList');
        // ヘッダー以外のliを取得
        const items = $ul.children('li:not(.header)').toArray().map(li => {
            return {
                filename: $(li).data('filename') || $(li).find('.name').text(),
                tlBegin: $(li).find('.ts').text()
            };
        });
        $ul.empty();
        // 新しいヘッダー行を追加（内容はnumberingModeで切り替え、行自体は常に表示）
        const numberingMode = getNumberingMode();
        $ul.append(getHeaderHtml(numberingMode));
        
        items.forEach((item, idx) => {
            $ul.append(renderListItem(item, idx, numberingMode));
        });
    });

    // ヘッダー行のHTMLを返す関数
    function getHeaderHtml(numberingMode) {
        if (numberingMode === 'head') {
            return '<li class="header"><span class="num">No</span><span class="ts">開始時間</span><span class="name">ファイル名</span></li>';
        } else if (numberingMode === 'beforeName') {
            return '<li class="header"><span class="ts">開始時間</span><span class="num">No</span><span class="name">ファイル名</span></li>';
        } else {
            return '<li class="header"><span class="ts">開始時間</span><span class="name">ファイル名</span></li>';
        }
    }

    // パスからファイル名だけを抽出
    function extractFileName(path) {
        if (typeof path !== 'string') return path;
        return path.split(/[/\\]/).pop();
    }

    // ナノ秒をhh:mm:ss形式に変換
    function formatNanoToTime(nano) {
        const ns100 = Number(nano);
        if (isNaN(ns100)) return nano;
        // 100ナノ秒単位なので1e7で割って秒に変換
        let totalSeconds = Math.floor(ns100 / 1e7);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // tlBeginが小さい順にソートする関数
    function sortByTlBegin(arr) {
        arr.sort((a, b) => {
            const aNum = Number(a.tlBegin);
            const bNum = Number(b.tlBegin);
            if (isNaN(aNum) || isNaN(bNum)) return 0;
            return aNum - bNum;
        });
    }

    function extractKeys(obj, result) {
        if (obj == null || typeof obj !== 'object') return;

        const hasFilename = ('filename' in obj);
        const hasBegin = ('tlBegin' in obj);

        if (hasFilename && hasBegin) {
            // filenameが.mp3または.wavで終わる場合のみ抽出
            if (typeof obj.filename === 'string' &&
                (obj.filename.toLowerCase().endsWith('.mp3') || obj.filename.toLowerCase().endsWith('.wav'))
            ) {
                result.push({
                    filename: obj.filename,
                    tlBegin: obj.tlBegin
                });
            }
        }
        // 再帰
        for (const k in obj) extractKeys(obj[k], result);
    }
});

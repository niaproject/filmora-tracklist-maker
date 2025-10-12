// main.js
$(function() {
    // SE除去機能のリスト更新ボタンでリストを更新
    $(document).on('click', '#seRemoveUpdateBtn', function() {
        const $ul = $('#fileList');
        if (window._lastTrackListData) {
            renderTrackList($ul, window._lastTrackListData);
        }
    });
    // チェックボックス対応
    $(document).on('change', '#repeatNotationCheckbox', function() {
        const repeatNotation = this.checked ? 'withRepeatNotation' : 'none';
        window._repeatNotation = repeatNotation;
        const $ul = $('#fileList');
        if (window._lastTrackListData) {
            renderTrackList($ul, window._lastTrackListData);
        }
    });
    // Repeat閾値変更時もリスト再描画
    $(document).on('input', '#repeatThreshold', function() {
        const $ul = $('#fileList');
        if (window._lastTrackListData) {
            renderTrackList($ul, window._lastTrackListData);
        }
    });

    // 初期状態でオプションを非表示（タイムフォーマット行も含める）
    $('.numbering-row, .ext-row, .repeat-row, .se-remove-row, .time-format-row').hide();
    // オプション表示/非表示切り替え（アニメーション）
    $('#toggleOptions').on('click', function() {
        $('.numbering-row, .ext-row, .repeat-row, .se-remove-row, .time-format-row').each(function() {
            $(this).slideToggle(300);
        });
    });
    // タイムスタンプコピー機能（現在のタイムフォーマットを反映するため、可能なら元データから生成）
    $(document).on('click', '#copyTs', function() {
        const numberingMode = getNumberingMode();
        const lines = [];
        // 可能であれば、レンダリング済みのリスト（tlBeginを調整済み）を優先して使う
        if (window._lastRenderedList && window._lastRenderedList.length > 0) {
            window._lastRenderedList.forEach((item, idx) => {
                const name = (item.filename || '').split(/[/\\]/).pop();
                const ts = formatNanoToTime(item.tlBegin);
                if (numberingMode === 'head') {
                    lines.push(`${idx + 1} ${ts} ${name}`);
                } else if (numberingMode === 'beforeName') {
                    lines.push(`${ts} ${idx + 1} ${name}`);
                } else {
                    lines.push(`${ts} ${name}`);
                }
            });
        }
        // If lines still empty, fallback to DOM-only approach
        if (lines.length === 0) {
            const $lis = $('#fileList li:not(.header)');
            if ($lis.length === 0) {
                alert('コピーするタイムスタンプがありません');
                return;
            }
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
        }
        // 題名のプレフィックスが選択されていれば先頭に追加
    const titleOption = $('#copyHeaderSelect').val();
        let outText = lines.join('\n');
        if (titleOption && titleOption !== 'none') {
            let title = '';
            if (titleOption.startsWith('fixed:')) {
                title = titleOption.replace('fixed:', '');
            }
            if (title) outText = `${title}\n${outText}`;
        }
        navigator.clipboard.writeText(outText).then(() => {
            alert('タイムスタンプをコピーしました');
        });
    });

    // 拡張子付与ラジオボタン変更時にリスト再描画
    $(document).on('change', 'input[name="extOption"]', function() {
        const $ul = $('#fileList');
        if (window._lastTrackListData) {
            renderTrackList($ul, window._lastTrackListData);
        }
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
        const repeatNotation = window._repeatNotation || 'none';
        $ul.append(getHeaderHtml(numberingMode));
        try {
            const json = JSON.parse(content);
            const found = [];
            extractKeys(json, found);
            if (found.length > 0) {
                sortByTlBegin(found);
                // 拡張子除去をここで必ず実行
                const extOption = $('input[name="extOption"]:checked').val();
                found.forEach(item => {
                    if (extOption === 'none') {
                        item.filename = item.filename.replace(/(\.mp3|\.wav|\.m4a)$/i, '');
                    }
                });
                // 元データをグローバルに保存
                window._lastTrackListData = found;
                // リピート表記機能: 連続する同じ曲をまとめる
                let grouped = getRepeatGrouped(found, repeatNotation);
                let idx = 0;
                grouped.forEach(item => {
                    $ul.append(renderListItem(item, idx, numberingMode, repeatNotation));
                    idx += item.repeatCount;
                });
            } else {
                $ul.append('<li>filenameとtlBeginが見つかりませんでした。</li>');
            }
        } catch (e) {
            $ul.append('<li>JSONのパースに失敗しました。</li>');
        }
    }

    // 連続する同じ曲をまとめてリピート回数を付与する関数
    function getRepeatGrouped(list, repeatNotation) {
        if (repeatNotation === 'withRepeatNotation') {
            const threshold = Number($('#repeatThreshold').val()) || 10;
            let repeatShown = false;
            return list.map((item, idx) => {
                if ((idx + 1) < threshold) {
                    return { ...item, isRepeat: false, isVisible: true };
                } else {
                    if (!repeatShown) {
                        repeatShown = true;
                        return { ...item, isRepeat: true, isVisible: true };
                    } else {
                        return { ...item, isRepeat: true, isVisible: false };
                    }
                }
            });
        } else {
            return list.map(item => ({ ...item, isRepeat: false, isVisible: true }));
        }
    }

    // liを生成
    function renderListItem(item, idx, numberingMode, repeatNotation) {
        const li = document.createElement('li');
        li.classList.add('data-row');
        const numSpan  = document.createElement('span'); numSpan.className  = 'num';
        const tsSpan   = document.createElement('span'); tsSpan.className   = 'ts';
        const nameSpan = document.createElement('span'); nameSpan.className = 'name';
        numSpan.textContent = idx + 1;
        // リピート表記機能
        tsSpan.textContent = formatNanoToTime(item.tlBegin);
        let displayName = extractFileName(item.filename);
        if (repeatNotation === 'withRepeatNotation' && item.isRepeat) {
            displayName = 'Repeat';
        }
        nameSpan.textContent = displayName;
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

    // 現在のタイムフォーマットを取得
    function getTimeFormat() {
        const checked = document.querySelector('input[name="timeFormat"]:checked');
        return checked ? checked.value : 'm:ss';
    }

    // 連番ラジオボタン変更時にリスト再描画
    $(document).on('change', 'input[name="numbering"]', function() {
        const $ul = $('#fileList');
        if (window._lastTrackListData) {
            renderTrackList($ul, window._lastTrackListData);
        }
    });
    // タイムフォーマット変更時にリスト再描画
    $(document).on('change', 'input[name="timeFormat"]', function() {
        const $ul = $('#fileList');
        if (window._lastTrackListData) {
            renderTrackList($ul, window._lastTrackListData);
        }
    });
    // 汎用リスト描画関数
    function renderTrackList($ul, trackListData) {
        const numberingMode = getNumberingMode();
        const repeatNotation = window._repeatNotation || 'none';
        const extOption = $('input[name="extOption"]:checked').val();
        const seRemoveSecound = Number($('#seRemoveSecound').val()) || 0;
        $ul.empty();
        $ul.append(getHeaderHtml(numberingMode));
        // 最初にファイル名を整形
        let baseList = trackListData.map(item => {
            let filename = (item.originalFilename || item.filename).split(/[/\\]/).pop();
            if (extOption === 'none') {
                filename = filename.replace(/(\.mp3|\.wav|\.m4a)$/i, '');
            }
            return { ...item, filename };
        });
        // SE除去機能: 指定秒数以下のトラックを除去（tlBeginは元のまま維持）
        let renderedList = baseList;
        if (seRemoveSecound > 0) {
            renderedList = baseList.filter(item => {
                let durationSec = null;
                if (typeof item.duration === 'number' && !isNaN(item.duration)) {
                    durationSec = item.duration / 1e7;
                }
                // durationが数値でかつ閾値以下なら除去
                if (durationSec !== null && durationSec <= seRemoveSecound) {
                    return false;
                }
                return true;
            });
        }
        // グルーピングはレンダリング用のリストで行う
        let grouped = getRepeatGrouped(renderedList, repeatNotation);
        let visibleIdx = 0;
        grouped.forEach((item) => {
            if (item.isVisible !== false) {
                $ul.append(renderListItem(item, visibleIdx, numberingMode, repeatNotation));
                visibleIdx++;
            }
        });
        // 最後に、現在表示しているリストをグローバルに保持（コピー時などに使用）
        window._lastRenderedList = renderedList;
    }

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
        const format = getTimeFormat();
        if (format === 'm:ss') {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else { // 'hh:mm:ss'
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
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
            // filenameが.mp3, .wav, .m4aで終わる場合のみ抽出
            if (typeof obj.filename === 'string' &&
                (obj.filename.toLowerCase().endsWith('.mp3') ||
                 obj.filename.toLowerCase().endsWith('.wav') ||
                 obj.filename.toLowerCase().endsWith('.m4a'))
            ) {
                let duration = null;
                if ('tlEnd' in obj && typeof obj.tlEnd !== 'undefined') {
                    duration = Number(obj.tlEnd) - Number(obj.tlBegin);
                }
                result.push({
                    filename: obj.filename,
                    originalFilename: obj.filename,
                    tlBegin: obj.tlBegin,
                    duration: duration
                });
            }
        }
        // 再帰
        for (const k in obj) extractKeys(obj[k], result);
    }
});

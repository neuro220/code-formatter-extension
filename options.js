// Options page script
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('options-form');
    const indentSize = document.getElementById('indent-size');
    const quoteStyle = document.getElementById('quote-style');
    const lineWrap = document.getElementById('line-wrap');

    const theme = document.getElementById('theme');
    const wrapLines = document.getElementById('wrap-lines');
    const fontSize = document.getElementById('font-size');

    // Load saved settings
    chrome.storage.sync.get(['indentSize', 'quoteStyle', 'lineWrap', 'theme', 'wrapLines', 'fontSize'], function(result) {
        if (result.indentSize) indentSize.value = result.indentSize;
        if (result.quoteStyle) quoteStyle.value = result.quoteStyle;
        if (result.lineWrap) lineWrap.value = result.lineWrap;
        if (result.theme) theme.value = result.theme;
        if (result.wrapLines !== undefined) wrapLines.checked = result.wrapLines;
        if (result.fontSize) fontSize.value = result.fontSize;
    });

    // Save settings
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const settings = {
            indentSize: indentSize.value,
            quoteStyle: quoteStyle.value,
            lineWrap: parseInt(lineWrap.value),
            theme: theme.value,
            wrapLines: wrapLines.checked,
            fontSize: fontSize.value
        };
        chrome.storage.sync.set(settings, function() {
            alert('Settings saved!');
        });
    });
});
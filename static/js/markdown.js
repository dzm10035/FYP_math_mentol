function formatMarkdown(text, isUserMessage = false) {
    // 防止对已渲染 HTML 再次解析
    if (/<span\s+class="katex-html"/.test(text)) {
        return text;
    }

    // 替换粗体语法
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 配置 marked
    window.marked.setOptions({
        breaks: true,
        gfm: true,
        pedantic: false,
        mangle: false,
        headerIds: false,
        smartLists: true
    });

    if (isUserMessage) {
        return window.marked.parse(text);
    }

    // 存储块和内联数学表达式
    let codeBlocks = [];
    let mathBlocks = [];
    let inlineMathBlocks = [];

    // 保存代码块
    text = text.replace(/```([\s\S]*?)```/g, (match) => {
        const id = codeBlocks.length;
        codeBlocks.push(match);
        return `%%CODE_BLOCK_${id}%%`;
    });

    // 保存块数学表达式 \[...\]
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
        const id = mathBlocks.length;
        try {
            mathBlocks.push(`<div class="math-block">${katex.renderToString(content.trim(), { displayMode: true, throwOnError: false })}</div>`);
        } catch (e) {
            console.error('KaTeX block rendering error:', e);
            mathBlocks.push(`<div class="math-block-error">${content}</div>`);
        }
        return `%%MATH_BLOCK_${id}%%`;
    });

    // 保存内联数学表达式 \(..\)
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
        const id = inlineMathBlocks.length;
        try {
            inlineMathBlocks.push(katex.renderToString(content.trim(), { displayMode: false, throwOnError: false }));
        } catch (e) {
            console.error('KaTeX inline rendering error:', e);
            inlineMathBlocks.push(`<span class="math-inline-error">${content}</span>`);
        }
        return `%%INLINE_MATH_${id}%%`;
    });

    // 解析 Markdown
    let formatted = window.marked.parse(text);

    // 恢复数学块
    formatted = formatted.replace(/%%MATH_BLOCK_(\d+)%%/g, (match, index) => mathBlocks[index]);
    // 恢复内联数学
    formatted = formatted.replace(/%%INLINE_MATH_(\d+)%%/g, (match, index) => inlineMathBlocks[index]);
    // 恢复代码块
    formatted = formatted.replace(/%%CODE_BLOCK_(\d+)%%/g, (match, index) => window.marked.parse(codeBlocks[index]));

    return formatted;
}

// 公开函数
window.formatMarkdown = formatMarkdown;

// Format Markdown syntax
function formatMarkdown(text, isUserMessage = false) {
    // Configure marked options
    window.marked.setOptions({
        breaks: true,
        gfm: true,
        pedantic: false,
        mangle: false,
        headerIds: false,
        smartLists: true
    });

    // 用户消息不处理LaTeX
    if (isUserMessage) {
        return window.marked.parse(text);
    }

    // Store code blocks and math blocks
    let codeBlocks = [];
    let mathBlocks = [];
    let inlineMathBlocks = [];
    
    // First, save code blocks
    text = text.replace(/```([\s\S]*?)```/g, function(match) {
        const id = codeBlocks.length;
        codeBlocks.push(match);
        return `%%CODE_BLOCK_${id}%%`;
    });

    // Save block math expressions
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, function(match, content) {
        const id = mathBlocks.length;
        try {
            mathBlocks.push(`<div class="math-block">${katex.renderToString(content.trim(), {
                displayMode: true,
                throwOnError: false
            })}</div>`);
        } catch (e) {
            console.error('KaTeX block rendering error:', e);
            mathBlocks.push(`<div class="math-block-error">${content}</div>`);
        }
        return `%%MATH_BLOCK_${id}%%`;
    });

    // Save inline math expressions
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, function(match, content) {
        const id = inlineMathBlocks.length;
        try {
            inlineMathBlocks.push(katex.renderToString(content.trim(), {
                displayMode: false,
                throwOnError: false
            }));
        } catch (e) {
            console.error('KaTeX inline rendering error:', e);
            inlineMathBlocks.push(`<span class="math-inline-error">${content}</span>`);
        }
        return `%%INLINE_MATH_${id}%%`;
    });

    // Process markdown
    let formatted = window.marked.parse(text);
    
    // Restore math blocks
    formatted = formatted.replace(/%%MATH_BLOCK_(\d+)%%/g, function(match, index) {
        return mathBlocks[index];
    });

    // Restore inline math
    formatted = formatted.replace(/%%INLINE_MATH_(\d+)%%/g, function(match, index) {
        return inlineMathBlocks[index];
    });
    
    // Restore code blocks
    formatted = formatted.replace(/%%CODE_BLOCK_(\d+)%%/g, function(match, index) {
        return window.marked.parse(codeBlocks[index]);
    });
    
    return formatted;
}

// Export function for use in other modules
window.formatMarkdown = formatMarkdown; 
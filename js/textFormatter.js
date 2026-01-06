// Markdown + KaTeX formatter
// Adapted from user provided textFormatter.js to be an ES module

export function renderMarkdownToElement(markdownText, targetElement) {
    const markedExists = typeof marked === 'object' && typeof marked.parse === 'function';
    const katexExists = typeof katex !== 'undefined';
    const renderMathInElementExists = typeof renderMathInElement !== 'undefined';

    if (!markedExists || !targetElement) {
        console.warn("Marked or target element missing");
        return;
    }

    if (markedExists && marked.setOptions) {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    let text = markdownText || '';

    const latexBlocks = [];
    const placeholderPrefix = 'LATEX_BLOCK_';
    let blockCounter = 0;

    // Protect block math \[...\]
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
        const placeholder = placeholderPrefix + blockCounter++;
        latexBlocks.push({ type: 'block', content: content, placeholder, delimiter: 'bracket' });
        return placeholder;
    });

    // Protect block math $$...$$
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
        const placeholder = placeholderPrefix + blockCounter++;
        latexBlocks.push({ type: 'block', content: content, placeholder, delimiter: 'dollar' });
        return placeholder;
    });

    // Protect inline math \(...\)
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
        const placeholder = placeholderPrefix + blockCounter++;
        latexBlocks.push({ type: 'inline', content: content.trim(), placeholder, delimiter: 'bracket' });
        return placeholder;
    });

    // Protect inline math $...$
    text = text.replace(/([^$]|^)\$([^$\n]+?)\$([^$]|$)/g, (match, before, content, after) => {
        const placeholder = placeholderPrefix + blockCounter++;
        latexBlocks.push({ type: 'inline', content: content.trim(), placeholder, delimiter: 'dollar' });
        return before + placeholder + after;
    });

    let html = marked.parse(text);

    // Restore LaTeX blocks
    for (let i = latexBlocks.length - 1; i >= 0; i--) {
        const { type, content, placeholder, delimiter } = latexBlocks[i];
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let restoredLatex = '';
        if (type === 'block') {
            restoredLatex = delimiter === 'bracket' ? `\\[${content}\\]` : `$$${content}$$`;
        } else {
            restoredLatex = delimiter === 'bracket' ? `\\(${content}\\)` : `$${content}$`;
        }
        html = html.replace(new RegExp(escapedPlaceholder, 'g'), restoredLatex);
    }

    targetElement.innerHTML = html;

    // Render LaTeX equations
    if (katexExists && renderMathInElementExists && targetElement) {
        try {
            renderMathInElement(targetElement, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false,
                errorColor: '#cc0000',
                strict: false
            });
        } catch (error) {
            console.error('Error rendering LaTeX:', error);
        }
    }
}

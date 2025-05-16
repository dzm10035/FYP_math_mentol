// Test function to directly render a math expression
function testRenderMath(expr, isBlock = false) {
    try {
        const result = katex.renderToString(expr, {
            displayMode: isBlock,
            throwOnError: false
        });
        console.log('Test render successful:', result);
        return result;
    } catch (e) {
        console.error('Test render failed:', e);
        return isBlock ? `$$${expr}$$` : `$${expr}$`;
    }
}

// Add a test function to inject math expression into the conversation
function insertTestMath() {
    // Create a message with both inline and block math
    const testMessage = `
# Math Test

Inline math test: \( x^2 + 6x - 7 = 0 \)

Block math test:

\[ \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \]

Here are some triangles formulas:

1. Area of a triangle: \( A = \\frac{1}{2} bh \)
2. Pythagorean theorem: \( a^2 + b^2 = c^2 \)
3. Law of sines: \[ \\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} \]

Testing n-th root:
\[ \\sqrt[n]{x} \]

Example:
- Square root: \[ \\sqrt{16} = 4 \]
- Cube root: \[ \\sqrt[3]{27} = 3 \]
`;

    // Add the message to the chat
    window.addMessage(testMessage, false);
}

// Add a function to test math operators
function testMathOperators() {
    const testMessage = `
# Math Operators Test

## Basic Operations:
- Addition: \( x + y \)
- Subtraction: \( x - y \)
- Multiplication: \( x \\times y \) or \( x \\cdot y \)
- Division: \( \\frac{x}{y} \)

## Advanced Operations:
- Square Root: \( \\sqrt{x} \)
- n-th Root: \( \\sqrt[n]{x} \)
- Power: \( x^n \)
- Fraction: \[ \\frac{numerator}{denominator} \]

## Special Notations:
- Parentheses: \( \\left( \\frac{x}{y} \\right) \)
- Brackets: \[ \\left[ \\frac{x}{y} \\right] \]
- \( f(u) \neq f(v) \)
`;

    // Add the message to the chat
    window.addMessage(testMessage, false);
}

// Export functions for use in testing
window.testRenderMath = testRenderMath;
window.insertTestMath = insertTestMath;
window.testMathOperators = testMathOperators; 
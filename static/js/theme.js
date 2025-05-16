/**
 * 主题切换功能
 * 使用CSS类切换实现亮色/暗色主题切换，避免每次都请求服务器
 */

document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return; // 如果没有找到切换按钮，直接退出
    
    const moonIcon = themeToggle.querySelector('.moon-icon');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    
    // 检查CSS版本，用于刷新缓存
    const CSS_VERSION = '1.1';
    const cachedVersion = localStorage.getItem('css-version');
    
    // 如果版本不匹配，清除主题缓存
    if (cachedVersion !== CSS_VERSION) {
        console.log('CSS版本已更新，清除缓存');
        localStorage.removeItem('theme-loaded');
        localStorage.removeItem('light-theme-css');
        localStorage.removeItem('dark-theme-css');
        localStorage.setItem('css-version', CSS_VERSION);
    }
    
    // 初始化主题
    initTheme();
    
    // 切换主题按钮点击事件
    themeToggle.addEventListener('click', toggleTheme);
    
    /**
     * 初始化主题系统
     * 预加载所有主题CSS文件并缓存到localStorage
     */
    function initTheme() {
        // 检查是否已经预加载了主题
        if (!localStorage.getItem('theme-loaded')) {
            // 预加载所有主题CSS
            preloadThemeCSS('light');
            preloadThemeCSS('dark');
            localStorage.setItem('theme-loaded', 'true');
        }
        
        // 应用保存的主题
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
    }
    
    /**
     * 预加载主题CSS并缓存到localStorage
     * @param {string} theme - 'dark' 或 'light'
     */
    function preloadThemeCSS(theme) {
        // 添加时间戳或随机字符串避免缓存
        fetch(`/static/css/${theme}-theme.css?v=${Date.now()}`)
            .then(response => response.text())
            .then(cssText => {
                localStorage.setItem(`${theme}-theme-css`, cssText);
                console.log(`${theme} theme CSS cached`);
            })
            .catch(error => {
                console.error(`Failed to preload ${theme} theme:`, error);
            });
    }
    
    /**
     * 切换主题
     */
    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }
    
    // 让applyTheme在全局可用，以便偏好设置界面可以使用它
    window.applyTheme = applyTheme;
});

/**
 * 应用指定主题
 * @param {string} theme - 'dark' 或 'light'
 */
function applyTheme(theme) {
    // 更新body类名
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    
    // 如果缓存中有主题CSS，直接应用
    const cachedCSS = localStorage.getItem(`${theme}-theme-css`);
    
    // 移除现有主题样式
    let existingTheme = document.getElementById('theme-css');
    if (existingTheme) {
        existingTheme.remove();
    }
    
    if (cachedCSS) {
        // 创建style元素并应用缓存的CSS
        const styleElem = document.createElement('style');
        styleElem.id = 'theme-css';
        styleElem.textContent = cachedCSS;
        document.head.appendChild(styleElem);
        console.log(`Applied cached ${theme} theme`);
    } else {
        // 如果没有缓存，回退到传统方式
        const linkElem = document.createElement('link');
        linkElem.id = 'theme-css';
        linkElem.rel = 'stylesheet';
        linkElem.href = `/static/css/${theme}-theme.css?v=${Date.now()}`;
        document.head.appendChild(linkElem);
        console.log(`Applied ${theme} theme from server`);
        
        // 顺便缓存起来
        fetch(`/static/css/${theme}-theme.css?v=${Date.now()}`)
            .then(response => response.text())
            .then(cssText => {
                localStorage.setItem(`${theme}-theme-css`, cssText);
            });
    }
    
    // 更新主题切换按钮图标显示
    const moonIcon = document.querySelector('.moon-icon');
    const sunIcon = document.querySelector('.sun-icon');
    if (moonIcon && sunIcon) {
        if (theme === 'dark') {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        } else {
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        }
    }
    
    // 保存用户偏好
    localStorage.setItem('theme', theme);
}

// 在页面加载时立即应用存储的主题（避免闪烁）
(function() {
    // CSS版本检查
    const CSS_VERSION = '1.1';
    const cachedVersion = localStorage.getItem('css-version');
    
    // 如果版本不匹配，清除本地存储的CSS
    if (cachedVersion !== CSS_VERSION) {
        localStorage.removeItem('light-theme-css');
        localStorage.removeItem('dark-theme-css');
    }
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.add(`${savedTheme}-theme`);
    
    // 尝试从缓存应用主题
    const cachedCSS = localStorage.getItem(`${savedTheme}-theme-css`);
    if (cachedCSS && cachedVersion === CSS_VERSION) {
        const styleElem = document.createElement('style');
        styleElem.id = 'theme-css';
        styleElem.textContent = cachedCSS;
        document.head.appendChild(styleElem);
    } else {
        // 如果没有缓存或版本不匹配，使用传统方式
        const styleLink = document.createElement('link');
        styleLink.id = 'theme-css';
        styleLink.rel = 'stylesheet';
        styleLink.href = `/static/css/${savedTheme}-theme.css?v=${Date.now()}`;
        document.head.appendChild(styleLink);
    }
})();

// 在全局范围内暴露applyTheme函数
window.applyTheme = applyTheme;
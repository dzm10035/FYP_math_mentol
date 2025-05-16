// Preference related functions
let currentPreferences = null;

const uiTranslations = window.uiTranslations || {
    en: {
        preferencesTitle: "Preferences",
        languageSettings: "Language Settings",
        themeSettings: "Theme Settings",
        mathTopics: "Math Topics",
        cancelButton: "Cancel",
        saveSettingsButton: "Save Settings",
        profileLink: "Profile",
        preferencesLinkMenu: "Preferences",
        changePasswordLink: "Change Password",
        logoutLink: "Logout",
        adminPanelLink: "Admin Panel",
        lightThemeLabel: "Light Theme",
        darkThemeLabel: "Dark Theme",
        profileModalTitle: "Profile",
        saveChangesButton: "Save Changes",
        changePasswordModalTitle: "Change Password",
        changePasswordButton: "Change Password",
    },
    zh: {
        preferencesTitle: "偏好设置",
        languageSettings: "语言设置",
        themeSettings: "主题设置",
        mathTopics: "数学主题",
        cancelButton: "取消",
        saveSettingsButton: "保存设置",
        profileLink: "个人资料",
        preferencesLinkMenu: "偏好设置",
        changePasswordLink: "修改密码",
        logoutLink: "登出",
        adminPanelLink: "管理员面板",
        lightThemeLabel: "亮色主题",
        darkThemeLabel: "暗色主题",
        profileModalTitle: "个人资料",
        saveChangesButton: "保存更改",
        changePasswordModalTitle: "修改密码",
        changePasswordButton: "修改密码",
    },
    ms: {
        preferencesTitle: "Keutamaan",
        languageSettings: "Tetapan Bahasa",
        themeSettings: "Tetapan Tema",
        mathTopics: "Topik Matematik",
        cancelButton: "Batal",
        saveSettingsButton: "Simpan Tetapan",
        profileLink: "Profil",
        preferencesLinkMenu: "Keutamaan",
        changePasswordLink: "Tukar Kata Laluan",
        logoutLink: "Log Keluar",
        adminPanelLink: "Panel Pentadbir",
        lightThemeLabel: "Tema Cerah",
        darkThemeLabel: "Tema Gelap",
        profileModalTitle: "Profil",
        saveChangesButton: "Simpan Perubahan",
        changePasswordModalTitle: "Tukar Kata Laluan",
        changePasswordButton: "Tukar Kata Laluan",
    }
};
window.uiTranslations = uiTranslations; // Make sure it's globally available for chat.js if needed

function updateLimitedUIText(lang) {
    const translations = uiTranslations[lang] || uiTranslations.zh;
    const prefModal = document.getElementById('preferencesModal');
    if (prefModal) {
        const titleEl = prefModal.querySelector('.preferences-header h2');
        if (titleEl) titleEl.textContent = translations.preferencesTitle;
        
        const sectionTitles = prefModal.querySelectorAll('.preferences-body .pref-section .pref-title');
        if (sectionTitles.length >= 3) {
            // Attempt to update text node for elements with icons
            const updateNodeText = (el, text) => {
                for(let i = 0; i < el.childNodes.length; i++) {
                    if(el.childNodes[i].nodeType === Node.TEXT_NODE && el.childNodes[i].nodeValue.trim() !== '') {
                        el.childNodes[i].nodeValue = ` ${text}`;
                        break;
                    }
                }
            };
            updateNodeText(sectionTitles[0], translations.languageSettings);
            updateNodeText(sectionTitles[1], translations.themeSettings);
            updateNodeText(sectionTitles[2], translations.mathTopics);
        }
        const cancelBtn = prefModal.querySelector('.cancel-btn');
        if (cancelBtn) cancelBtn.textContent = translations.cancelButton;
        const saveBtn = prefModal.querySelector('.save-btn');
        if (saveBtn) saveBtn.textContent = translations.saveSettingsButton;
    }
    // Add other critical UI elements here if they were working before and are simple
    document.documentElement.lang = lang;
}

// Show preferences dialog
function showPreferences() {
    // Load existing preferences
    loadUserPreferences().then(() => {
        document.getElementById('preferencesModal').classList.add('active');
    });
}

// 处理语言变化并更新数学主题
function handleLanguageChange(lang) {
    // This function is called when the radio button INSIDE the preferences modal changes.
    document.documentElement.lang = lang; // Good for CSS or other dynamic lang-based rules
    loadMathTopics(lang);       // Updates math topics list inside the modal
    updateLimitedUIText(lang);  // Updates text inside the modal for preview
}

// 从API获取并更新数学主题的翻译
async function updateMathTopics(lang) {
    // 这个函数已被loadMathTopics替代，保留以兼容旧代码
    await loadMathTopics(lang);
}

// Load user preferences
async function loadUserPreferences() {
    try {
        const data = await window.getUserPreferences();
        let languageToUse = 'zh'; // Default to Chinese

        if (data && data.success && data.preferences) {
            currentPreferences = data.preferences;
            languageToUse = currentPreferences.language || 'zh';
        } else {
            currentPreferences = { language: 'zh', math_topics: [] };
        }
        
        await loadMathTopics(languageToUse); // Load topics for the modal
        
        const languageRadio = document.getElementById(`lang-${languageToUse}`);
        if (languageRadio) {
            languageRadio.checked = true;
        }
        
        updateLimitedUIText(languageToUse); // Update modal text
        // DO NOT call full updateUIText here if it breaks things. Focus on modal + default lang.

        // Theme and math topics selection in modal (remains as before)
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.querySelectorAll('.theme-preview').forEach(preview => {
            preview.style.borderColor = 'transparent';
            preview.style.transform = 'none';
        });
        const activeThemePreview = document.querySelector(`.${currentTheme}-theme-option .theme-preview`);
        if (activeThemePreview) {
            activeThemePreview.style.borderColor = 'var(--accent-color)';
            activeThemePreview.style.transform = 'scale(1.05)';
        }
        const mathTopics = currentPreferences.math_topics || [];
        mathTopics.forEach(topic => {
            const checkbox = document.getElementById(`topic-${topic}`);
            if (checkbox) {
                checkbox.checked = true;
                const topicChip = checkbox.closest('.topic-chip');
                if (topicChip) topicChip.classList.add('selected');
            }
        });

    } catch (error) {
        console.error('Failed to load preferences:', error);
        currentPreferences = { language: 'zh', math_topics: [] };
        await loadMathTopics('zh');
        updateLimitedUIText('zh');
        const langRadioZh = document.getElementById('lang-zh');
        if (langRadioZh) langRadioZh.checked = true;
    }
}

// 初始化加载数学主题
async function loadMathTopics(forcedLanguage = null) {
    try {
        let language;
        if (forcedLanguage) {
            language = forcedLanguage;
        } else {
            // Fallback to selected radio or 'zh' if modal is open, otherwise use currentPreferences or 'zh'
            const selectedRadio = document.querySelector('input[name="language"]:checked');
            if (selectedRadio) {
                language = selectedRadio.value;
            } else if (currentPreferences && currentPreferences.language) {
                language = currentPreferences.language;
            } else {
                language = 'zh';
            }
        }
        
        const response = await fetch(`/api/math_topics/${language}`);
        if (!response.ok) {
            throw new Error(`Failed to load math topics (status: ${response.status})`);
        }
        
        const mathTopicsData = await response.json();
        
        const topicsGrid = document.querySelector('.topics-grid');
        if (!topicsGrid) return;
        
        topicsGrid.innerHTML = '';
        
        Object.entries(mathTopicsData).forEach(([topicKey, topicName]) => {
            const topicChip = document.createElement('div');
            topicChip.className = 'topic-chip';
            
            topicChip.innerHTML = `
                <input type="checkbox" id="topic-${topicKey}" name="mathTopics" value="${topicKey}">
                <label for="topic-${topicKey}">${topicName}</label>
            `;
            
            topicsGrid.appendChild(topicChip);
            
            const checkbox = topicChip.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    topicChip.classList.toggle('selected', checkbox.checked);
                });
            }
        });
        
        // Re-check previously selected topics if currentPreferences is available
        if (currentPreferences && currentPreferences.math_topics) {
            currentPreferences.math_topics.forEach(topicKey => {
                const checkbox = document.getElementById(`topic-${topicKey}`);
                if (checkbox) {
                    checkbox.checked = true;
                    const topicChip = checkbox.closest('.topic-chip');
                    if (topicChip) topicChip.classList.add('selected');
                }
            });
        }
        
    } catch (error) {
        console.error('Failed to load math topics:', error);
    }
}

// Save user preferences
async function savePreferences(event) {
    event.preventDefault();
    const selectedLanguageInput = document.querySelector('input[name="language"]:checked');
    const language = selectedLanguageInput ? selectedLanguageInput.value : 'zh';
    const mathTopicsCheckboxes = document.querySelectorAll('input[name="mathTopics"]:checked');
    const preferencesToSave = {
        preferred_language: language,
        math_topics: Array.from(mathTopicsCheckboxes).map(cb => cb.value)
    };

    try {
        const response = await window.updatePreferences(preferencesToSave);
        if (response && response.success) {
            // Update global currentPreferences IMMEDIATELY
            currentPreferences = {
                language: language,
                math_topics: preferencesToSave.math_topics
            };
            window.currentPreferences = currentPreferences; 
            document.documentElement.lang = language; // Update HTML lang attribute

            // Call this for suggestion cards on the main page
            if (typeof window.loadAndRenderSuggestionCards === 'function') {
                window.loadAndRenderSuggestionCards();
            }

            updateLimitedUIText(language); // Update limited UI (e.g., modal if it were to stay open)

            const prefBody = document.querySelector('.preferences-body');
            showSuccessMessage(prefBody, 'Preferences updated!');
            setTimeout(() => closeModal('preferencesModal'), 500);
        } else {
            showModalMessage('preferencesForm', 'error', (response && response.error) || 'update failed');
        }
    } catch (error) {
        console.error('Preference update error:', error);
        showModalMessage('preferencesForm', 'error', 'update failed: ' + error.message);
    }
}

// 专门用于显示成功消息的函数
function showSuccessMessage(container, message) {
    if (!container) {
        console.error('Container element not found for success message');
        return;
    }
    
    // 清除可能已存在的消息
    const existingMessages = document.querySelectorAll('.success-message');
    existingMessages.forEach(msg => {
        if (msg.parentNode) {
            msg.parentNode.removeChild(msg);
        }
    });
    
    // 创建成功消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = 'form-message success-message';
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.zIndex = '2100';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.width = '300px';
    messageDiv.style.padding = '20px';
    messageDiv.style.backgroundColor = 'rgba(34, 139, 34, 0.9)';
    messageDiv.style.color = '#ddd';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.borderRadius = '8px';
    messageDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    messageDiv.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    
    // 插入到body中，而不是容器中，避免溢出问题
    document.body.appendChild(messageDiv);
    
    // 设置定时器，2秒后消失
    setTimeout(() => {
        if (messageDiv.parentNode) {
            // 添加淡出动画
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translate(-50%, -70%)';
            messageDiv.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 0);
        }
    }, 500);
}

// 主题切换函数
function applyTheme(theme) {
    const themeToggleFunction = window.applyTheme || (window.toggleTheme && (() => window.toggleTheme()));
    
    // 如果当前主题与选择的不同，则切换
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme !== theme && themeToggleFunction) {
        themeToggleFunction(theme);
        
        // 更新主题预览样式
        document.querySelectorAll('.theme-preview').forEach(preview => {
            preview.style.borderColor = 'transparent';
            preview.style.transform = 'none';
        });
        const activeThemePreview = document.querySelector(`.${theme}-preview`);
        if (activeThemePreview) {
            activeThemePreview.style.borderColor = 'var(--accent-color)';
            activeThemePreview.style.transform = 'scale(1.05)';
        }
    }
}

// Show modal message
function showModalMessage(formId, type, message) {
    const form = document.getElementById(formId);
    const existingMessage = form.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}-message`;
    messageDiv.textContent = message;
    form.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            // 添加淡出动画
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 500);
        }
    }, 3500);
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Show personal information modal
function showProfile() {
    document.getElementById('profileModal').classList.add('active');
}

// Update personal information
function updateProfile(event) {
    // 基本的事件处理
    if (event) {
        event.preventDefault();
    }
    
    // 获取表单数据
    const username = document.getElementById('profileUsername').value;
    const email = document.getElementById('profileEmail').value;
    
    // 禁用提交按钮
    const submitButton = document.querySelector('#profileForm button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
    }
    
    // 使用普通的XMLHttpRequest而不是window.updateProfile
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/update-profile', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = function() {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Changes';
        }
        
        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    // 显示成功消息
                    showSuccessMessage(document.body, 'Profile updated successfully!');
                    
                    // 更新用户名显示
                    const userMenuButton = document.querySelector('.user-menu-button span');
                    if (userMenuButton) {
                        userMenuButton.textContent = username;
                    }
                    
                    // 设置合理的延迟关闭模态框
                    setTimeout(() => {
                        const modal = document.getElementById('profileModal');
                        if (modal) {
                            modal.classList.remove('active');
                        }
                    }, 500);
                } else {
                    // 显示简单的错误信息
                    alert(response.error || 'Update failed');
                }
            } catch (e) {
                alert('Invalid response from server');
            }
        } else if (xhr.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
        } else {
            alert('Failed to update profile');
        }
    };
    
    xhr.onerror = function() {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Changes';
        }
        alert('Network error, please try again');
    };
    
    // 发送请求
    xhr.send(JSON.stringify({
        username: username,
        email: email
    }));
}

// Show change password modal
function showChangePassword() {
    document.getElementById('passwordModal').classList.add('active');
}

// Change password
async function handlePasswordChange(event) {
    // 允许函数在没有事件对象的情况下也能运行
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    
    // 更健壮的获取元素值的方式
    const currentPasswordEl = document.getElementById('currentPassword');
    const newPasswordEl = document.getElementById('newPassword');
    const newPasswordNameEl = document.querySelector('input[name="newpassword"]');
    const confirmNewPasswordEl = document.getElementById('confirmNewPassword');
    
    if (!currentPasswordEl) {
        console.error('Current password field not found');
        showModalMessage('passwordForm', 'error', 'Form error: Current password field not found');
        return;
    }
    
    if (!newPasswordEl && !newPasswordNameEl) {
        console.error('New password field not found');
        showModalMessage('passwordForm', 'error', 'Form error: New password field not found');
        return;
    }
    
    if (!confirmNewPasswordEl) {
        console.error('Confirm password field not found');
        showModalMessage('passwordForm', 'error', 'Form error: Confirm password field not found');
        return;
    }
    
    const currentPassword = currentPasswordEl.value;
    const newPassword = newPasswordEl ? newPasswordEl.value : (newPasswordNameEl ? newPasswordNameEl.value : '');
    const confirmNewPassword = confirmNewPasswordEl.value;
    
    if (!newPassword) {
        showModalMessage('passwordForm', 'error', 'Please enter a new password');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        showModalMessage('passwordForm', 'error', 'New passwords do not match');
        return;
    }
    
    try {
        const response = await window.apiChangePassword({
            current_password: currentPassword,
            new_password: newPassword
        });
        
        if (response && response.success) {
            // 使用正确的容器选择器
            const passwordBody = document.querySelector('#passwordModal .modal-content');
            if (passwordBody) {
                showSuccessMessage(passwordBody, 'Password changed successfully!');
                
                // 清空表单字段
                if (currentPasswordEl) currentPasswordEl.value = '';
                if (newPasswordEl) newPasswordEl.value = '';
                if (newPasswordNameEl) newPasswordNameEl.value = '';
                if (confirmNewPasswordEl) confirmNewPasswordEl.value = '';
                
                // 设置合理的延迟关闭模态框
                setTimeout(() => {
                    closeModal('passwordModal');
                }, 1500);
            } else {
                console.error('Password modal content not found');
                // 备用方案
                showModalMessage('passwordForm', 'success', 'Password changed successfully!');
                setTimeout(() => {
                    closeModal('passwordModal');
                }, 1500);
            }
        } else {
            showModalMessage('passwordForm', 'error', (response && response.error) || 'Password change failed');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showModalMessage('passwordForm', 'error', 'Password change failed: ' + (error.message || 'Unknown error'));
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', async function() {
    // Initial load of user preferences for UI text update
    try {
        const data = await window.getUserPreferences();
        let initialLang = 'zh'; 
        if (data && data.success && data.preferences && data.preferences.language) {
            currentPreferences = data.preferences; 
            initialLang = data.preferences.language;
        } else {
            currentPreferences = { language: 'zh', math_topics: [] };
        }
        document.documentElement.lang = initialLang; 
        updateLimitedUIText(initialLang); // For any initially visible UI managed by this limited update
    } catch (error) {
        console.error('Failed to load initial preferences for UI:', error);
        currentPreferences = { language: 'zh', math_topics: [] };
        document.documentElement.lang = 'zh'; 
        updateLimitedUIText('zh'); 
    }

    // Add preferences form submission event
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', savePreferences);
    }
    
    // Add personal information form submission event
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.removeEventListener('submit', window.updateProfile);
        profileForm.addEventListener('submit', window.updateProfile);
    }
    
    // Add change password form submission event
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', window.handlePasswordChange);
    }
    
    document.querySelectorAll('.checkbox-label').forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                label.classList.toggle('selected', checkbox.checked);
            });
        }
    });
    
    const userMenuButton = document.querySelector('.user-menu-button');
    if (userMenuButton) {
        userMenuButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            const userMenuContent = document.querySelector('.user-menu-content');
            if (userMenuContent) {
                userMenuContent.style.display = userMenuContent.style.display === 'block' ? 'none' : 'block';
            }
        });
    } else {
        console.error('User menu button not found');
    }
    
    const profileLink = document.querySelector('.profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', function(event) {
            event.preventDefault();
            showProfile();
            document.querySelector('.user-menu-content').style.display = 'none';
        });
    }
    
    const preferencesLink = document.querySelector('.preferences-link');
    if (preferencesLink) {
        preferencesLink.addEventListener('click', function(event) {
            event.preventDefault();
            showPreferences();
            document.querySelector('.user-menu-content').style.display = 'none';
        });
    }
    
    const changePasswordLink = document.querySelector('.change-password-link');
    if (changePasswordLink) {
        changePasswordLink.addEventListener('click', function(event) {
            event.preventDefault();
            showChangePassword();
            document.querySelector('.user-menu-content').style.display = 'none';
        });
    }
    
    document.addEventListener('click', function(event) {
        const userMenuContent = document.querySelector('.user-menu-content');
        const userMenuButton = document.querySelector('.user-menu-button');
        
        if (userMenuContent && 
            userMenuContent.style.display === 'block' && 
            !userMenuContent.contains(event.target) && 
            (userMenuButton && !userMenuButton.contains(event.target))) {
            userMenuContent.style.display = 'none';
        }
    });
    
    initPasswordToggles();
    
    const languageOptions = document.querySelectorAll('input[name="language"]');
    languageOptions.forEach(option => {
        option.addEventListener('change', function() {
            if (this.checked) {
                handleLanguageChange(this.value);
            }
        });
    });
});

// Export functions for global use
window.showPreferences = showPreferences;
window.showProfile = showProfile;
window.showChangePassword = showChangePassword;
window.closeModal = closeModal;
window.handlePasswordChange = handlePasswordChange;
window.changePassword = handlePasswordChange; // 为了向后兼容

function initPasswordToggles() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    
    passwordInputs.forEach(input => {
        // 如果输入框已经在容器内，不重复包装
        if (input.parentElement.classList.contains('password-input-container')) {
            return;
        }
        
        // 获取原始的表单组
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;
        
        // 创建包装容器
        const container = document.createElement('div');
        container.className = 'password-input-container';
        
        // 将原始输入框替换为包装后的输入框
        input.parentNode.insertBefore(container, input);
        container.appendChild(input);
        
        // 创建切换按钮
        // 在user.js中的initPasswordToggles函数内
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'password-toggle password-toggle-btn'; 
        toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        `;
        container.appendChild(toggleBtn);
        
        // 添加点击事件
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault(); // 防止表单提交
            e.stopPropagation(); // 阻止事件冒泡
            
            // 切换密码可见性
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            // 更改图标
            if (type === 'password') {
                toggleBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                `;
            } else {
                toggleBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                `;
            }
        });
    });
}
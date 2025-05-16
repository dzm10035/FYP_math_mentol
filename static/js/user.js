// Preference related functions
let currentPreferences = null;

// Show preferences dialog
function showPreferences() {
    // Load existing preferences
    loadUserPreferences().then(() => {
        document.getElementById('preferencesModal').classList.add('active');
    });
}

// Load user preferences
async function loadUserPreferences() {
    try {
        const data = await window.getUserPreferences();
        if (!data || !data.success) return;
        
        currentPreferences = data.preferences;
        
        // Fill language selection
        const language = currentPreferences.language || 'zh';
        const languageRadio = document.getElementById(`lang-${language}`);
        if (languageRadio) {
            languageRadio.checked = true;
        }
        
        // Select current theme
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.querySelectorAll('.theme-preview').forEach(preview => {
            preview.style.borderColor = 'transparent';
        });
        const activeThemePreview = document.querySelector(`.${currentTheme}-preview`);
        if (activeThemePreview) {
            activeThemePreview.style.borderColor = 'var(--accent-color)';
            activeThemePreview.style.transform = 'scale(1.05)';
        }
        
        // Fill math topics selection
        const mathTopics = currentPreferences.math_topics || [];
        const checkboxes = document.querySelectorAll('input[name="mathTopics"]');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = mathTopics.includes(checkbox.value);
        });
    } catch (error) {
        console.error('Failed to load preferences:', error);
        showModalMessage('preferencesForm', 'error', 'load preferences failed: ' + error.message);
    }
}

// Save user preferences
async function savePreferences(event) {
    event.preventDefault();
    
    // Get selected language
    const selectedLanguage = document.querySelector('input[name="language"]:checked');
    const language = selectedLanguage ? selectedLanguage.value : 'zh';
    
    // Get selected math topics
    const mathTopicsCheckboxes = document.querySelectorAll('input[name="mathTopics"]:checked');
    
    const preferences = {
        preferred_language: language,
        math_topics: Array.from(mathTopicsCheckboxes).map(cb => cb.value)
    };
    
    try {
        const response = await window.updatePreferences(preferences);
        if (response && response.success) {
            // 显示成功消息在更明显的位置
            const prefBody = document.querySelector('.preferences-body');
            showSuccessMessage(prefBody, 'preferences updated!');
            
            // 设置合理的延迟关闭模态框
            setTimeout(() => {
                closeModal('preferencesModal');
            }, 500);
        } else {
            showModalMessage('preferencesForm', 'error', response.error || 'update failed');
        }
    } catch (error) {
        console.error('Preference update error:', error);
        showModalMessage('preferencesForm', 'error', 'update failed: ' + error.message);
    }
}

// 专门用于显示成功消息的函数
function showSuccessMessage(container, message) {
    // 清除可能已存在的消息
    const existingMessage = container.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 创建成功消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message success-message';
    messageDiv.textContent = message;
    
    // 插入到内容区
    container.appendChild(messageDiv);
    
    // 设置定时器，3.5秒后消失
    setTimeout(() => {
        if (messageDiv.parentNode) {
            // 添加淡出动画
            messageDiv.style.opacity = '0';
            
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 500);
        }
    }, 2000);
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
    const existingMessage = form.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
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
async function updateProfile(event) {
    event.preventDefault();
    
    const username = document.getElementById('profileUsername').value;
    const email = document.getElementById('profileEmail').value;
    
    try {
        const response = await window.updateProfile({
            username,
            email
        });
        
        if (response && response.success) {
            showModalMessage('profileForm', 'success', 'Profile updated successfully!');
            setTimeout(() => {
                closeModal('profileModal');
            }, 1500);
        } else {
            showModalMessage('profileForm', 'error', response.error || 'Update failed');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showModalMessage('profileForm', 'error', 'Update failed: ' + error.message);
    }
}

// Show change password modal
function showChangePassword() {
    document.getElementById('passwordModal').classList.add('active');
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
        showModalMessage('passwordForm', 'error', 'New passwords do not match');
        return;
    }
    
    try {
        const response = await window.changePassword({
            current_password: currentPassword,
            new_password: newPassword
        });
        
        if (response && response.success) {
            showModalMessage('passwordForm', 'success', 'Password changed successfully!');
            setTimeout(() => {
                closeModal('passwordModal');
            }, 1500);
            
            // Clear form
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
        } else {
            showModalMessage('passwordForm', 'error', response.error || 'Password change failed');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showModalMessage('passwordForm', 'error', 'Password change failed: ' + error.message);
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add preferences form submission event
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', savePreferences);
    }
    
    // Add personal information form submission event
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
    
    // Add change password form submission event
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', changePassword);
    }
    
    // Add checkbox selection effect
    document.querySelectorAll('.checkbox-label').forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    label.classList.add('selected');
                } else {
                    label.classList.remove('selected');
                }
            });
        }
    });
    
    // User menu toggle
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
    
    // Add menu item click handlers
    const profileLink = document.querySelector('.profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', function(event) {
            event.preventDefault();
            console.log('Profile link clicked');
            showProfile();
            document.querySelector('.user-menu-content').style.display = 'none';
        });
    }
    
    const preferencesLink = document.querySelector('.preferences-link');
    if (preferencesLink) {
        preferencesLink.addEventListener('click', function(event) {
            event.preventDefault();
            console.log('Preferences link clicked');
            showPreferences();
            document.querySelector('.user-menu-content').style.display = 'none';
        });
    }
    
    const changePasswordLink = document.querySelector('.change-password-link');
    if (changePasswordLink) {
        changePasswordLink.addEventListener('click', function(event) {
            event.preventDefault();
            console.log('Change password link clicked');
            showChangePassword();
            document.querySelector('.user-menu-content').style.display = 'none';
        });
    }
    
    // Close user menu when clicking outside
    document.addEventListener('click', function(event) {
        const userMenuContent = document.querySelector('.user-menu-content');
        const userMenuButton = document.querySelector('.user-menu-button');
        
        if (userMenuContent && 
            userMenuContent.style.display === 'block' && 
            !userMenuContent.contains(event.target) && 
            !userMenuButton.contains(event.target)) {
            userMenuContent.style.display = 'none';
        }
    });
    
    // Initialize password toggles
    initPasswordToggles();
});

// Export functions for global use
window.showPreferences = showPreferences;
window.showProfile = showProfile;
window.showChangePassword = showChangePassword;
window.closeModal = closeModal;

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
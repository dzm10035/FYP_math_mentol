// 确保主题初始化
(function() {
    // 检查是否已经有主题类
    const hasLightTheme = document.body.classList.contains('light-theme');
    const hasDarkTheme = document.body.classList.contains('dark-theme');
    
    if (!hasLightTheme && !hasDarkTheme) {
        // 从localStorage获取保存的主题，默认为light
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.add(`${savedTheme}-theme`);
        
        // 同步更新图标显示
        const moonIcon = document.querySelector('.moon-icon');
        const sunIcon = document.querySelector('.sun-icon');
        if (moonIcon && sunIcon) {
            if (savedTheme === 'dark') {
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'block';
            } else {
                moonIcon.style.display = 'block';
                sunIcon.style.display = 'none';
            }
        }
        
        console.log('应用主题:', savedTheme);
    }
})();

// Show tab function
function showTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.tab');
    
    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

// Show message function
function showMessage(message, type = 'error') {
    // 清除所有现有的错误消息
    document.querySelectorAll('.input-error').forEach(error => {
        error.style.display = 'none';
        error.textContent = '';
    });
    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
    });
    
    // 确定当前显示的表单
    const isLoginForm = document.getElementById('loginForm').style.display !== 'none';
    const messageContainer = document.getElementById(isLoginForm ? 'loginMessage' : 'registerMessage');
    
    if (messageContainer) {
        // 清除现有消息
        messageContainer.innerHTML = '';
        
        // 创建新消息元素
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;  // 使用auth.html中定义的样式类
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        // 添加消息到容器
        messageContainer.appendChild(messageElement);
        
        // 直接设置样式，确保消息可见
        if (type === 'success') {
            messageElement.style.backgroundColor = '#efe';
            messageElement.style.color = '#0a0';
            messageElement.style.border = '1px solid #0a0';
            messageElement.style.padding = '10px';
            messageElement.style.borderRadius = '4px';
            messageElement.style.textAlign = 'center';
            messageElement.style.marginTop = '10px';
            
            // 如果是成功消息，3秒后自动移除
            setTimeout(() => {
                messageElement.remove();
            }, 3000);
        } else {
            messageElement.style.backgroundColor = '#fee';
            messageElement.style.color = '#c00';
            messageElement.style.border = '1px solid #c00';
            messageElement.style.padding = '10px';
            messageElement.style.borderRadius = '4px';
            messageElement.style.textAlign = 'center';
            messageElement.style.marginTop = '10px';
        }
    } else {
        console.error('Message container not found');
    }
}

// Email validation
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Password validation
function isValidPassword(password) {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);
}

// Username validation
function isValidUsername(username) {
    return /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,30}$/.test(username);
}

// Show input error
function showInputError(input, message) {
    const errorDiv = input.parentElement.querySelector('.input-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        input.classList.add('error');
    }
}

// Clear input error
function clearInputError(input) {
    const errorDiv = input.parentElement.querySelector('.input-error');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        input.classList.remove('error');
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');

    // Clear previous errors
    clearInputError(emailInput);
    clearInputError(passwordInput);

    // Validate email
    if (!isValidEmail(emailInput.value)) {
        showInputError(emailInput, 'please enter a valid email address');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: emailInput.value, 
                password: passwordInput.value 
            })
        });

        const data = await response.json();
        if (response.ok) {
            // Store user info in localStorage
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            
            showMessage('login success, redirecting...', 'success');
            // add 2 seconds delay, so the user can see the success message
            await new Promise(resolve => setTimeout(resolve, 2000));
            window.location.href = '/';
        } else {
            if (response.status === 401) {
                showInputError(emailInput, 'email or password error');
                showInputError(passwordInput, 'email or password error');
                passwordInput.value = ''; // Clear password field
            } else {
                showMessage(data.error || 'login failed, please try again');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('login failed, please try again');
    }
}

// Handle register form submission
async function handleRegister(event) {
    event.preventDefault();
    
    // 防止重复提交
    const submitButton = event.target.querySelector('button[type="submit"]');
    if (submitButton.disabled) {
        return;
    }
    submitButton.disabled = true;
    
    const form = event.target;
    const emailInput = form.querySelector('input[name="email"]');
    const usernameInput = form.querySelector('input[name="username"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const confirmPasswordInput = form.querySelector('input[name="confirmPassword"]');
    const language = form.querySelector('select[name="language"]').value;

    try {
        // Clear previous errors
        clearInputError(emailInput);
        clearInputError(usernameInput);
        clearInputError(passwordInput);
        clearInputError(confirmPasswordInput);

        // Validate email
        if (!isValidEmail(emailInput.value)) {
            showInputError(emailInput, 'Please enter a valid email address');
            submitButton.disabled = false;
            return;
        }

        // Validate username
        if (!isValidUsername(usernameInput.value)) {
            showInputError(usernameInput, 'Username must be 2-30 characters long and can only contain letters, numbers, underscores, and Chinese characters');
            submitButton.disabled = false;
            return;
        }

        // Validate password
        if (!isValidPassword(passwordInput.value)) {
            showInputError(passwordInput, 'Password must be at least 6 characters long and contain both letters and numbers');
            submitButton.disabled = false;
            return;
        }

        // Validate password confirmation
        if (passwordInput.value !== confirmPasswordInput.value) {
            showInputError(confirmPasswordInput, 'The passwords you entered do not match');
            submitButton.disabled = false;
            return;
        }

        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: emailInput.value,
                username: usernameInput.value,
                password: passwordInput.value, 
                language 
            })
        });

        const data = await response.json();
        console.log('Register response:', response.status, data);
        
        if (response.status === 200) {
            // Store user info in localStorage
            const userInfo = {
                email: emailInput.value,
                username: usernameInput.value,
                language: language,
                ...data.user
            };
            localStorage.setItem('user', JSON.stringify(userInfo));
            
            showMessage('registration successful, redirecting...', 'success');
            await new Promise(resolve => setTimeout(resolve, 2000));
            window.location.href = '/';
            return;
        } else if (response.status === 409) {
            const errorType = data.error;
            if (errorType === 'email_exists') {
                showInputError(emailInput, 'this email is already registered');
            } else if (errorType === 'username_exists') {
                showInputError(usernameInput, 'this username is already taken');
            } else {
                showMessage('registration failed: ' + data.error);
            }
        } else {
            showMessage(data.error || 'registration failed, please try again');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Registration failed, please try again');
    } finally {
        // 延迟一秒后重新启用提交按钮
        setTimeout(() => {
            submitButton.disabled = false;
        }, 1000);
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// 添加复选框选中效果
document.querySelectorAll('.checkbox-label').forEach(label => {
    const checkbox = label.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }
    });
});

// Show login form
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => {
        if (tab.textContent === 'Login') {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// Show register form
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => {
        if (tab.textContent === 'Register') {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// Tab click handler
function showTab(tabName) {
    if (tabName === 'login') {
        showLoginForm();
    } else {
        showRegisterForm();
    }
}

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
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button'; // 防止在表单中提交
        toggleBtn.className = 'password-toggle';
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

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initPasswordToggles();
});

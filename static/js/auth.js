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
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        // 添加消息到容器
        messageContainer.appendChild(messageElement);
        
        // 如果是成功消息，3秒后自动移除
        if (type === 'success') {
            setTimeout(() => {
                messageElement.remove();
            }, 3000);
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

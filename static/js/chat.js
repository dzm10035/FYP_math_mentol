let currentSessionId = null;

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.querySelector('.send-button');
const newChatButton = document.querySelector('.new-chat-btn');
const headerNewChatBtn = document.getElementById('headerNewChatBtn');
const chatList = document.getElementById('chat-list');

// Helper function to extract session ID from URL
function getSessionIdFromURL() {
    const path = window.location.pathname;
    // Check if path starts with /chat_ (session ID format)
    if (path.startsWith('/chat_')) {
        return path.substring(1); // Remove leading slash
    }
    return null;
}

// Auto send topic message function
async function autoSendTopicMessage(topicId) {
    try {
        // Get user preferences for language - try multiple sources
        let lang = 'en';
        
        // First try to get from window.currentPreferences
        if (window.currentPreferences && window.currentPreferences.language) {
            lang = window.currentPreferences.language;
        } else {
            // If not available, try to fetch user preferences
            try {
                const prefData = await window.getUserPreferences();
                if (prefData && prefData.success && prefData.preferences && prefData.preferences.language) {
                    lang = prefData.preferences.language;
                    window.currentPreferences = prefData.preferences; // Cache for future use
                }
            } catch (prefError) {
                console.warn('Could not fetch user preferences for language, using default:', prefError);
            }
        }
        
        console.log('Using language for auto-send:', lang);
        
        // Get topic name in the correct language
        const response = await fetch(`/api/math_topics/${lang}`);
        if (response.ok) {
            const allTopics = await response.json();
            const topicName = allTopics[topicId];
            
            if (topicName) {
                // Use the same translations as in the card system
                const translations = {
                    en: "I would like to learn",
                    zh: "我想学习", 
                    ms: "Saya ingin belajar"
                };
                
                const iWouldLikeToLearn = translations[lang] || translations.en;
                const message = `${iWouldLikeToLearn} ${topicName}`;
                
                console.log('Auto-sending message:', message);
                
                // Set message and send
                messageInput.value = message;
                await handleSendMessage();
            } else {
                console.warn('Topic not found:', topicId, 'in language:', lang);
            }
        } else {
            console.error('Failed to fetch topics for language:', lang);
        }
    } catch (error) {
        console.error('Error auto-sending topic message:', error);
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化侧边栏切换按钮
    initSidebarToggle();
    
    // Ensure all DOM elements are loaded
    if (!chatMessages || !messageInput || !sendButton || !chatList) {
        console.error('Unable to find required DOM elements');
        return;
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Auto-adjust textarea height
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Get session ID from URL
    const sessionIdFromURL = getSessionIdFromURL();
    if (sessionIdFromURL) {
        currentSessionId = sessionIdFromURL;
    }
    
    // Load session list
    try {
        await loadChatSessionList();
    } catch (error) {
        console.error('Failed to load chat sessions:', error);
    }
    
    // If there's a session ID from URL, load that chat
    if (currentSessionId) {
        await handleLoadChat(currentSessionId);
        
        // 检查是否需要自动发送主题消息
        const urlParams = new URLSearchParams(window.location.search);
        const autoSendTopic = urlParams.get('autoSendTopic');
        if (autoSendTopic) {
            // 清除 URL 参数
            window.history.replaceState({}, '', `/${currentSessionId}`);
            
            // 稍微延迟一下，确保所有组件都已加载
            setTimeout(async () => {
                await autoSendTopicMessage(autoSendTopic);
            }, 500);
        }
    } else {
        // Only show welcome interface if no session ID
        await loadAndRenderSuggestionCards();
    }
});

// 初始化侧边栏切换功能
function initSidebarToggle() {
    console.log('Initializing sidebar toggle...');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('chatHistory');
    
    if (!sidebarToggle) {
        console.error('Sidebar toggle button not found');
        return;
    }
    
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    console.log('Adding click event to sidebar toggle button');
    sidebarToggle.addEventListener('click', function(e) {
        console.log('Sidebar toggle clicked');
        sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed');
        
        // 打印当前状态以便调试
        console.log('Sidebar collapsed:', sidebar.classList.contains('collapsed'));
        console.log('Body sidebar-collapsed:', document.body.classList.contains('sidebar-collapsed'));
        
        e.preventDefault();
        e.stopPropagation();
    });
}

// Set up event listeners
function setupEventListeners() {
    // Send message
    sendButton.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // New chat buttons
    if (headerNewChatBtn) {
        headerNewChatBtn.addEventListener('click', handleNewChat);
    }
    
    if (newChatButton) {
        newChatButton.addEventListener('click', handleNewChat);
    }

    // User menu
    document.querySelector('.user-menu-button').addEventListener('click', toggleUserMenu);
    
    // Click outside to close user menu
    document.addEventListener('click', function(event) {
        const userMenu = document.getElementById('userMenu');
        if (userMenu && !userMenu.contains(event.target)) {
            userMenu.classList.remove('active');
        }
    });
    
    // Chat item event delegation
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.more-btn')) {
            document.querySelectorAll('.more-menu.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });
}

// Load session list
async function loadChatSessionList() {
    try {
        const sessions = await window.loadChatSessions();
        if (!sessions) return;
        
        chatList.innerHTML = '';
        
        sessions.forEach(session => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `chat-item ${session.session_id === currentSessionId ? 'active' : ''}`;
            itemDiv.setAttribute('data-session-id', session.session_id);
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'chat-title';
            titleSpan.textContent = session.title || `Chat - ${new Date(session.updated_at).toLocaleDateString()}`;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'chat-actions';
            
            const moreBtn = document.createElement('button');
            moreBtn.className = 'more-btn';
            moreBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="6" r="2" fill="currentColor"/>
                    <circle cx="12" cy="12" r="2" fill="currentColor"/>
                    <circle cx="12" cy="18" r="2" fill="currentColor"/>
                </svg>
            `;
            
            const moreMenu = document.createElement('div');
            moreMenu.className = 'more-menu';
            moreMenu.innerHTML = `
                <div class="more-menu-item" data-action="edit" data-session-id="${session.session_id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Edit
                </div>
                <div class="more-menu-item delete" data-action="delete" data-session-id="${session.session_id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Delete
                </div>
            `;
            
            // Add event listeners for edit and delete buttons
            moreMenu.querySelector('[data-action="edit"]').addEventListener('click', function(e) {
                e.stopPropagation();
                startEditTitle(e, session.session_id);
            });
            
            moreMenu.querySelector('[data-action="delete"]').addEventListener('click', function(e) {
                e.stopPropagation();
                handleDeleteChat(session.session_id);
            });
            
            moreBtn.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.more-menu.active').forEach(menu => {
                    if (menu !== moreMenu) {
                        menu.classList.remove('active');
                    }
                });
                moreMenu.classList.toggle('active');
            };
            
            // Close menu when mouse leaves
            itemDiv.addEventListener('mouseleave', function() {
                moreMenu.classList.remove('active');
            });
            
            actionsDiv.appendChild(moreBtn);
            actionsDiv.appendChild(moreMenu);
            
            itemDiv.appendChild(titleSpan);
            itemDiv.appendChild(actionsDiv);
            
            // Click to load chat - navigate to URL
            itemDiv.addEventListener('click', function(e) {
                if (e.target.closest('.more-btn') || e.target.closest('.more-menu')) {
                    return;
                }
                
                document.querySelectorAll('.more-menu.active').forEach(menu => {
                    menu.classList.remove('active');
                });
                
                // Navigate to the chat URL
                window.location.href = '/' + session.session_id;
            });
            
            chatList.appendChild(itemDiv);
        });
    } catch (error) {
        console.error('Failed to load chat sessions:', error);
        chatList.innerHTML = `
            <div style="padding: 15px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0;">
                Error: ${error.message}
            </div>
        `;
    }
}

// Handle loading specific chat
async function handleLoadChat(sessionId) {
    try {
        currentSessionId = sessionId;
        
        // Set active status
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`.chat-item[data-session-id="${sessionId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        const messages = await window.loadChat(sessionId);
        if (!messages) return;
        
        // Load chat messages
        chatMessages.innerHTML = '';
        
        messages.forEach(msg => {
            if (msg.role !== 'system') {
                addMessage(msg.content, msg.role === 'user');
            }
        });
        
        // 滚动到合适的位置，留出底部空间
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            // 计算一个合适的滚动位置，留出一些底部空间
            const scrollTarget = chatContainer.scrollHeight - chatContainer.clientHeight * 0.95;
            chatContainer.scrollTop = scrollTarget;
        }
    } catch (error) {
        console.error('Failed to load history:', error);
        addMessage('Error: ' + error.message, false);
    }
}

// Handle sending message
async function handleSendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    try {
        // Disable input field and send button
        messageInput.disabled = true;
        sendButton.disabled = true;
        
        // If no current session, create a new one
        if (!currentSessionId) {
            const data = await window.createNewChat();
            if (!data || !data.success) {
                throw new Error('Failed to create new chat session');
            }
            currentSessionId = data.session_id;
            
            // Update URL without refreshing page
            window.history.pushState({ sessionId: currentSessionId }, '', '/' + currentSessionId);
            
            await loadChatSessionList();
            
            // Clear welcome screen
            chatMessages.innerHTML = '';
            
            // Set active status in sidebar
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            const activeItem = document.querySelector(`.chat-item[data-session-id="${currentSessionId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
        
        // Display user message
        addMessage(message, true);
        messageInput.value = '';
        messageInput.style.height = 'auto'; // Reset height
        
        // Hide welcome container if it's still visible
        const welcomeContainer = document.querySelector('.welcome-container');
        if (welcomeContainer) {
            welcomeContainer.style.display = 'none';
        }
        
        // 创建一个包含新加载动画的消息
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'message-wrapper bot-message-wrapper';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 使用新的加载动画
        contentDiv.innerHTML = `
            <div style="text-align: center;">
                <div class="loader-dots">
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>
        `;
        
        messageDiv.appendChild(contentDiv);
        wrapperDiv.appendChild(messageDiv);
        chatMessages.appendChild(wrapperDiv);
        
        // 滚动到底部
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            const scrollTarget = chatContainer.scrollHeight - 100;
            chatContainer.scrollTop = scrollTarget;
        }
        
        // Send request
        const response = await window.sendMessage(currentSessionId, message);
        
        // 移除加载动画消息
        if (wrapperDiv.parentNode) {
            wrapperDiv.parentNode.removeChild(wrapperDiv);
        }
        
        if (!response) return;
        
        // Display assistant reply
        addMessage(response.response, false);
        
        // Update chat list to show the new session
        if (!document.querySelector(`.chat-item[data-session-id="${currentSessionId}"]`)) {
            await loadChatSessionList();
        }
    } catch (error) {
        console.error('Error:', error);
        // Display error message
        addMessage(`Error: ${error.message}`, false);
    } finally {
        // Re-enable input field and send button
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Handle new chat
async function handleNewChat() {
    try {
        const data = await window.createNewChat();
        if (!data) return;
        
        if (data.success) {
            // Navigate to the new chat URL
            window.location.href = '/' + data.session_id;
        } else {
            addMessage('Error: ' + data.error, false);
        }
    } catch (error) {
        console.error('Failed to create new chat:', error);
        addMessage('Failed to create new chat.', false);
    }
}

// Handle delete chat
async function handleDeleteChat(sessionId) {
    if (confirm(`Are you sure you want to delete this chat?`)) {
        try {
            const data = await window.deleteChat(sessionId);
            if (!data) return;
            
            if (data.success) {
                await loadChatSessionList();
                if (currentSessionId === sessionId) {
                    // Navigate back to home page
                    window.location.href = '/';
                }
            } else {
                addMessage('Error: ' + data.error, false);
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
            addMessage('Failed to delete chat.', false);
        }
    }
}

// Add message to chat UI
function addMessage(content, isUser) {
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = `message-wrapper ${isUser ? 'user-message-wrapper' : 'bot-message-wrapper'}`;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Process Markdown format
    contentDiv.innerHTML = window.formatMarkdown(content, isUser);
    
    // 添加图片点击放大功能
    contentDiv.querySelectorAll('img').forEach(img => {
        img.addEventListener('click', () => {
            showImageOverlay(img.src);
        });
    });
    
    messageDiv.appendChild(contentDiv);
    wrapperDiv.appendChild(messageDiv);
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.appendChild(wrapperDiv);
    
    // 滚动到合适的位置，减小偏移量
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        // 只留出很小的底部空间
        const scrollTarget = chatContainer.scrollHeight - 100;
        chatContainer.scrollTop = scrollTarget;
    }
}

// 显示图片放大层
function showImageOverlay(imageSrc) {
    // 检查是否已存在图片放大层
    let overlay = document.querySelector('.img-overlay');
    
    // 如果不存在，创建一个
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'img-overlay';
        
        const closeBtn = document.createElement('div');
        closeBtn.className = 'close-overlay';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
        });
        
        const img = document.createElement('img');
        overlay.appendChild(img);
        overlay.appendChild(closeBtn);
        
        // 点击图片外部区域关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
        
        // 按ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                overlay.classList.remove('active');
            }
        });
        
        document.body.appendChild(overlay);
    }
    
    // 设置图片源并显示
    const img = overlay.querySelector('img');
    img.src = imageSrc;
    
    // 显示放大层
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
}

// User menu related functions
function toggleUserMenu() {
    document.getElementById('userMenu').classList.toggle('active');
}

function showProfile() {
    document.getElementById('profileModal').classList.add('active');
    document.getElementById('userMenu').classList.remove('active');
}

function showChangePassword() {
    document.getElementById('passwordModal').classList.add('active');
    document.getElementById('userMenu').classList.remove('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Start editing title
function startEditTitle(event, sessionId) {
    event.stopPropagation();
    const chatItem = document.querySelector(`.chat-item[data-session-id="${sessionId}"]`);
    const titleSpan = chatItem.querySelector('.chat-title');
    
    // Save original text
    titleSpan.setAttribute('data-original', titleSpan.textContent);
    
    // Make title editable
    titleSpan.contentEditable = true;
    titleSpan.classList.add('editing');
    titleSpan.focus();
    
    // Close more menu
    document.querySelectorAll('.more-menu.active').forEach(menu => {
        menu.classList.remove('active');
    });
    
    // Add one-time event listeners
    function handleBlur() {
        titleSpan.contentEditable = false;
        titleSpan.classList.remove('editing');
        const newTitle = titleSpan.textContent.trim();
        const originalTitle = titleSpan.getAttribute('data-original');
        
        if (newTitle !== originalTitle && newTitle !== '') {
            handleEditTitle(sessionId, newTitle);
        } else {
            titleSpan.textContent = originalTitle;
        }
        
        titleSpan.removeEventListener('blur', handleBlur);
        titleSpan.removeEventListener('keydown', handleKeyDown);
    }
    
    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleSpan.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            titleSpan.textContent = titleSpan.getAttribute('data-original');
            titleSpan.blur();
        }
    }
    
    titleSpan.addEventListener('blur', handleBlur);
    titleSpan.addEventListener('keydown', handleKeyDown);
}

// Handle edit title
async function handleEditTitle(sessionId, newTitle) {
    try {
        const response = await window.updateChatTitle(sessionId, newTitle);
        if (!response) return;
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to update title');
        }
        
        await loadChatSessionList();  // Reload session list
    } catch (error) {
        console.error('Failed to update title:', error);
        await loadChatSessionList();  // Reload session list on error to restore original title
    }
}

// Export functions for HTML inline use
window.toggleUserMenu = toggleUserMenu;
window.showProfile = showProfile;
window.showChangePassword = showChangePassword;
window.closeModal = closeModal;
window.handleDeleteChat = handleDeleteChat;
window.startEditTitle = startEditTitle;
window.addMessage = addMessage;
window.showImageOverlay = showImageOverlay;

// 切换侧边栏显示/隐藏
function toggleSidebar() {
    console.log('toggleSidebar called');
    const sidebar = document.getElementById('chatHistory');
    
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed');
        console.log('Sidebar toggled:', sidebar.classList.contains('collapsed'));
    } else {
        console.error('Sidebar element not found when toggling');
    }
}

async function loadAndRenderSuggestionCards() {
    // Don't show suggestion cards if we're currently in a chat session
    if (currentSessionId) {
        console.log('Currently in a chat session, not showing suggestion cards');
        return;
    }
    
    const suggestionContainer = document.getElementById('suggestionCardsContainer');
    let welcomeContainer = document.querySelector('.welcome-container');

    // If welcome container doesn't exist, create it
    if (!welcomeContainer) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = `
            <div class="welcome-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; padding-bottom: 20px;">
                <h1 class="typewriter">What can MathMentor help with?</h1>
                <p class="welcome-subtitle" style="color: #666; font-size: 1.1rem; margin-top: 10px;">Ask anything about math, or pick a topic to start:</p>
                <div id="suggestionCardsContainer" class="suggestion-cards-grid" style="margin-top: 20px; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; width: 100%; max-width: 800px;">
                    <!-- Suggestion cards will be dynamically inserted here -->
                </div>
            </div>
        `;
        welcomeContainer = document.querySelector('.welcome-container');
    } else {
        // Make sure welcome container is visible
        welcomeContainer.style.display = 'flex';
    }

    // Get the suggestion container again after potential recreation
    const updatedSuggestionContainer = document.getElementById('suggestionCardsContainer');
    
    if (!updatedSuggestionContainer || !welcomeContainer) {
        console.error('Could not find or create welcome container elements');
        return;
    }

    // Minimal translations needed for card generation and interaction, independent of user.js uiTranslations
    const cardSpecificTranslations = {
        en: {
            askOrPick: "Ask anything about math, or pick a topic to start:",
            askAnythingOnly: "Ask anything about math...",
            iWouldLikeToLearn: "I would like to learn",
            welcomeUser: "What can MathMentor help with?"
        },
        zh: {
            askOrPick: "可以问任何数学问题，或选择一个主题开始：",
            askAnythingOnly: "可以问任何数学问题...",
            iWouldLikeToLearn: "我想学习",
            welcomeUser: "MathMentor 能为你做些什么？"
        },
        ms: {
            askOrPick: "Tanya apa sahaja mengenai matematik, atau pilih topik untuk bermula:",
            askAnythingOnly: "Tanya apa sahaja mengenai matematik...",
            iWouldLikeToLearn: "Saya ingin belajar",
            welcomeUser: "Bagaimana MathMentor boleh membantu anda?"
        }
    };

    let lang = 'en'; // Default language for cards if preferences are not available yet
    let userPreferredTopics = [];

    try {
        if (window.currentPreferences) {
            lang = window.currentPreferences.language || 'en';
            userPreferredTopics = window.currentPreferences.math_topics || [];
        } else {
            // Attempt to fetch if not available, but don't let it block initial card rendering too much
            // This is a fallback, ideally currentPreferences is set by user.js before this runs extensively.
            console.log('currentPreferences not found in chat.js for cards, attempting fetch...');
            const prefData = await window.getUserPreferences(); 
            if (prefData && prefData.success && prefData.preferences) {
                window.currentPreferences = prefData.preferences; // Cache globally
                lang = prefData.preferences.language || 'en';
                userPreferredTopics = prefData.preferences.math_topics || [];
            } else {
                console.warn('Failed to fetch user preferences in chat.js for cards. Using defaults.');
            }
        }

        const currentCardTranslations = cardSpecificTranslations[lang] || cardSpecificTranslations.en;
        
        const response = await fetch(`/api/math_topics/${lang}?v=${new Date().getTime()}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch math topics: ${response.status}`);
        }
        const allTopics = await response.json(); // Expected: {key: "Name", ...}

        const headerElement = document.querySelector('.typewriter');
        if (headerElement) {
            headerElement.textContent = currentCardTranslations.welcomeUser;
        }   

        if (Object.keys(allTopics).length === 0) {
            const subtitle = welcomeContainer.querySelector('.welcome-subtitle');
            if(subtitle) subtitle.textContent = currentCardTranslations.askAnythingOnly;
            updatedSuggestionContainer.innerHTML = '';
            return;
        }

        let topicsToDisplay = {};
        if (userPreferredTopics && userPreferredTopics.length > 0) {
            userPreferredTopics.forEach(key => {
                if (allTopics[key]) {
                    topicsToDisplay[key] = allTopics[key];
                }
            });
            if (Object.keys(topicsToDisplay).length === 0) { // Fallback if preferred topics don't match any from API
                topicsToDisplay = allTopics;
            }
        } else {
            topicsToDisplay = allTopics;
        }
        
        updatedSuggestionContainer.innerHTML = ''; 

        if (Object.keys(topicsToDisplay).length > 0) {
            const subtitle = welcomeContainer.querySelector('.welcome-subtitle');
            if(subtitle) subtitle.textContent = currentCardTranslations.askOrPick;

            Object.entries(topicsToDisplay).forEach(([topicKey, topicName]) => {
                const card = document.createElement('div');
                card.className = 'suggestion-card';
                card.textContent = topicName;
                card.setAttribute('role', 'button');
                card.setAttribute('tabindex', '0');
                card.addEventListener('click', async () => {
                    try {
                        // If no current session, create a new one with topic
                        if (!currentSessionId) {
                            const data = await window.createNewChat(topicKey);
                            if (!data || !data.success) {
                                throw new Error('Failed to create new chat session');
                            }
                            currentSessionId = data.session_id;
                            
                            // Update URL without refreshing page
                            window.history.pushState({ sessionId: currentSessionId }, '', '/' + currentSessionId);
                            
                            await loadChatSessionList();
                            
                            // Set active status in sidebar
                            document.querySelectorAll('.chat-item').forEach(item => {
                                item.classList.remove('active');
                            });
                            const activeItem = document.querySelector(`.chat-item[data-session-id="${currentSessionId}"]`);
                            if (activeItem) {
                                activeItem.classList.add('active');
                            }
                        }
                        
                        // Send the "I want to learn" message
                        const message = `${currentCardTranslations.iWouldLikeToLearn} ${topicName}`;
                        messageInput.value = message;
                        await handleSendMessage();
                        
                    } catch (error) {
                        console.error('Failed to handle topic card click:', error);
                        // Fallback: just set the message
                        const message = `${currentCardTranslations.iWouldLikeToLearn} ${topicName}`;
                        messageInput.value = message;
                    }
                });
                card.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        card.click();
                    }
                });
                updatedSuggestionContainer.appendChild(card);
            });
        } else {
            const subtitle = welcomeContainer.querySelector('.welcome-subtitle');
             if(subtitle) subtitle.textContent = currentCardTranslations.askAnythingOnly;
        }

    } catch (error) {
        console.error('Error loading or rendering suggestion cards:', error);
        const subtitle = welcomeContainer.querySelector('.welcome-subtitle');
        // Fallback to a very basic message on error
        if(subtitle) subtitle.textContent = cardSpecificTranslations.en.askAnythingOnly; 
        if(updatedSuggestionContainer) updatedSuggestionContainer.innerHTML = ''; 
    }
}

// Make it globally accessible if user.js needs to refresh it (e.g., after preference save)
window.loadAndRenderSuggestionCards = loadAndRenderSuggestionCards;

// Global event listener for /chat links
document.addEventListener("click", async function (e) {
    const link = e.target.closest("a[href^='/chat']");
    if (!link) return;

    const url = new URL(link.href, window.location.origin);
    const topicId = url.searchParams.get("topic");
    const isNew = url.searchParams.get("new");

    // 我们只处理 /chat?topic=xxx 或 /chat?new=true，不拦截其他链接
    if (!topicId && !isNew) return;

    e.preventDefault(); // 阻止默认跳转

    try {
        const response = await fetch("/api/new-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(topicId ? { topic_id: topicId } : {})
        });

        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return;
        }

        const data = await response.json();
        if (data?.success && data.session_id) {
            // 如果有 topicId，在 URL 中保存它，这样跳转后可以自动发送消息
            if (topicId) {
                window.location.href = `/${data.session_id}?autoSendTopic=${topicId}`;
            } else {
                window.location.href = `/${data.session_id}`;
            }
        } else {
            alert(`Failed to create session: ${data?.error || 'Unknown error'}`);
        }
    } catch (err) {
        console.error("Error creating session:", err);
        alert("Network or server error.");
    }
});
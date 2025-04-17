let currentSessionId = null;

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.querySelector('.send-button');
const newChatButton = document.querySelector('.new-chat-btn');
const chatList = document.getElementById('chat-list');

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Ensure all DOM elements are loaded
    if (!chatMessages || !messageInput || !sendButton || !newChatButton || !chatList) {
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
    
    // Load session list
    try {
        await loadChatSessionList();
    } catch (error) {
        console.error('Failed to load chat sessions:', error);
    }
});

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

    // New chat
    newChatButton.addEventListener('click', handleNewChat);

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
            
            // Click to load chat
            itemDiv.addEventListener('click', function(e) {
                if (e.target.closest('.more-btn') || e.target.closest('.more-menu')) {
                    return;
                }
                
                document.querySelectorAll('.more-menu.active').forEach(menu => {
                    menu.classList.remove('active');
                });
                
                handleLoadChat(session.session_id);
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
        
        chatMessages.innerHTML = '';
        
        messages.forEach(msg => {
            if (msg.role !== 'system') {
                addMessage(msg.content, msg.role === 'user');
            }
        });
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
        
        // Display loading state
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message-wrapper bot-message-wrapper';
        loadingDiv.innerHTML = '<div class="message bot-message">Thinking...</div>';
        chatMessages.appendChild(loadingDiv);
        
        // Send request
        const response = await window.sendMessage(currentSessionId, message);
        
        // Remove loading state
        loadingDiv.remove();
        
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
            currentSessionId = data.session_id;
            await loadChatSessionList();
            handleLoadChat(currentSessionId);
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
                    // Reset current session ID
                    currentSessionId = null;
                    // Show welcome interface
                    chatMessages.innerHTML = `
                        <div class="welcome-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh;">
                            <h1 class="typewriter">What can MathMentor help with?</h1>
                            <p style="color: #666; font-size: 1.1rem;">Ask anything about math...</p>
                        </div>
                    `;
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
    
    messageDiv.appendChild(contentDiv);
    wrapperDiv.appendChild(messageDiv);
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.appendChild(wrapperDiv);
    
    // Automatically scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
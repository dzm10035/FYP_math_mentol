// API functions for server communication

// Create a new chat session
async function createNewChat() {
    try {
        const response = await fetch('/api/new-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) throw new Error(`Failed to create session: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to create new session:', error);
        return { success: false, error: error.message };
    }
}

// Load chat session list
async function loadChatSessions() {
    try {
        const response = await fetch('/api/sessions');
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to get sessions: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to load chat sessions:', error);
        throw error;
    }
}

// Load specific chat history
async function loadChat(sessionId) {
    try {
        const response = await fetch(`/api/history?session_id=${sessionId}`);
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) throw new Error(`Failed to get history: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to load chat history:', error);
        throw error;
    }
}

// Send message
async function sendMessage(sessionId, message, preferences = null) {
    try {
        // If preferences are not provided, try to get current user preferences
        if (!preferences) {
            try {
                const prefsData = await getUserPreferences();
                if (prefsData && prefsData.success) {
                    preferences = prefsData.preferences;
                }
            } catch (e) {
                // If retrieval fails, use default settings
                console.warn('Unable to get user preferences, using defaults');
                preferences = { language: 'zh', math_topics: [] };
            }
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                session_id: sessionId,
                user_preferences: preferences
            })
        });
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send message');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
    }
}

// Delete chat session
async function deleteChat(sessionId) {
    try {
        const response = await fetch('/api/delete-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        });
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) throw new Error(`Failed to delete session: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to delete chat:', error);
        throw error;
    }
}

// Update user profile
async function updateProfile(data) {
    try {
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update profile');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
    }
}

// Change password
async function changePassword(data) {
    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to change password');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to change password:', error);
        throw error;
    }
}

// Update chat title
async function updateChatTitle(sessionId, title) {
    try {
        const response = await fetch('/api/update-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                session_id: sessionId,
                title: title
            })
        });
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) throw new Error('Failed to update title');
        return await response.json();
    } catch (error) {
        console.error('Failed to update title:', error);
        throw error;
    }
}

// Get user preferences
async function getUserPreferences() {
    try {
        const response = await fetch('/api/get-preferences');
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get preferences');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to get preferences:', error);
        throw error;
    }
}

// Update user preferences
async function updatePreferences(preferences) {
    try {
        const response = await fetch('/api/update-preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences)
        });
        
        if (response.status === 401) {
            alert('Session expired, please log in again');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update preferences');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to update preferences:', error);
        throw error;
    }
}

// Export functions for use in other modules
window.createNewChat = createNewChat;
window.loadChatSessions = loadChatSessions;
window.loadChat = loadChat;
window.sendMessage = sendMessage;
window.deleteChat = deleteChat;
window.updateProfile = updateProfile;
window.changePassword = changePassword;
window.updateChatTitle = updateChatTitle;
window.getUserPreferences = getUserPreferences;
window.updatePreferences = updatePreferences; 
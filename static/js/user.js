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
        const languageSelect = document.getElementById('preferredLanguage');
        languageSelect.value = currentPreferences.language || 'zh';
        
        // Fill math topics selection
        const mathTopics = currentPreferences.math_topics || [];
        const checkboxes = document.querySelectorAll('input[name="mathTopics"]');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = mathTopics.includes(checkbox.value);
            const label = checkbox.closest('.checkbox-label');
            if (checkbox.checked) {
                label.classList.add('selected');
            } else {
                label.classList.remove('selected');
            }
        });
    } catch (error) {
        showModalMessage('preferencesForm', 'error', 'Failed to load preferences: ' + error.message);
    }
}

// Save user preferences
async function savePreferences(event) {
    event.preventDefault();
    
    const languageSelect = document.getElementById('preferredLanguage');
    const mathTopicsCheckboxes = document.querySelectorAll('input[name="mathTopics"]:checked');
    
    const preferences = {
        preferred_language: languageSelect.value,
        math_topics: Array.from(mathTopicsCheckboxes).map(cb => cb.value)
    };
    
    try {
        const response = await window.updatePreferences(preferences);
        if (response && response.success) {
            showModalMessage('preferencesForm', 'success', 'Preferences updated successfully!');
            setTimeout(() => {
                closeModal('preferencesModal');
            }, 1500);
        } else {
            showModalMessage('preferencesForm', 'error', response.error || 'Update failed');
        }
    } catch (error) {
        showModalMessage('preferencesForm', 'error', 'Update failed: ' + error.message);
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
        messageDiv.remove();
    }, 3000);
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
});

// Export functions for global use
window.showPreferences = showPreferences;
window.showProfile = showProfile;
window.showChangePassword = showChangePassword;
window.closeModal = closeModal; 
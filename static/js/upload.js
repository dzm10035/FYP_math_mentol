// 文件上传相关函数

// 上传图片文件
async function uploadImage(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
        });
        
        if (response.status === 401) {
            alert('会话已过期，请重新登录');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `上传失败: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('图片上传失败:', error);
        throw error;
    }
}

// 上传文档文件
async function uploadDocument(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload/document', {
            method: 'POST',
            body: formData
        });
        
        if (response.status === 401) {
            alert('会话已过期，请重新登录');
            window.location.href = '/auth';
            return null;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `上传失败: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('文档上传失败:', error);
        throw error;
    }
}

// 根据文件类型选择上传方法
async function uploadFile(file) {
    const fileType = file.type.startsWith('image/') ? 'image' : 'document';
    
    try {
        if (fileType === 'image') {
            return await uploadImage(file);
        } else {
            return await uploadDocument(file);
        }
    } catch (error) {
        throw error;
    }
}

// 临时存储待上传的文件
const pendingUploads = [];

// 添加上传预览区域
function addAttachmentPreviewArea() {
    // 检查是否已存在预览区域
    if (document.querySelector('.attachments-preview-area')) {
        return document.querySelector('.attachments-preview-area');
    }
    
    // 获取消息输入容器
    const inputContainer = document.querySelector('.chat-input-container');
    if (!inputContainer) {
        console.error('找不到消息输入容器');
        return null;
    }
    
    // 创建附件预览区域
    const previewArea = document.createElement('div');
    previewArea.className = 'attachments-preview-area';
    
    // 将预览区域插入到输入框上方
    inputContainer.insertBefore(previewArea, inputContainer.firstChild);
    
    return previewArea;
}

// 获取文件名（不包含路径）
function getFileNameWithoutPath(fullPath) {
    if (!fullPath) return '';
    const parts = fullPath.split(/[\/\\]/);
    return parts[parts.length - 1];
}

// 创建本地文件的预览URL
function createLocalFileURL(file) {
    return URL.createObjectURL(file);
}

// 添加文件预览到预览区域
function addFilePreview(file, localPreviewUrl) {
    // 确保存在预览区域
    const previewArea = addAttachmentPreviewArea();
    if (!previewArea) return;
    
    // 获取文件类型
    const fileType = file.type.startsWith('image/') ? 'image' : 'document';
    
    // 创建预览元素
    const previewElement = document.createElement('div');
    previewElement.className = `attachment-preview ${fileType}-preview`;
    
    // 生成一个唯一ID用于标识此附件
    const attachmentId = `attachment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    previewElement.setAttribute('data-attachment-id', attachmentId);
    
    // calculate the index of this attachment
    const attachmentIndex = pendingUploads.length + 1;
    
    // 根据文件类型生成预览内容
    if (fileType === 'image') {
        previewElement.innerHTML = `
            <div class="image-preview-container">
                <img src="${localPreviewUrl}" alt="Attachment ${attachmentIndex}" class="preview-image">
                <span class="attachment-label">Attachment-${attachmentIndex}</span>
                <button class="remove-attachment" title="delete">&times;</button>
            </div>
        `;
    } else {
        // 设置文档图标颜色
        let iconColor = '#e74c3c'; // 默认红色
        if (file.name.endsWith('.pdf')) iconColor = '#e74c3c';
        else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) iconColor = '#4a89dc';
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) iconColor = '#2ecc71';
        
        previewElement.innerHTML = `
            <div class="document-preview-container">
                <div class="document-icon" style="background-color: ${iconColor}">
                    <span>${file.name.split('.').pop().toUpperCase()}</span>
                </div>
                <span class="attachment-label">Attachment-${attachmentIndex}</span>
                <button class="remove-attachment" title="delete">&times;</button>
            </div>
        `;
    }
    
    // 添加到预览区域
    previewArea.appendChild(previewElement);
    
    // 将文件添加到待上传队列
    pendingUploads.push({
        id: attachmentId,
        file: file,
        element: previewElement,
        type: fileType,
        localUrl: localPreviewUrl,
        index: attachmentIndex
    });
    
    // 添加删除按钮事件
    const removeButton = previewElement.querySelector('.remove-attachment');
    if (removeButton) {
        removeButton.addEventListener('click', () => {
            // 从待上传队列中移除
            const index = pendingUploads.findIndex(item => item.id === attachmentId);
            if (index !== -1) {
                // 如果有本地URL，释放它
                if (pendingUploads[index].localUrl) {
                    URL.revokeObjectURL(pendingUploads[index].localUrl);
                }
                pendingUploads.splice(index, 1);
            }
            
            // 从预览区域中移除
            previewElement.remove();
            
            // 如果预览区域为空，则移除整个预览区域
            if (previewArea.children.length === 0) {
                previewArea.remove();
            } else {
                // 更新剩余附件的编号
                updateAttachmentLabels();
            }
        });
    }
    
    return attachmentId;
}

// 更新所有附件的编号标签
function updateAttachmentLabels() {
    document.querySelectorAll('.attachment-preview').forEach((element, index) => {
        const label = element.querySelector('.attachment-label');
        if (label) {
            label.textContent = `Attachment-${index + 1}`;
        }
        
        // 同时更新pendingUploads中的索引
        const id = element.getAttribute('data-attachment-id');
        const uploadItem = pendingUploads.find(item => item.id === id);
        if (uploadItem) {
            uploadItem.index = index + 1;
        }
    });
}

// 上传所有待上传文件并将它们添加到消息中
async function uploadAllPendingFiles() {
    if (pendingUploads.length === 0) return '';
    
    // 显示上传进度指示器
    const progressIndicator = document.createElement('div');
    progressIndicator.className = 'upload-progress';
    progressIndicator.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-dasharray="32" stroke-dashoffset="10"></circle>
        </svg>
        <span>Uploading (0/${pendingUploads.length})</span>
    `;
    document.body.appendChild(progressIndicator);
    
    const progressText = progressIndicator.querySelector('span');
    
    try {
        let uploadedCount = 0;
        let markdownTexts = [];
        
        // 为了保持顺序，先对待上传文件按索引排序
        const sortedUploads = [...pendingUploads].sort((a, b) => a.index - b.index);
        
        // 逐个上传文件
        for (let i = 0; i < sortedUploads.length; i++) {
            const item = sortedUploads[i];
            
            // 更新进度
            if (progressText) {
                progressText.textContent = `Uploading (${uploadedCount}/${pendingUploads.length})`;
            }
            
            try {
                const result = await uploadFile(item.file);
                uploadedCount++;
                
                // 添加到markdown文本，使用预设的附件编号
                if (item.type === 'image') {
                    markdownTexts.push(`![Attachment-${item.index}](${result.file_url})`);
                } else {
                    markdownTexts.push(`[Attachment-${item.index}](${result.file_url})`);
                }
            } catch (error) {
                console.error(`Upload failed for item ${item.index}:`, error);
            }
        }
        
        // 移除上传进度指示器
        if (progressIndicator.parentNode) {
            progressIndicator.parentNode.removeChild(progressIndicator);
        }
        
        // 清除预览区域
        const previewArea = document.querySelector('.attachments-preview-area');
        if (previewArea) {
            previewArea.innerHTML = '';
            previewArea.remove();
        }
        
        // 清空待上传文件列表
        pendingUploads.splice(0, pendingUploads.length);
        
        // 返回markdown文本，用于插入到消息中
        return markdownTexts.join(' ');
    } catch (error) {
        console.error('Upload failed:', error);
        
        // 移除上传进度指示器
        if (progressIndicator.parentNode) {
            progressIndicator.parentNode.removeChild(progressIndicator);
        }
        
        return '';
    }
}

// 处理文件选择
async function handleFilesSelected(files) {
    if (!files || files.length === 0) return;
    
    // 限制最多上传10个文件
    const filesToPreview = Array.from(files).slice(0, 10);
    
    // 预览每个文件
    for (const file of filesToPreview) {
        const fileType = file.type.startsWith('image/') ? 'image' : 'document';
        
        // 为图片创建本地预览URL
        let localPreviewUrl = null;
        if (fileType === 'image') {
            localPreviewUrl = createLocalFileURL(file);
        }
        
        // 添加文件预览
        addFilePreview(file, localPreviewUrl || '');
    }
    
    // 修改发送按钮行为
    updateSendButtonBehavior();
}

// 修改发送按钮行为
function updateSendButtonBehavior() {
    const sendButton = document.querySelector('.send-button');
    if (!sendButton) return;
    
    // 先移除所有可能的事件处理函数，确保不会重复绑定
    const newSendButton = sendButton.cloneNode(true);
    sendButton.parentNode.replaceChild(newSendButton, sendButton);
    
    // 不再单独绑定click事件，所有的处理都由overrideSendMessageMethod统一处理
}

// 处理带附件的发送
async function handleSendWithUploads(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 禁用发送按钮，防止重复点击
    const sendButton = document.querySelector('.send-button');
    if (sendButton) {
        sendButton.disabled = true;
    }
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.disabled = true;
    }
    
    try {
        // 上传所有文件
        const attachmentsMarkdown = await uploadAllPendingFiles();
        
        // 如果上传失败，不发送消息
        if (!attachmentsMarkdown) {
            return;
        }
        
        // 获取消息内容
        let messageContent = messageInput ? messageInput.value.trim() : '';
        
        // 添加附件markdown
        messageContent = attachmentsMarkdown + (messageContent ? '\n\n' + messageContent : '');
        
        // 更新消息输入框内容
        if (messageInput) {
            messageInput.value = messageContent;
        }
        
        // 清除预览区域
        const previewArea = document.querySelector('.attachments-preview-area');
        if (previewArea) {
            previewArea.remove();
        }
        
        // 清空待上传队列
        pendingUploads.length = 0;
        
        // 不再调用window.originalHandleSendMessage()，
        // 改为直接调用chat.js中的handleSendMessage()
        const chatHandleSendMessage = window.handleSendMessage;
        if (typeof chatHandleSendMessage === 'function') {
            chatHandleSendMessage();
        }
    } catch (error) {
        console.error('send message with attachments failed:', error);
        alert('send message failed, please try again');
    } finally {
        // 恢复按钮状态
        if (sendButton) {
            sendButton.disabled = false;
        }
        if (messageInput) {
            messageInput.disabled = false;
        }
    }
}

// 覆盖发送消息方法
function overrideSendMessageMethod() {
    // 保存原始的handleSendMessage函数
    if (!window.originalHandleSendMessage) {
        window.originalHandleSendMessage = window.handleSendMessage;
    }
    
    // 重新定义handleSendMessage
    window.handleSendMessage = async function() {
        // 如果有待上传文件，先处理上传再发送
        if (pendingUploads.length > 0) {
            await handleSendWithUploads(null);
            return;
        }
        
        // 否则使用原始的发送方法
        window.originalHandleSendMessage();
    };
}

// 初始化文件上传功能
function initFileUpload() {
    // 创建隐藏的文件输入框，支持多文件选择
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'fileUploadInput';
    fileInput.style.display = 'none';
    fileInput.multiple = true; // 支持多选
    fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls'; // 同时接受图片和文档
    document.body.appendChild(fileInput);
    
    // 添加文件选择事件监听
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFilesSelected(fileInput.files);
            // 清空文件输入，允许重复上传相同文件
            fileInput.value = '';
        }
    });
    
    // 获取聊天输入容器
    const chatInputContainer = document.querySelector('.chat-input');
    
    if (chatInputContainer) {
        // 创建+号上传按钮
        const uploadButton = document.createElement('button');
        uploadButton.className = 'upload-button main-upload-button';
        uploadButton.setAttribute('title', '上传文件（最多10个）');
        uploadButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V20M4 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        // 创建一个工具栏容器
        const toolbarContainer = document.createElement('div');
        toolbarContainer.className = 'chat-toolbar';
        toolbarContainer.appendChild(uploadButton);
        
        // 点击+号按钮直接触发文件选择
        uploadButton.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
        
        // 将工具栏添加到输入框前面
        chatInputContainer.insertBefore(toolbarContainer, chatInputContainer.firstChild);
    }
    
    // 添加拖放上传支持
    setupDragAndDrop();
    
    // 覆盖页面的发送消息方法
    overrideSendMessageMethod();
}

// 设置拖放上传
function setupDragAndDrop() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // 添加拖拽事件监听
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        chatMessages.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 显示拖放区域
    chatMessages.addEventListener('dragenter', () => {
        chatMessages.classList.add('drag-active');
    });
    
    chatMessages.addEventListener('dragover', () => {
        chatMessages.classList.add('drag-active');
    });
    
    chatMessages.addEventListener('dragleave', (e) => {
        // 只有当鼠标离开聊天区域时才移除样式
        const rect = chatMessages.getBoundingClientRect();
        if (
            e.clientX < rect.left ||
            e.clientX >= rect.right ||
            e.clientY < rect.top ||
            e.clientY >= rect.bottom
        ) {
            chatMessages.classList.remove('drag-active');
        }
    });
    
    // 处理文件拖放
    chatMessages.addEventListener('drop', (e) => {
        chatMessages.classList.remove('drag-active');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFilesSelected(files);
        }
    });
}

// 页面加载完成后初始化文件上传功能
document.addEventListener('DOMContentLoaded', initFileUpload); 
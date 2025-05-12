from flask import Blueprint, request, jsonify, current_app, session
import os
import time
import uuid
from werkzeug.utils import secure_filename
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# 设置允许上传的文件类型
ALLOWED_EXTENSIONS = {
    'image': {'png', 'jpg', 'jpeg', 'gif'},
    'document': {'pdf', 'doc', 'docx', 'txt', 'xlsx', 'xls'}
}

def allowed_file(filename, file_type='image'):
    """检查文件扩展名是否在允许列表中"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS.get(file_type, [])

def login_required(f):
    """检查用户是否已登录"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "请先登录"}), 401
        return f(*args, **kwargs)
    return decorated_function

def create_upload_routes():
    upload_bp = Blueprint('upload', __name__)
    
    @upload_bp.route('/api/upload/image', methods=['POST'])
    @login_required
    def upload_image():
        try:
            # 检查是否有文件
            if 'file' not in request.files:
                return jsonify({"error": "没有选择文件"}), 400
                
            file = request.files['file']
            
            # 检查文件名是否为空
            if file.filename == '':
                return jsonify({"error": "没有选择文件"}), 400
                
            # 检查文件类型是否允许
            if not allowed_file(file.filename, 'image'):
                return jsonify({"error": "不支持的文件类型"}), 400
                
            # 安全处理文件名
            filename = secure_filename(file.filename)
            # 生成唯一文件名
            unique_filename = f"{uuid.uuid4().hex}_{int(time.time())}_{filename}"
            
            # 确保上传目录存在
            upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'images')
            os.makedirs(upload_dir, exist_ok=True)
            
            # 保存文件
            file_path = os.path.join(upload_dir, unique_filename)
            file.save(file_path)
            
            # 返回可访问的URL
            file_url = f"/static/uploads/images/{unique_filename}"
            
            return jsonify({
                "success": True,
                "file_url": file_url,
                "file_name": filename
            })
            
        except Exception as e:
            logger.error(f"上传图片时出错: {str(e)}")
            return jsonify({"error": f"上传失败: {str(e)}"}), 500
    
    @upload_bp.route('/api/upload/document', methods=['POST'])
    @login_required
    def upload_document():
        try:
            # 检查是否有文件
            if 'file' not in request.files:
                return jsonify({"error": "没有选择文件"}), 400
                
            file = request.files['file']
            
            # 检查文件名是否为空
            if file.filename == '':
                return jsonify({"error": "没有选择文件"}), 400
                
            # 检查文件类型是否允许
            if not allowed_file(file.filename, 'document'):
                return jsonify({"error": "不支持的文件类型"}), 400
                
            # 安全处理文件名
            filename = secure_filename(file.filename)
            # 生成唯一文件名
            unique_filename = f"{uuid.uuid4().hex}_{int(time.time())}_{filename}"
            
            # 确保上传目录存在
            upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'documents')
            os.makedirs(upload_dir, exist_ok=True)
            
            # 保存文件
            file_path = os.path.join(upload_dir, unique_filename)
            file.save(file_path)
            
            # 返回可访问的URL
            file_url = f"/static/uploads/documents/{unique_filename}"
            
            return jsonify({
                "success": True,
                "file_url": file_url,
                "file_name": filename
            })
            
        except Exception as e:
            logger.error(f"上传文档时出错: {str(e)}")
            return jsonify({"error": f"上传失败: {str(e)}"}), 500
            
    return upload_bp 
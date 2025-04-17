from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from functools import wraps
import os
import json
from datetime import datetime
from bson import ObjectId, json_util
from database import users_collection, messages_collection, sessions_collection
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create custom JSON encoder to handle MongoDB types
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        if isinstance(o, bytes):
            return o.decode('utf-8', errors='replace')
        return json.JSONEncoder.default(self, o)

admin_bp = Blueprint('admin', __name__)

# Decorator to require admin login
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('admin.admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Admin panel home page
@admin_bp.route('/admin')
def admin_index():
    return render_template('admin/index.html')

# Admin login page
@admin_bp.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == os.getenv('ADMIN_USERNAME') and password == os.getenv('ADMIN_PASSWORD'):
            session['admin_logged_in'] = True
            return redirect(url_for('admin.admin_users'))
        else:
            flash('Invalid credentials', 'error')
    
    return render_template('admin/login.html')

# Admin logout
@admin_bp.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin.admin_login'))

# User list page
@admin_bp.route('/admin/users')
@admin_required
def admin_users():
    users = users_collection.find()
    return render_template('admin/users.html', users=users)

# Database debug page
@admin_bp.route('/admin/debug')
@admin_required
def admin_debug():
    # Get sample documents from each collection
    user_doc = users_collection.find_one()
    message_doc = messages_collection.find_one()
    session_doc = sessions_collection.find_one()
    
    # Format data for template
    context = {
        'users_count': users_collection.count_documents({}),
        'messages_count': messages_collection.count_documents({}),
        'sessions_count': sessions_collection.count_documents({})
    }
    
    try:
        if user_doc:
            context['user_doc'] = user_doc
            context['user_fields'] = list(user_doc.keys())
            context['user_doc_json'] = json.dumps(user_doc, indent=2, cls=MongoJSONEncoder)
        
        if message_doc:
            context['message_doc'] = message_doc
            context['message_fields'] = list(message_doc.keys())
            context['message_doc_json'] = json.dumps(message_doc, indent=2, cls=MongoJSONEncoder)
            
        if session_doc:
            context['session_doc'] = session_doc
            context['session_fields'] = list(session_doc.keys())
            context['session_doc_json'] = json.dumps(session_doc, indent=2, cls=MongoJSONEncoder)
    except Exception as e:
        print(f"Error serializing data: {str(e)}")
        flash(f"Error displaying some data: {str(e)}", "error")
    
    return render_template('admin/debug.html', **context)

# View user sessions list
@admin_bp.route('/admin/chat_history/<user_id>')
@admin_required
def admin_view_chat_history(user_id):
    user = users_collection.find_one({'_id': ObjectId(user_id)})
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('admin.admin_users'))
    
    # Find all sessions for this user
    user_sessions = list(sessions_collection.find({'user_id': str(user_id)}))
    
    # If no sessions found, try with ObjectId
    if len(user_sessions) == 0:
        try:
            user_sessions = list(sessions_collection.find({'user_id': ObjectId(user_id)}))
        except Exception as e:
            print(f"Error querying with ObjectId: {str(e)}")
    
    print(f"Found {len(user_sessions)} sessions for user {user_id}")
    
    # Sort sessions by updated_at, latest first
    user_sessions.sort(key=lambda x: x.get('updated_at', datetime.min), reverse=True)
    
    return render_template('admin/sessions.html', 
                         username=user.get('username', 'Unknown'),
                         user_id=user_id,
                         sessions=user_sessions,
                         session_count=len(user_sessions))

# View messages in a specific session
@admin_bp.route('/admin/session/<user_id>/<session_id>')
@admin_required
def admin_view_session(user_id, session_id):
    user = users_collection.find_one({'_id': ObjectId(user_id)})
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('admin.admin_users'))
    
    # Get session info
    session_doc = sessions_collection.find_one({'session_id': session_id})
    if not session_doc:
        flash('Session not found', 'error')
        return redirect(url_for('admin.admin_view_chat_history', user_id=user_id))
    
    # Get messages for this session
    try:
        session_messages = list(messages_collection.find(
            {'session_id': session_id}
        ).sort('sequence', 1))
        
        print(f"Found {len(session_messages)} messages in session {session_id}")
    except Exception as e:
        print(f"Error getting messages for session {session_id}: {str(e)}")
        session_messages = []
    
    return render_template('admin/session_detail.html', 
                         username=user.get('username', 'Unknown'),
                         user_id=user_id,
                         session=session_doc,
                         messages=session_messages,
                         message_count=len(session_messages)) 
from flask import Flask, render_template, session, redirect, url_for, request, jsonify
from datetime import datetime, timedelta
import pytz
import json
from openai import OpenAI
import logging
from dotenv import load_dotenv
import os
from functools import wraps
from routes.admin import admin_bp
from routes.upload import create_upload_routes
from database import users_collection, sessions_collection, messages_collection
from utils import get_topic_name

# Load environment variables first
load_dotenv()

# global variables
gmt8 = pytz.timezone('Asia/Singapore')  
client = None
logger = None

# authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.auth_page'))
        return f(*args, **kwargs)
    return decorated_function

# Load system message from rule.json
import json

def load_system_message(file_path="rule.json"):
    """Load system message from rule.json (single-language simplified version)."""
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)
    return {"role": "system", "content": data.get("system_message_en", "")}

# Ensure indexes for performance
def setup_indexes():
    try:
        # Delete old indexes
        messages_collection.drop_indexes()
        sessions_collection.drop_indexes()
        
        # Create new indexes
        sessions_collection.create_index([("session_id", 1)], unique=True)
        sessions_collection.create_index([("updated_at", -1)])
        messages_collection.create_index([("session_id", 1)])
        messages_collection.create_index([("sequence", 1)])
        
        logger.info("Database indexes setup completed successfully")
    except Exception as e:
        logger.error(f"Error setting up indexes: {str(e)}")
        raise
    
import secrets
def generate_secret_key():
    return secrets.token_hex(32)

def create_app():
    global users_collection, sessions_collection, messages_collection, client, logger
    
    # Create Flask application
    app = Flask(__name__)
    app.secret_key = os.getenv('FLASK_SECRET_KEY', generate_secret_key())
    
    # Clean up old session files
    session_dir = os.path.join(os.getcwd(), 'flask_session')
    if os.path.exists(session_dir):
        import shutil
        shutil.rmtree(session_dir)
    
    # Set session configuration to expire after server restart
    app.config['SESSION_TYPE'] = 'filesystem'  # Use file system to store sessions
    app.config['SESSION_FILE_DIR'] = session_dir  # Session file storage directory
    app.config['SESSION_PERMANENT'] = False  # Sessions are not permanent
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=1)  # Session lasts for 1 hour
    app.config['SESSION_USE_SIGNER'] = True  # Use signer to protect session data
    app.config['SESSION_KEY_PREFIX'] = 'mathmentor_'  # Session key prefix
    
    # Ensure session directory exists
    os.makedirs(session_dir, exist_ok=True)
    
    # Initialize session extension
    from flask_session import Session
    Session(app)

    # Set logging level
    logging.basicConfig(level=logging.WARNING)
    logger = logging.getLogger(__name__)

    # Set MongoDB and httpx logging level
    pymongo_logger = logging.getLogger('pymongo')
    pymongo_logger.setLevel(logging.WARNING)

    httpx_logger = logging.getLogger('httpx')
    httpx_logger.setLevel(logging.WARNING)

    # Load environment variables
    load_dotenv()

    # OpenAI API settings
    client = OpenAI(
        api_key=os.getenv('OPENAI_API_KEY'),
        base_url=os.getenv('OPENAI_BASE_URL')
    )
    
    # Create blueprints
    from routes.auth import create_auth_routes
    from routes.chat import create_chat_routes
    
    # get or create reset_tokens collection
    reset_tokens_collection = users_collection.database.get_collection('reset_tokens')
    
    auth_bp = create_auth_routes(users_collection, gmt8, reset_tokens_collection)
    chat_bp = create_chat_routes(sessions_collection, messages_collection, client, gmt8, load_system_message)
    upload_bp = create_upload_routes()
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(upload_bp)
    
    # API endpoint to get math topics in specified language
    @app.route('/api/math_topics/<lang_code>', methods=['GET'])
    def get_math_topics(lang_code):
        math_topics = get_topic_name(None, lang_code)
        return jsonify(math_topics)
    
    # add 404 error handler
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('404.html'), 404
    
    # add 500 error handler
    @app.errorhandler(500)
    def internal_server_error(e):
        logger.error(f"500 error: {str(e)}")
        return render_template('500.html'), 500
    
    # protected home route
    @app.route('/')
    @login_required
    def index():
        return render_template('index.html')
    
    # protected chat route for specific session
    @app.route('/<session_id>')
    @login_required
    def chat_session(session_id):
        # Validate session_id format (should start with 'chat_')
        if not session_id.startswith('chat_'):
            return render_template('404.html'), 404
        
        # Check if session exists and belongs to current user
        user_id = session.get('user_id')
        session_data = sessions_collection.find_one({
            "session_id": session_id,
            "user_id": user_id
        })
        
        if not session_data:
            # If session doesn't exist or doesn't belong to user, redirect to home
            return redirect(url_for('index'))
        
        return render_template('index.html', current_session_id=session_id)
    
    return app

if __name__ == '__main__':
    app = create_app()
    setup_indexes()
    app.run(debug=True, threaded=False, use_reloader=True, host='0.0.0.0')
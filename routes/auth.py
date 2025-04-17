from flask import jsonify, request, session, redirect, url_for, render_template
from datetime import datetime
import bcrypt
import logging
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from datetime import timedelta

logger = logging.getLogger(__name__)

def create_auth_routes(users_collection, gmt8, reset_tokens_collection):
    from routes import create_auth_blueprint
    auth_bp = create_auth_blueprint()
    
    # 确保创建唯一索引
    def ensure_indexes():
        try:
            users_collection.create_index("email", unique=True)
            users_collection.create_index("username", unique=True)
            logger.info("Unique indexes created for email and username")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
    
    # 创建索引
    ensure_indexes()
    
    @auth_bp.route('/auth')
    def auth_page():
        if 'user_id' in session:
            return redirect(url_for('index'))
        return render_template('auth.html')

    @auth_bp.route('/forgot-password')
    def forgot_password_page():
        if 'user_id' in session:
            return redirect(url_for('index'))
        return render_template('forgot_password.html')

    @auth_bp.route('/api/register', methods=['POST'])
    def register():
        try:
            data = request.get_json()
            email = data.get('email')
            username = data.get('username')
            password = data.get('password')
            language = data.get('language', 'en')

            if not all([email, username, password]):
                return jsonify({"error": "Email, username and password are required"}), 400

            # Step 1: Pre-check for existing email or username
            existing_user = users_collection.find_one({
                "$or": [
                    {"email": email},
                    {"username": username}
                ]
            })

            if existing_user:
                if existing_user["email"] == email:
                    return jsonify({"error": "email_exists"}), 409
                else:
                    return jsonify({"error": "username_exists"}), 409

            # Step 2: Create new user
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            user = {
                "email": email,
                "username": username,
                "password": hashed_password,
                "preferences": {
                    "language": language,
                    "math_topics": []
                },
                "created_at": datetime.now(gmt8),
                "last_login": None
            }

            try:
                result = users_collection.insert_one(user)
                
                if result.inserted_id:
                    # Set session
                    session['user_id'] = str(result.inserted_id)
                    session['email'] = email
                    session['username'] = username
                    session['preferences'] = user['preferences']
                    
                    logger.info(f"New user registered: {email}")
                    return jsonify({
                        "message": "Registration successful",
                        "user": {
                            "email": email,
                            "username": username,
                            "preferences": user['preferences']
                        }
                    }), 200
                else:
                    return jsonify({"error": "Failed to create user account"}), 500
                    
            except Exception as db_error:
                logger.error(f"Database error during registration: {db_error}")
                return jsonify({"error": "Failed to create user account"}), 500

        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return jsonify({"error": "An error occurred during registration"}), 500

    @auth_bp.route('/api/login', methods=['POST'])
    def login():
        try:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                return jsonify({"error": "Email and password are required"}), 400

            user = users_collection.find_one({"email": email})
            if not user:
                return jsonify({"error": "Invalid email or password"}), 401

            # Verify password
            stored_password = user.get('password')
            if not stored_password:
                return jsonify({"error": "Invalid email or password"}), 401

            if not bcrypt.checkpw(password.encode('utf-8'), stored_password):
                return jsonify({"error": "Invalid email or password"}), 401

            # Set session data
            session['user_id'] = str(user['_id'])
            session['email'] = email
            session['username'] = user.get('username', email.split('@')[0])  # if doesn't have username, use email prefix
            session['preferences'] = user.get('preferences', {})

            # Update last login time
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.now(gmt8)}}
            )

            return jsonify({
                "success": True,
                "message": "Login successful",
                "user": {
                    "email": email,
                    "username": session['username'],
                    "preferences": session['preferences']
                }
            })

        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return jsonify({"error": "An error occurred during login"}), 500

    @auth_bp.route('/api/logout')
    def logout():
        session.clear()
        return redirect(url_for('auth.auth_page'))

    @auth_bp.route('/api/update-profile', methods=['POST'])
    def update_profile():
        if 'user_id' not in session:
            return jsonify({"error": "Not logged in"}), 401

        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        current_time = datetime.now(gmt8)

        if not all([username, email]):
            return jsonify({"error": "All fields are required"}), 400

        # Check if email exists for other users
        existing_user = users_collection.find_one({
            "email": email,
            "_id": {"$ne": ObjectId(session['user_id'])}
        })
        if existing_user:
            return jsonify({"error": "Email already exists"}), 400

        try:
            users_collection.update_one(
                {"_id": ObjectId(session['user_id'])},
                {
                    "$set": {
                        "username": username,
                        "email": email,
                        "updated_at": current_time
                    }
                }
            )
            
            session['username'] = username
            session['email'] = email
            
            return jsonify({"success": True})
        except Exception as e:
            logger.error(f"Profile update error: {str(e)}")
            return jsonify({"error": "Update failed"}), 500

    @auth_bp.route('/api/change-password', methods=['POST'])
    def change_password():
        if 'user_id' not in session:
            return jsonify({"error": "Not logged in"}), 401

        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        current_time = datetime.now(gmt8)

        if not all([current_password, new_password]):
            return jsonify({"error": "All fields are required"}), 400

        user = users_collection.find_one({"_id": ObjectId(session['user_id'])})
        if not user:
            return jsonify({"error": "User not found"}), 404

        if not bcrypt.checkpw(current_password.encode('utf-8'), user['password']):
            return jsonify({"error": "Current password is incorrect"}), 401

        try:
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
            users_collection.update_one(
                {"_id": ObjectId(session['user_id'])},
                {
                    "$set": {
                        "password": hashed_password,
                        "updated_at": current_time
                    }
                }
            )
            return jsonify({"success": True})
        except Exception as e:
            logger.error(f"Password change error: {str(e)}")
            return jsonify({"error": "Password change failed"}), 500

    @auth_bp.route('/api/update-preferences', methods=['POST'])
    def update_preferences():
        if 'user_id' not in session:
            return jsonify({"error": "Not logged in"}), 401

        data = request.get_json()
        preferred_language = data.get('preferred_language')
        math_topics = data.get('math_topics', [])
        current_time = datetime.now(gmt8)

        if not preferred_language:
            return jsonify({"error": "Language preference cannot be empty"}), 400

        try:
            users_collection.update_one(
                {"_id": ObjectId(session['user_id'])},
                {
                    "$set": {
                        "preferences.language": preferred_language,
                        "preferences.math_topics": math_topics,
                        "preferences.updated_at": current_time
                    }
                }
            )
            return jsonify({
                "success": True,
                "message": "Preferences updated successfully",
                "preferences": {
                    "language": preferred_language,
                    "math_topics": math_topics
                }
            })
        except Exception as e:
            logger.error(f"Preferences update error: {str(e)}")
            return jsonify({"error": "Update failed, please try again later"}), 500

    @auth_bp.route('/api/get-preferences')
    def get_preferences():
        if 'user_id' not in session:
            return jsonify({"error": "Not logged in"}), 401

        try:
            user = users_collection.find_one({"_id": ObjectId(session['user_id'])})
            if not user:
                return jsonify({"error": "User does not exist"}), 404

            preferences = user.get('preferences', {
                "language": "zh",
                "math_topics": []
            })
            
            return jsonify({
                "success": True,
                "preferences": preferences
            })
        except Exception as e:
            logger.error(f"Get preferences error: {str(e)}")
            return jsonify({"error": "Failed to get preferences"}), 500

    @auth_bp.route('/api/verify-email', methods=['POST'])
    def verify_email():
        try:
            email = request.json.get('email')
            
            if not email:
                return jsonify({"error": "Email is required"}), 400
                
            # Check if user exists
            user = users_collection.find_one({"email": email})
            if not user:
                return jsonify({"error": "No account found with this email"}), 404
                
            logger.info(f"Email verification successful for {email}")
            return jsonify({"message": "Email verified successfully"}), 200
            
        except Exception as e:
            logger.error(f"Error in verify_email: {str(e)}")
            return jsonify({"error": "Failed to verify email"}), 500

    @auth_bp.route('/api/forgot-password', methods=['POST'])
    def forgot_password():
        try:
            email = request.json.get('email')
            new_password = request.json.get('new_password')
            
            if not email or not new_password:
                return jsonify({"error": "Email and new password are required"}), 400
                
            # Check if user exists
            user = users_collection.find_one({"email": email})
            if not user:
                return jsonify({"error": "No account found with this email"}), 404
                
            # Update password
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), salt)
            
            users_collection.update_one(
                {"email": email},
                {"$set": {"password": hashed_password}}
            )
            
            logger.info(f"Password reset successful for {email}")
            return jsonify({"message": "Password reset successfully"}), 200
            
        except Exception as e:
            logger.error(f"Error in forgot_password: {str(e)}")
            return jsonify({"error": "Failed to reset password"}), 500

    @auth_bp.route('/api/reset-password', methods=['POST'])
    def reset_password():
        try:
            token = request.json.get('token')
            new_password = request.json.get('new_password')
            
            if not token or not new_password:
                return jsonify({"error": "missing necessary parameters"}), 400
                
            # 验证令牌
            token_data = reset_tokens_collection.find_one({
                "token": token,
                "expiry": {"$gt": datetime.utcnow()}
            })
            
            if not token_data:
                return jsonify({"error": "invalid or expired reset link"}), 400
                
            # 更新密码
            users_collection.update_one(
                {"email": token_data["email"]},
                {"$set": {"password": generate_password_hash(new_password)}}
            )
            
            # 删除已使用的令牌
            reset_tokens_collection.delete_one({"token": token})
            
            logger.info(f"Password reset successful for {token_data['email']}")
            return jsonify({"message": "Password reset successfully"}), 200
            
        except Exception as e:
            logger.error(f"Error in reset_password: {str(e)}")
            return jsonify({"error": "An error occurred while processing the request"}), 500

    return auth_bp 
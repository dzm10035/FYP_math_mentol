from flask import jsonify, request, session
from datetime import datetime
import logging
from pymongo.mongo_client import MongoClient
from pymongo.collection import ObjectId
from functools import wraps
from utils import get_language_name, get_topic_name, get_welcome_message

logger = logging.getLogger(__name__)

def auth_required(f):
    """Check if user is logged in and provide session_id"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Please login first"}), 401

        session_id = request.json.get("session_id")
        if not session_id:
            return jsonify({"error": "Session ID is required"}), 400

        return f(*args, **kwargs)
    return decorated_function

def login_required(f):
    """Check if user is logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Please login first"}), 401
        return f(*args, **kwargs)
    return decorated_function

def create_chat_routes(sessions_collection, messages_collection, client, gmt8, load_system_message):
    from routes import create_chat_blueprint
    chat_bp = create_chat_blueprint()
    
    @chat_bp.route('/api/chat', methods=['POST'])
    @auth_required
    def chat():
        try:
            # Get necessary parameters
            user_id = session.get('user_id')
            session_id = request.json.get("session_id")
            user_input = request.json.get("message", "").strip()
            user_preferences = request.json.get("user_preferences", {})
            
            # Extract user preferences
            preferred_language = user_preferences.get('language', 'en')
            math_topics = user_preferences.get('math_topics', [])
            
            logger.info(f"Processing chat request, session ID: {session_id}, preferred language: {preferred_language}")
            
            # Validate user input  
            if not user_input:
                logger.warning("Received empty message")
                return jsonify({"error": "Message cannot be empty"}), 400
            
            # Validate session existence
            session_data = sessions_collection.find_one({"session_id": session_id})
            if not session_data:
                logger.error(f"Session not found: {session_id}")
                return jsonify({"error": "Session not found"}), 404

            # Ensure session belongs to current user
            if session_data.get("user_id") != user_id:
                logger.error(f"Session {session_id} does not belong to user {user_id}")
                return jsonify({"error": "Unauthorized access to this session"}), 403
                
            # Get history messages
            messages = list(messages_collection.find(
                {"session_id": session_id},
                {"_id": 0, "role": 1, "content": 1}
            ).sort("sequence", 1))
            logger.info(f"Found {len(messages)} history messages")
            
            # Get current message sequence number
            current_sequence = session_data.get("message_count", 0)
            next_sequence = current_sequence + 1
            logger.info(f"Current sequence: {current_sequence}, Next sequence: {next_sequence}")

            # Save user message ID for rollback on error
            user_message_id = f"{session_id}_{next_sequence}"
            
            # Add user message to database
            current_time = datetime.now(gmt8)
            user_message = {
                "message_id": user_message_id,
                "session_id": session_id,
                "role": "user",
                "content": user_input,
                "created_at": current_time,
                "sequence": next_sequence
            }
            
            # Try to save user message first
            try:
                messages_collection.insert_one(user_message)
                logger.info(f"User message saved, ID: {user_message_id}")
                # Add to messages list to send to AI
                messages.append({"role": "user", "content": user_input})
            except Exception as save_error:
                logger.error(f"Failed to save user message: {str(save_error)}")
                return jsonify({"error": "Failed to save your message"}), 500

            # Call OpenAI API
            try:
                logger.info("Calling GPT API...")
                completion = client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    temperature=0.7,
                )
                assistant_message = completion.choices[0].message.content
                next_sequence += 1
                logger.info("GPT API call successful")
            except Exception as api_error:
                logger.error(f"Failed to call GPT API: {str(api_error)}")
                # Rollback on error, delete previously saved user message
                logger.info(f"Rolling back: deleting user message {user_message_id}")
                messages_collection.delete_one({"message_id": user_message_id})
                return jsonify({"error": f"Failed to get reply: {str(api_error)}"}), 500

            # Save AI reply
            try:
                # Save assistant reply
                assistant_message_id = f"{session_id}_{next_sequence}"
                assistant_message_doc = {
                    "message_id": assistant_message_id,
                    "session_id": session_id,
                    "role": "assistant",
                    "content": assistant_message,
                    "created_at": datetime.now(gmt8),
                    "sequence": next_sequence
                }
                messages_collection.insert_one(assistant_message_doc)
                logger.info(f"Assistant message saved, ID: {assistant_message_id}")

                # Update session info
                sessions_collection.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "updated_at": datetime.now(gmt8),
                            "message_count": next_sequence,
                            "last_message": user_input[:50] + "..." if len(user_input) > 50 else user_input
                        }
                    }
                )
                logger.info("Session info updated")
                
                return jsonify({
                    "response": assistant_message,
                    "session_id": session_id
                })
            except Exception as save_error:
                logger.error(f"Failed to save assistant message or update session: {str(save_error)}")
                # Delete previously saved user message
                logger.info(f"Rolling back: deleting user message {user_message_id}")
                messages_collection.delete_one({"message_id": user_message_id})
                return jsonify({"error": "Failed to save assistant reply"}), 500

        except Exception as e:
            logger.error(f"Chat route server error: {str(e)}")
            return jsonify({"error": f"Server error: {str(e)}"}), 500

    @chat_bp.route('/api/history', methods=['GET'])
    @login_required
    def get_history():
        try:
            session_id = request.args.get('session_id')
            if not session_id:
                return jsonify({"error": "Session ID is required"}), 400
                
            logger.info(f"Fetching history for session: {session_id}")
            
            messages = list(messages_collection.find(
                {"session_id": session_id},
                {
                    "_id": 0,  # Do not return MongoDB's _id field
                    "role": 1, 
                    "content": 1,
                    "created_at": 1 
                }
            ).sort("sequence", 1))
            
            # Convert date format to ISO string to solve JSON serialization problem
            for msg in messages:
                if "created_at" in msg and msg["created_at"]:
                    msg["created_at"] = msg["created_at"].isoformat()
            
            logger.info(f"Found {len(messages)} messages for session {session_id}")
            return jsonify(messages)
            
        except Exception as e:  
            logger.error(f"Error in get_history: {str(e)}")
            return jsonify({"error": f"Failed to get history: {str(e)}"}), 500

    @chat_bp.route('/api/sessions')
    @login_required
    def get_sessions():
        try:
            user_id = session.get('user_id')
            if not user_id:
                logger.error("No user_id found in session")
                return jsonify({"error": "User not logged in"}), 401
                
            logger.info(f"Fetching sessions for user: {user_id}")
            
            # Use simple query, do not use transaction
            sessions = list(sessions_collection.find(
                {"user_id": user_id},
                {
                    "_id": 0,  # Do not return MongoDB's _id field
                    "session_id": 1,
                    "title": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    "message_count": 1
                }
            ).sort("updated_at", -1))
            
            # Convert date format to ISO string to solve JSON serialization problem
            for s in sessions:
                if "created_at" in s and s["created_at"]:
                    s["created_at"] = s["created_at"].isoformat()
                if "updated_at" in s and s["updated_at"]:
                    s["updated_at"] = s["updated_at"].isoformat()
            
            logger.info(f"Found {len(sessions)} sessions for user {user_id}")
            return jsonify(sessions)

        except Exception as e:
            logger.error(f"Error in get_sessions: {str(e)}")
            return jsonify({"error": f"Server error: {str(e)}"}), 500

    @chat_bp.route('/api/new-session', methods=['POST'])
    @login_required
    def create_session():
        try:
            user_id = session.get('user_id')
            if not user_id:
                logger.error("No user_id found in session")
                return jsonify({"error": "User not logged in"}), 401
            
            # Get user preferences
            from database import users_collection
            user_data = users_collection.find_one({"_id": ObjectId(user_id)})
            user_preferences = user_data.get("preferences", {}) if user_data else {}
            preferred_language = user_preferences.get("language", "en")
            math_topics = user_preferences.get("math_topics", [])
                
            logger.info(f"Creating new session for user: {user_id}, language: {preferred_language}")
            
            # Generate session ID and default title
            current_time = datetime.now(gmt8)
            session_id = f"chat_{current_time.timestamp()}"
            formatted_time = current_time.strftime("%Y%m%d-%H:%M")
            default_title = f"Chat {formatted_time}"
            
            # Create new session
            session_data = {
                "session_id": session_id,
                "user_id": user_id,
                "title": default_title,
                "created_at": current_time,
                "updated_at": current_time,
                "message_count": 2  # System message and welcome message
            }
            
            sessions_collection.insert_one(session_data)
            logger.info(f"Created new session: {session_id}")
            
            # Add system message with language and topic preferences
            system_message = load_system_message(lang_code=preferred_language)
            
            # Add language preference to system message
            system_message["content"] += f"\n\n{get_language_name(preferred_language)}."
            
            # Add math topics if available
            if math_topics and len(math_topics) > 0:
                topics_string = ", ".join([get_topic_name(topic, preferred_language) for topic in math_topics])
                system_message["content"] += f"\nThe user is particularly interested in these math topics: {topics_string}."
            
            messages_collection.insert_one({
                "message_id": f"{session_id}_1",
                "session_id": session_id,
                "role": "system",
                "content": system_message["content"],
                "created_at": current_time,
                "sequence": 1
            })
            logger.info("Added system message to new session")
            
            # Add welcome message based on language preference
            welcome_message = get_welcome_message(preferred_language)
            messages_collection.insert_one({
                "message_id": f"{session_id}_2",
                "session_id": session_id,
                "role": "assistant",
                "content": welcome_message,
                "created_at": current_time,
                "sequence": 2
            })
            logger.info("Added welcome message to new session")
            
            return jsonify({"success": True, "session_id": session_id})
        except Exception as e:
            logger.error(f"Error creating new session: {str(e)}")
            return jsonify({"error": f"Failed to create session: {str(e)}"}), 500

    @chat_bp.route('/api/delete-session', methods=['POST'])
    @auth_required
    def delete_session():
        try:
            session_id = request.json.get('session_id')
            if not session_id:
                return jsonify({"error": "Session ID is required"}), 400
                
            logger.info(f"Deleting session: {session_id}")
            
            # Delete session and related messages
            sessions_collection.delete_one({"session_id": session_id})
            messages_collection.delete_many({"session_id": session_id})
            
            logger.info(f"Session {session_id} deleted successfully")
            return jsonify({"success": True})
            
        except Exception as e:
            logger.error(f"Error deleting session: {str(e)}")
            return jsonify({"error": f"Failed to delete session: {str(e)}"}), 500

    @chat_bp.route('/api/update-title', methods=['POST'])
    @auth_required
    def update_title():
        try:
            session_id = request.json.get('session_id')
            if not session_id:
                return jsonify({"error": "Session ID is required"}), 400
                
            new_title = request.json.get('title')
            if not new_title:
                return jsonify({"error": "Title is required"}), 400
                
            logger.info(f"Updating title for session {session_id} to: {new_title}")
            
            # Update session title
            sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {"title": new_title}}
            )
            
            logger.info(f"Title updated successfully for session {session_id}")
            return jsonify({"success": True})
            
        except Exception as e:
            logger.error(f"Error updating title: {str(e)}")
            return jsonify({"error": f"Failed to update title: {str(e)}"}), 500
            
    return chat_bp 
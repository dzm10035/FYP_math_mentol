from flask import jsonify, request, session
from datetime import datetime
import logging
import pytz
from pymongo.mongo_client import MongoClient
from pymongo.collection import ObjectId
from functools import wraps
from utils import get_language_name, get_topic_name, get_welcome_message, get_available_topics, get_topic_confirmation_message, get_new_topic_suggestion_message

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
    
    def add_progression_context(messages, user_id, topic_id, preferred_language, users_collection):
        """Add progression context as sequence 0 (dynamic, not saved to DB)"""
        # Get user data for preferences
        user_data = users_collection.find_one({"_id": ObjectId(user_id)})
        user_preferences = user_data.get("preferences", {}) if user_data else {}
        
        if topic_id:
            # Specific topic - provide progression for this topic
            progression_data = get_user_topic_progression(user_id, topic_id, users_collection)
            if progression_data:
                progress_message = {
                    "role": "system", 
                    "content": (
                        f"User has previously studied topic '{topic_id}' with progress {progression_data['progress']}%. "
                        f"{'They have completed this topic. So can focus on revision.' if progression_data.get('revision', False) else 'The topic is not yet complete.'} "
                        f"Last studied at {progression_data['last_study_time']}. "
                        f"Notes: {progression_data.get('notes', 'None')}."
                    )
                }
                messages.insert(0, progress_message)
                logger.info(f"Added progression context for topic {topic_id}")
            else:
                # User has no previous progression for this topic - first time learning
                topic_name = get_topic_name(topic_id, preferred_language)
                progress_message = {
                    "role": "system",
                    "content": (
                        f"This is the user's first time studying the topic '{topic_name}' (ID: {topic_id}). "
                        f"Start with fundamental concepts and build up gradually. "
                        f"Assess their current understanding before diving into advanced topics."
                    )
                }
                messages.insert(0, progress_message)
                logger.info(f"Added first-time learning context for topic {topic_id}")
        else:
            # No topic - provide both progression history and preferences for comprehensive context
            all_progressions = get_all_user_progressions(user_id, users_collection)
            math_topics = user_preferences.get("math_topics", [])
            
            context_parts = []
            
            if all_progressions:
                progression_summary = "User's mathematics learning history:\n"
                for prog in all_progressions:
                    topic_name = get_topic_name(prog.get('id'), preferred_language)
                    status = "Mastered" if prog.get('revision', False) else f"{prog.get('progress', 0)}% progress"
                    progression_summary += f"• {topic_name}: {status}\n"
                context_parts.append(progression_summary)
            
            if math_topics:
                preferences_summary = "User's selected mathematical interests:\n"
                for topic_id in math_topics:
                    topic_name = get_topic_name(topic_id, preferred_language)
                    preferences_summary += f"• {topic_name}\n"
                context_parts.append(preferences_summary)
            
            if context_parts:
                # User has progression history and/or preferences
                combined_context = "\n".join(context_parts)
                combined_context += "\nBased on the user's learning history and interests, recommend the most logical next topic or suggest review areas. "
                combined_context += "Consider prerequisite relationships between topics and identify knowledge gaps. "
                combined_context += "Remember: Guidelines contain template examples (like quadratic equations) - adapt all teaching to the recommended topic."
                
                progress_message = {
                    "role": "system",
                    "content": combined_context
                }
                messages.insert(0, progress_message)
                logger.info(f"Added combined progression and preferences context (progressions: {len(all_progressions)}, preferences: {len(math_topics)})")
            else:
                # No history or preferences - provide all available topics for reference
                all_topics = get_available_topics()
                topics_summary = "Available mathematics topics for new learner (no history or preferences):\n"
                for topic_id in all_topics:
                    topic_name = get_topic_name(topic_id, preferred_language)
                    topics_summary += f"• {topic_name}\n"
                
                progress_message = {
                    "role": "system",
                    "content": (
                        topics_summary + 
                        "Assess user's mathematical background and recommend appropriate starting topics based on their goals and current knowledge. "
                        "Key reminder: All teaching examples in guidelines (like quadratic equations) are templates only - "
                        "create topic-specific examples and explanations relevant to whatever subject you're teaching."
                    )
                }
                messages.insert(0, progress_message)
                logger.info("Added all available topics for recommendation")

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
            
            # Check if session has topic set and add progression context
            current_topic = session_data.get("topic_id")
            from database import users_collection
            add_progression_context(messages, user_id, current_topic, preferred_language, users_collection)
            
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
                
                # Prepare function calling if no topic is set
                api_params = {
                    "model": "gpt-4o",
                    "messages": messages,
                    "temperature": 0.7,
                }
                 # Check if session has topic set
                if not current_topic:
                    api_params["tools"] = tools_schema
                    api_params["tool_choice"] = "auto"
                    logger.info("Using topic detection and new topic suggestion tools.")
                elif current_topic:
                    # Add progression tools and new topic suggestion tools for existing topic
                    progression_tools = get_progression_tools_schema(current_topic)
                    all_tools = progression_tools + new_topic_tools
                    api_params["tools"] = all_tools
                    api_params["tool_choice"] = "auto"
                    logger.info(f"Using progression and new topic tools for topic: {current_topic}")
                    
                    # Add explicit tool instruction to messages
                    tool_instruction = {
                        "role": "system",
                        "content": (
                            f"You are currently teaching topic '{current_topic}'.\n\n"
                            "🧠 Throughout the conversation, closely observe the user's learning signals. After any meaningful learning interaction, "
                            "you must use the `update_user_progression` tool to track their progress.\n\n"

                            "✅ Meaningful learning interactions include (but are not limited to):\n"
                            "- The user correctly solves a problem or completes a calculation\n"
                            "- The user demonstrates understanding of a concept, even partially\n"
                            "- The user applies a method you previously explained\n"
                            "- The user asks a thoughtful question or makes a relevant connection\n"
                            "- The user attempts to explain, reason, or paraphrase an idea\n"
                            "- The user moves from confusion to clarity after your guidance\n\n"
                            "🏆 If the user answers a question correctly, always treat this as progress and award at least 1 point using the `update_user_progression` tool.\n\n"
                            "⚠️ Do NOT wait for perfect answers. Even small improvements or signs of engagement count as progress.\n"
                            "You are expected to proactively track and log progression after any such interaction, so the system can adapt to the user's evolving understanding."
                            "\n\n"
                            "If the user expresses a desire to switch to a completely different topic — e.g. by saying things like "
                            "'I want to learn something new', 'Can we switch topics?', 'I don't want to continue this topic', "
                            "'Let's try geometry', or similar expressions — do NOT continue with the current topic. "
                            "Instead, call the `suggest_new_topic_session` tool with a suitable suggested topic "
                            "based on their message or learning history. Do not teach the new topic directly in the current session. "
                            "Only when the user's intent is to fully switch to a new **main topic** (not just a sub-area) should you "
                            "call the `suggest_new_topic_session` tool with a suitable suggested topic based on their message or "
                            "learning history. "
                            "Let the frontend handle topic transition via a new session link."
                        )
                    }
                    messages.append(tool_instruction)
                
                
                completion = client.chat.completions.create(**api_params)
                
                # Handle function call response
                tool_call  = None
                if completion.choices[0].message.tool_calls:
                    tool_call = completion.choices[0].message.tool_calls[0] 
                    
                    # Add the assistant's tool call message to conversation
                    messages.append({
                        "role": "assistant",
                        "content": completion.choices[0].message.content,
                        "tool_calls": completion.choices[0].message.tool_calls
                    })
                    
                    if tool_call.function.name == "set_current_topic":
                        import json
                        function_args = json.loads(tool_call.function.arguments)
                        function_call_topic = function_args.get("topic_id")
                        logger.info(f"AI detected topic: {function_call_topic}")

                        # 更新 session 中的 topic
                        sessions_collection.update_one(
                            {"session_id": session_id},
                            {"$set": {"topic_id": function_call_topic}}
                        )
                        logger.info(f"Updated session {session_id} with topic: {function_call_topic}")

                        # Add tool response to messages
                        topic_name = get_topic_name(function_call_topic, preferred_language)
                        tool_response = f"Topic successfully set to '{topic_name}' for this session."
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": tool_response
                        })
                        
                    elif tool_call.function.name == "update_user_progression":
                        import json
                        function_args = json.loads(tool_call.function.arguments)
                        topic_id = function_args.get("topic_id")
                        progress = function_args.get("progress")
                        notes = function_args.get("notes", "")
                        
                        logger.info(f"AI updating progression for topic {topic_id}: {progress}%")
                        
                        # Check if current session has the topic set
                        if current_topic != topic_id:
                            logger.warning(f"Topic mismatch: session topic {current_topic}, tool topic {topic_id}")
                            tool_response = "Error: Topic mismatch. Could not update progression."
                        else:
                            # Update user progression
                            from database import users_collection
                            success = update_user_topic_progression(user_id, topic_id, progress, notes, users_collection)
                            
                            if success:
                                logger.info(f"Successfully updated progression for user {user_id}, topic {topic_id}")
                                tool_response = f"User progression updated successfully: {progress}% completion for topic '{topic_id}'."
                            else:
                                logger.error(f"Failed to update progression for user {user_id}, topic {topic_id}")
                                tool_response = "Error: Failed to update user progression."
                        
                        # Add tool response to messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": tool_response
                        })
                        
                    elif tool_call.function.name == "suggest_new_topic_session":
                        import json
                        function_args = json.loads(tool_call.function.arguments)
                        suggested_topic_id = function_args.get("suggested_topic_id")
                        
                        # Get the topic name based on the topic ID and user's language
                        suggested_topic_name = get_topic_name(suggested_topic_id, preferred_language)
                        
                        logger.info(f"AI suggesting new topic session: {suggested_topic_id}")
                        
                        # Generate the new topic suggestion message using utils
                        assistant_message = get_new_topic_suggestion_message(
                            suggested_topic_id, 
                            preferred_language
                        )
                        
                        logger.info("Generated new topic suggestion message, will not store in MongoDB")
                        
                        # Delete the user message from MongoDB since we're not storing this GPT response
                        messages_collection.delete_one({"message_id": user_message_id})
                        logger.info(f"Deleted user message {user_message_id} for new topic suggestion")
                        
                        # Skip saving this message to MongoDB and return immediately
                        return jsonify({
                            "response": assistant_message,
                            "session_id": session_id
                        })
                        
                    else:
                        logger.warning(f"Unknown tool call function: {tool_call.function.name}")
                        # Add error response to messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": "Error: Unknown function called."
                        })
                    
                    # Make second API call to get GPT's response based on tool results
                    try:
                        # Add a guidance message for the second call to ensure GPT responds appropriately
                        if tool_call.function.name == "update_user_progression":
                            # Add guidance for progression tool response
                            messages.append({
                                "role": "system",
                                "content": (
                                    "Based on the user's progress, now continue the lesson by: "
                                    "1. Introducing the next logical concept in this topic. "
                                    "2. Asking a follow-up question related to what they just learned to reinforce their understanding. "
                                    "Do not mention tools or progression explicitly."
                                )
                            })
                        elif tool_call.function.name == "set_current_topic":
                            # Add guidance for topic setting response
                            messages.append({
                                "role": "system", 
                                "content": (
                                    "You have set the session topic. Now begin teaching this topic by: "
                                    "1. Briefly introducing a basic concept or question to assess the user's familiarity. "
                                    "2. Avoid listing subtopics; instead, choose one simple example to engage the user. "
                                    "3. Ask the user to try something or share what they find confusing about the topic. "
                                    "Do not mention tools or topic-setting."
                                )
                            })
                        second_completion = client.chat.completions.create(
                            model="gpt-4o",
                            messages=messages,
                            temperature=0.7,
                        )
                        assistant_message = second_completion.choices[0].message.content or "I've processed your request. How can I help you further?"
                        logger.info("Second GPT call successful - got text response after tool execution")
                    except Exception as second_api_error:
                        logger.error(f"Failed second GPT API call: {str(second_api_error)}")
                        assistant_message = "I've processed your request. How can I help you further?"
                        
                else:
                    # No tool calls, use the original response
                    assistant_message = completion.choices[0].message.content or "I'm sorry, I didn't understand your request. Please try again."
                
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
            
            # Get session data to determine topic and user preferences
            user_id = session.get('user_id')
            session_data = sessions_collection.find_one({"session_id": session_id})
            if not session_data:
                return jsonify({"error": "Session not found"}), 404
                
            # Get user preferences for language
            from database import users_collection
            user_data = users_collection.find_one({"_id": ObjectId(user_id)})
            preferred_language = user_data.get("preferences", {}).get("language", "en") if user_data else "en"
            
            messages = list(messages_collection.find(
                {"session_id": session_id},
                {
                    "_id": 0,  # Do not return MongoDB's _id field
                    "role": 1, 
                    "content": 1,
                    "created_at": 1 
                }
            ).sort("sequence", 1))
            
            # Add progression context as sequence 0 (dynamic, not saved)
            current_topic = session_data.get("topic_id")
            add_progression_context(messages, user_id, current_topic, preferred_language, users_collection)
            
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
                    "topic_id": 1,  # Include topic information
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
            
            # Get optional topic_id from request (when user clicks topic card)
            topic_id = request.json.get('topic_id') if request.json else None
            
            # Get user preferences
            from database import users_collection
            user_data = users_collection.find_one({"_id": ObjectId(user_id)})
            user_preferences = user_data.get("preferences", {}) if user_data else {}
            preferred_language = user_preferences.get("language", "en")
            math_topics = user_preferences.get("math_topics", [])
                
            logger.info(f"Creating new session for user: {user_id}, language: {preferred_language}, topic: {topic_id}")
            
            # Generate session ID and default title
            current_time = datetime.now(gmt8)
            session_id = f"chat_{current_time.timestamp()}".replace(".", "_")
            formatted_time = current_time.strftime("%Y%m%d-%H:%M")
            default_title = f"Chat {formatted_time}"
            
            # Create new session
            session_data = {
                "session_id": session_id,
                "user_id": user_id,
                "title": default_title,
                "topic_id": topic_id,  # Add topic field, can be None initially
                "created_at": current_time,
                "updated_at": current_time,
                "message_count": 0  # Will be updated after adding messages
            }
            
            sessions_collection.insert_one(session_data)
            logger.info(f"Created new session: {session_id}")
            
            # Add system message with language and topic preferences
            system_message = load_system_message()
            
            # Add language preference to system message
            system_message["content"] += f"\n\n{get_language_name(preferred_language)}."
            
            # Add topic-specific instructions if topic is provided
            if topic_id:
                topic_name = get_topic_name(topic_id, preferred_language)
                system_message["content"] += f"\nThe user has selected the topic: {topic_name}. Focus your assistance on this mathematical area."
 
            messages_collection.insert_one({
                "message_id": f"{session_id}_1",
                "session_id": session_id,
                "role": "system",
                "content": system_message["content"],
                "created_at": current_time,
                "sequence": 1
            })
            logger.info("Added system message to new session")
            
            # Note: Progression context will be handled in chat function when needed
            # This keeps the session creation simple with only system and welcome messages
            
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
            
            # Set final message count
            sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {"message_count": 2}}
            )
            
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
            
    def set_current_topic(session_id, topic_id):
        """Helper function to set topic for a session"""
        try:
            sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {"topic_id": topic_id}}
            )
            logger.info(f"Set topic {topic_id} for session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to set topic: {str(e)}")
            return False
            
    return chat_bp
    
def get_user_topic_progression(user_id, topic_id, users_collection):
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user or "progression" not in user or "topics" not in user["progression"]:
        return None

    for topic in user["progression"]["topics"]:
        if topic.get("id") == topic_id:
            return topic
    return None  # not found

def get_all_user_progressions(user_id, users_collection):
    """Get all topic progressions for a user"""
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user or "progression" not in user or "topics" not in user["progression"]:
        return []
    return user["progression"]["topics"]

def update_user_topic_progression(user_id, topic_id, progress, notes, users_collection):
    # find user first
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return False

    # construct new record
    current_time = datetime.now(pytz.timezone('Asia/Singapore'))
    new_topic = {
        "id": topic_id,
        "progress": progress,
        "revision": progress >= 100,
        "last_study_time": current_time.isoformat(),
        "notes": notes
    }

    # check if topic already exists
    found = False
    if "progression" in user and "topics" in user["progression"]:
        for i, topic in enumerate(user["progression"]["topics"]):
            if topic.get("id") == topic_id:
                user["progression"]["topics"][i] = new_topic
                found = True
                break
    else:
        # initialize empty structure
        user["progression"] = {"topics": []}

    if not found:
        user["progression"]["topics"].append(new_topic)

    # update back to database
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"progression.topics": user["progression"]["topics"]}}
    )
    return True


# topic tools schema
tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "set_current_topic",
            "description": (
                "Set the topic for the current session based on the user's message. "
                "Choose ONLY from the provided list, and do not create new topics."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "topic_id": {
                        "type": "string",
                        "enum": get_available_topics()
                    }
                },
                "required": ["topic_id"]
            }
        }
    }
]

# new topic suggestion tools
new_topic_tools = [
    {
        "type": "function",
        "function": {
            "name": "suggest_new_topic_session",
            "description": (
                "Trigger this when the user wants to start a completely new topic in a new session. "
                "This tool should not update the current session; it just generates suggestion links. "
                "Use this when the user says things like 'I want to learn calculus', 'Can we do geometry instead', "
                "'Let's switch to algebra', or expresses desire to change topics completely."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "suggested_topic_id": {
                        "type": "string",
                        "enum": get_available_topics(),
                        "description": "The ID of the topic GPT suggests based on user's message."
                    }
                },
                "required": ["suggested_topic_id"]
            }
        }
    }
]

def get_progression_tools_schema(topic_id):
    return [
        {
            "type": "function",
            "function": {
                "name": "update_user_progression",
                "description": (
                    "Update the user's learning progress for the given topic. "
                    "Call this function whenever the user engages meaningfully—asks questions, attempts answers, shows confusion, or expresses understanding. "
                    "Do NOT call if the user's progress is already 100%."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "topic_id": {
                            "type": "string",
                            "const": topic_id,
                            "description": f"Always use this exact topic ID: {topic_id}"
                        },
                        "progress": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 100,
                            "description": (
                                "Estimate the user's mastery level:\n"
                                "5-15: Engaged or asked a basic question\n"
                                "16-30: Shows early understanding\n"
                                "31-50: Applies concepts with help\n"
                                "51-70: Solid understanding, active attempts\n"
                                "71-85: Solves independently, explains back\n"
                                "86-100: Mastery level, confident and fluent\n"
                                "Skip update if already at 100."
                            )
                        },
                        "notes": {
                            "type": "string",
                            "description": (
                                "Optional. Add a short note about the user's learning behavior, e.g., "
                                "'Attempted solving quadratic equation', 'Asked a question about limits', 'Understood after clarification'."
                            )
                        }
                    },
                    "required": ["topic_id", "progress"]
                }
            }
        }
    ]



from flask import Blueprint

def create_auth_blueprint():
    return Blueprint('auth', __name__)

def create_chat_blueprint():
    return Blueprint('chat', __name__) 
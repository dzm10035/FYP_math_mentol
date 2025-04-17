"""
support functions module
"""

def get_language_name(lang_code):
    """get language full name based on language code"""
    language_map = {
        'zh': '请用中文回答',
        'en': 'Please respond to the user in English',
        'ms': 'Sila jawab dalam Bahasa Malaysia'
    }
    return language_map.get(lang_code, 'Please respond to the user in English')

def get_topic_name(topic_code, lang_code='zh'):
    """get topic name based on topic code and language code"""
    topics_map = {
        'zh': {
            'algebra': '代数',
            'geometry': '几何',
            'calculus': '微积分',
            'statistics': '统计',
            'probability': '概率论',
            'linear_algebra': '线性代数',
            'discrete_math': '离散数学'
        },
        'en': {
            'algebra': 'Algebra',
            'geometry': 'Geometry',
            'calculus': 'Calculus',
            'statistics': 'Statistics',
            'probability': 'Probability',
            'linear_algebra': 'Linear Algebra',
            'discrete_math': 'Discrete Mathematics'
        },
        'ms': {
            'algebra': 'Algebra',
            'geometry': 'Geometri',
            'calculus': 'Kalkulus',
            'statistics': 'Statistik',
            'probability': 'Kebarangkalian',
            'linear_algebra': 'Aljabar Linear',
            'discrete_math': 'Matematik Diskret'
        }
    }
    
    # if language code does not exist, use English as default
    if lang_code not in topics_map:
        lang_code = 'en'
        
    # if topic code does not exist, return original code
    return topics_map[lang_code].get(topic_code, topic_code)

def get_welcome_message(lang_code="en"):
    """
    Get welcome message based on language code
    """
    if lang_code == "zh":
        return "你好！我是数学导师，你的虚拟数学助手。今天我能帮你解决什么问题？"
    elif lang_code == "ms":
        return "Hai! Saya MathMentor, pembantu matematik maya anda. Bagaimana saya boleh membantu anda hari ini?"
    return "Hi! I'm MathMentor, your virtual math assistant. How can I help you today?" 
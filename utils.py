"""
support functions module
"""

def get_language_name(lang_code='en'):
    """get language full name based on language code"""
    language_map = {
        'zh': '请用中文回答',
        'en': 'Please respond to the user in English',
        'ms': 'Sila jawab dalam Bahasa Malaysia'
    }
    return language_map.get(lang_code, language_map['en'])

topics_map = {
    'zh': {
        'algebra': '代数',
        'geometry': '几何',
        'calculus': '微积分',
        'statistics': '统计',
        'probability': '概率论',
        'linear_algebra': '线性代数',
        'discrete_math': '离散数学',
        'trigonometry': '三角学',
        'number_theory': '数论',
        'functions': '函数',
        'ratios_proportions': '比例与比率',
        'percentages': '百分数',
        'equations': '方程与不等式',
        'matrices': '矩阵',
        'vectors': '向量',
    },
    'en': {
        'algebra': 'Algebra',
        'geometry': 'Geometry',
        'calculus': 'Calculus',
        'statistics': 'Statistics',
        'probability': 'Probability',
        'linear_algebra': 'Linear Algebra',
        'discrete_math': 'Discrete Mathematics',
        'trigonometry': 'Trigonometry',
        'number_theory': 'Number Theory',
        'functions': 'Functions',
        'ratios_proportions': 'Ratios and Proportions',
        'percentages': 'Percentages',
        'equations': 'Equations and Inequalities',
        'matrices': 'Matrices',
        'vectors': 'Vectors',
    },
    'ms': {
        'algebra': 'Algebra',
        'geometry': 'Geometri',
        'calculus': 'Kalkulus',
        'statistics': 'Statistik',
        'probability': 'Kebarangkalian',
        'linear_algebra': 'Aljabar Linear',
        'discrete_math': 'Matematik Diskret',
        'trigonometry': 'Trigonometri',
        'number_theory': 'Teori Nombor',
        'functions': 'Fungsi',
        'ratios_proportions': 'Nisbah dan Kadar',
        'percentages': 'Peratusan',
        'equations': 'Persamaan dan Ketaksamaan',
        'matrices': 'Matriks',
        'vectors': 'Vektor',
    }
}

def get_topic_name(topic_code, lang_code='en'):
    """get topic name based on topic code and language code"""
    lang_topics = topics_map.get(lang_code, topics_map['en'])
    #return other topic
    if topic_code == "other":
        other_map = {
            'zh': '其他',
            'en': 'Other',
            'ms': 'Lain-lain'
        }
        return other_map.get(lang_code, 'Other')
    #return all topics
    if topic_code is None:
        return lang_topics
    return lang_topics.get(topic_code, topic_code)

def get_available_topics():
    """get available topics, including other(if not sure about the topic)"""
    return list(topics_map['en'].keys()) + ['other']

def get_welcome_message(lang_code="en"):
    """
    Get welcome message based on language code
    """
    if lang_code == "zh":
        return "你好！我是数学导师，你的虚拟数学助手。今天我能帮你解决什么问题？"
    elif lang_code == "ms":
        return "Hai! Saya MathMentor, pembantu matematik maya anda. Bagaimana saya boleh membantu anda hari ini?"
    return "Hi! I'm MathMentor, your virtual math assistant. How can I help you today?" 

def get_topic_confirmation_message(topic_name, lang_code='en'):
    """Return a topic confirmation message in the desired language."""
    translations = {
        'en': f"I understand you're interested in {topic_name}. How can I help you with this topic?",
        'zh': f"我明白了，你对 {topic_name} 感兴趣。请告诉我你想从哪里开始？",
        'ms': f"Saya faham anda berminat dalam {topic_name}. Bagaimana saya boleh membantu anda dengan topik ini?"
    }
    return translations.get(lang_code, translations['en'])
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
        'logic_thinking': '逻辑思维',
        'complex_numbers': '复数'
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
        'logic_thinking': 'Logical Thinking',
        'complex_numbers': 'Complex Numbers'
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
        'logic_thinking': 'Pemikiran Logik',
        'complex_numbers': 'Nombor Kompleks'
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
        return "你好！我是数学导师，你的虚拟数学助手。今天你想学习什么数学知识？"
    elif lang_code == "ms":
        return "Hai! Saya MathMentor, pembantu matematik maya anda. Hari ini anda mahu belajar apa?"
    return "Hi! I'm MathMentor, your virtual math assistant. What would you like to learn today?" 

def get_topic_confirmation_message(topic_name, lang_code='en'):
    """Return a topic confirmation message in the desired language."""
    translations = {
        'en': f"I understand you're interested in {topic_name}. How can I help you with this topic?",
        'zh': f"我明白了，你对 {topic_name} 感兴趣。请告诉我你想从哪里开始？",
        'ms': f"Saya faham anda berminat dalam {topic_name}. Bagaimana saya boleh membantu anda dengan topik ini?"
    }
    return translations.get(lang_code, translations['en'])

def get_new_topic_suggestion_message(suggested_topic_id, lang_code='en'):
    """Return a new topic suggestion message with navigation links in the desired language."""
    # Get the localized topic name
    localized_topic_name = get_topic_name(suggested_topic_id, lang_code)
    
    translations = {
        'en': {
            'ready': "It looks like you're ready for a new topic!",
            'start_new': f"Start a new session on *{localized_topic_name}*",
            'choose_own': "Or start a fresh session and choose your own topic"
        },
        'zh': {
            'ready': "看起来你准备开始一个新话题了！",
            'start_new': f"开始一个新的 *{localized_topic_name}* 学习会话",
            'choose_own': "或者开始一个全新的会话并选择你自己的话题"
        },
        'ms': {
            'ready': "Nampaknya anda sudah bersedia untuk topik baru!",
            'start_new': f"Mulakan sesi baru untuk *{localized_topic_name}*",
            'choose_own': "Atau mulakan sesi baru dan pilih topik anda sendiri"
        }
    }
    
    lang_trans = translations.get(lang_code, translations['en'])
    
    return (
        f"{lang_trans['ready']}\n\n"
        f"👉 [{lang_trans['start_new']}](/chat?topic={suggested_topic_id})\n"
        f"🆕 [{lang_trans['choose_own']}](/chat?new=true)"
    )
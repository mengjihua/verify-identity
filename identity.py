from typing import Dict, List, Tuple

# 身份识别数据库
ALIASES: Dict[str, List[str]] = {
    "一头猪": ["没计划", "meijihua", "没", "王", "钟"],
    "神": ["梦计划", "mjh", "mengjihua", "梦", "计", "划",  "马"],
    "大师兄": ["孙悟空", "齐天大圣", "悟空", "猴子", "wukong"],
    "二师兄": ["猪八戒", "八戒", "天蓬元帅", "zhu", "bajie"],
    "三师弟": ["沙僧", "沙悟净", "沙和尚", "sha", "wujing"],
    "唐僧": ["唐三藏", "玄奘", "tang", "sanzang", "和尚"],
    "哪吒": ["哪吒三太子", "哪吒三太", "nazha", "小哪吒", "莲花化身"],
    "二郎神": ["杨戬", "yangerlang", "哮天犬", "真君", "杨二郎"],
    "嫦娥": ["嫦娥仙子", "chang e", "月神", "广寒宫", "奔月"],
    "牛魔王": ["平天大圣", "niu mo wang", "牛大", "铁扇公主夫", "牛王"],
    "红孩儿": ["圣婴大王", "hong haier", "红孩子", "火云洞", "童子"],
    # 神话/小说角色
    "白龙马": ["小白龙", "玉龙", "白马", "龙马", "敖烈"],
    "白骨精": ["白姑娘", "骷髅怪", "白夫人", "白夫人", "白狐"],
    "青牛精": ["老青", "青牛", "金刚琢", "坐骑", "太上老君牛"],
    "狮驼王": ["大鹏魔王", "狮驼岭", "金翅大鹏", "大鹏", "金翅雕"],
    "蜘蛛精": ["七仙女", "蜘蛛怪", "七蛛", "盘丝洞", "盘丝大仙"],
    # 动物身份
    "熊猫": ["国宝", "panda", "猫熊", "滚滚", "团子"],
    "老虎": ["大虫", "虎王", "山君", "猛虎", "laohu"],
    "狐狸": ["赤狐", "灵狐", "狐妖", "huli", "fox"],
    "海豹": ["seal", "小海豹", "海狗", "憨憨海豹", "北极萌宠"],
    "企鹅": ["penguin", "南极侠", "摇摆侠", "胖企鹅", "企星"],
    # 其他武侠/小说
    "杨过": ["过儿", "神雕大侠", "杨郎", "雕兄", "杨叔"],
    "小龙女": ["龙姑娘", "姑姑", "龙儿", "古墓派", "longnv"],
    "郭靖": ["靖哥哥", "北侠", "大侠郭靖", "弓箭手", "guojing"],
    "黄蓉": ["蓉儿", "丐帮帮主", "桃花岛", "黄女侠", "rong"],
    "令狐冲": ["冲哥", "独孤九剑", "华山弟子", "酒剑仙", "linghu"],
    "张无忌": ["明教教主", "无忌", "九阳", "乾坤大挪移", "zj"],
    # 网络用语/次元角色
    "兴亚艺": ["兴亚艺", "xing yai", "xyy", "兴亚", "亚艺"],
    "雌小鬼": ["雌小鬼", "tsun girl", "鬼萝", "幼鬼", "小恶魔"],
    "二刺螈": ["二次元", "二刺螈", "acg", "宅圈", "erciyuan"],
    "打工人": ["打工人", "社畜", "dagong", "搬砖侠", "社畜人"],
    "摸鱼王": ["摸鱼", "划水", "mo yu", "混日子", "鱼王"],
    "卷王": ["卷王", "内卷狂魔", "卷起来", "加班侠", "juan"],
    "躺平侠": ["躺平", "佛系", "摆烂", "tang ping", "躺族"],
    "社恐": ["社恐", "社交恐惧", "怕生", "射恐", "shekong"],
    "工具人": ["工具人", "工具侠", "打杂", "辅助位", "gjs"],
    "小透明": ["小透明", "透明人", "nobody", "默默无闻", "低调党"],
}

# 预归一化关键词列表，减少重复 lower/strip
NORMALIZED_KEYWORDS: List[Tuple[str, str]] = [
    (kw.strip().lower(), label)
    for label, keywords in ALIASES.items()
    for kw in keywords
]


def normalize(text: str) -> str:
    return text.strip().lower()


def fallback_pick(query: str) -> str:
    ascii_sum = sum(ord(ch) for ch in query)
    labels = list(ALIASES.keys())
    return labels[ascii_sum % len(labels)]


def identify(text: str) -> Tuple[str, str]:
    """Return (label, method) where method is 'alias' or 'fallback'."""
    query = normalize(text)

    # 快速遍历已归一化的关键词
    for kw_norm, label in NORMALIZED_KEYWORDS:
        if kw_norm in query or query in kw_norm:
            return label, "alias"
    return fallback_pick(query), "fallback"


def list_labels() -> List[str]:
    return list(ALIASES.keys())

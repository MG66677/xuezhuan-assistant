#!/usr/bin/env python3
"""
副业机会监控器 - 扫描各大平台寻找可接单的机会
使用方法: python opportunities.py
输出: 保存到 data/opportunities.json
"""
import sys, os, json, re
from datetime import datetime

# 本地数据文件路径
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
OPP_FILE = os.path.join(DATA_DIR, "opportunities.json")

# 关键词库
SKILL_KEYWORDS = [
    "python", "爬虫", "数据", "自动化", "脚本", "excel", "办公",
    "编程", "开发", "采集", "分析", "报表", "抓取", "pandas"
]

# 平台配置（用户需要提供具体URL/关键词去搜索）
PLATFORMS = {
    "闲鱼": {
        "search_url": "https://2.taobao.com/search?q={keyword}&type=item",
        "type": "c2c",
        "description": "搜"python接单"、"爬虫代写"、"数据处理""
    },
    "猪八戒网": {
        "search_url": "https://www.zbj.com/search?kw={keyword}",
        "type": "freelance",
        "description": "搜"Python开发"、"数据采集"、"爬虫""
    },
    "知乎": {
        "search_url": "https://www.zhihu.com/search?q={keyword}",
        "type": "content",
        "description": "搜索相关问答，私信引流"
    }
}

def scan_platform(sources_file=None):
    """扫描平台获取机会（目前为模拟/指南模式，需要用户自己去搜）"""
    opportunities = []
    
    # 从本地保存的线索加载
    if sources_file and os.path.exists(sources_file):
        with open(sources_file, "r", encoding="utf-8") as f:
            try:
                opportunities = json.load(f)
            except:
                pass
    return opportunities

def add_opportunity(source, title, url, desc, price_hint=""):
    """手动添加一个机会"""
    opps = load_opportunities()
    # 去重
    for o in opps:
        if o["url"] == url:
            o["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
            save_opportunities(opps)
            return o
    
    opp = {
        "id": len(opps) + 1,
        "source": source,
        "title": title,
        "url": url,
        "description": desc,
        "price_hint": price_hint,
        "status": "new",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    opps.append(opp)
    save_opportunities(opps)
    return opp

def load_opportunities():
    try:
        with open(OPP_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_opportunities(opps):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OPP_FILE, "w", encoding="utf-8") as f:
        json.dump(opps, f, ensure_ascii=False, indent=2)

def show_guide():
    """显示副业接单操作指南"""
    return {
        "platforms": [
            {"name": "闲鱼", "action": '发布商品"Python编程 数据爬虫 Excel处理 代做"', "tips": "定价¥50起，积累好评后涨价"},
            {"name": "小红书", "action": '发笔记"Python自学|数据分析|自动化办公"类内容', "tips": "坚持发1个月，会有私信问价"},
            {"name": "知乎", "action": "回答Python/数据类问题，留联系方式", "tips": "选高浏览量问题回答，流量大"},
            {"name": "猪八戒网", "action": "注册服务商，发布服务", "tips": "竞争大，建议低价切入"},
            {"name": "微信群/QQ群", "action": "加大学生/职场群，有需求就接", "tips": "最直接的获客方式"},
            {"name": "Fiverr/Upwork", "action": "注册账号，发布Python服务", "tips": "英语好可以去，单价高"},
        ],
        "pricing": [
            "网页数据采集：¥100-500/单（根据页面复杂度和数据量）",
            "Excel处理：¥100-300/单（清洗、合并、报表）",
            "PDF报告：¥200-1000/单（根据页数和复杂度）",
            "自动化脚本：¥200-500/单（简单脚本，复杂另议）",
            "批量文件处理：¥50-200/单（量大从优）",
        ],
        "tips": [
            "第一单可以低价甚至免费做，用来截图做案例",
            "每次交付后请客户给好评/推荐",
            "积累10个案例后可以做作品集页面",
            "建立客户群，复购率是关键",
            "学会说"这个可以做"而不是"这个我不会"",
        ]
    }

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "add":
        if len(sys.argv) >= 5:
            add_opportunity(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] if len(sys.argv) > 5 else "")
        else:
            print("用法: opportunities.py add <来源> <标题> <链接> [描述]")
        return
    
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        opps = load_opportunities()
        print(json.dumps(opps, ensure_ascii=False, indent=2))
        return
    
    # 默认输出指南
    print(json.dumps(show_guide(), ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

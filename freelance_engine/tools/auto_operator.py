#!/usr/bin/env python3
"""
自动运营机器人 - 帮你处理发帖、跟进、交付全流程
"""
import sys, os, json
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)

AUTO_FILE = os.path.join(DATA_DIR, "auto_ops.json")

def load_auto():
    try:
        with open(AUTO_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {
            "scheduled_posts": [],
            "auto_replies": [],
            "follow_up_queue": [],
            "stats": {"total_posts": 0, "total_leads": 0, "total_revenue": 0}
        }

def save_auto(d):
    with open(AUTO_FILE, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

def schedule_post(platform, title, content, schedule_time=None):
    """安排一个发帖任务"""
    d = load_auto()
    post = {
        "id": len(d["scheduled_posts"]) + 1,
        "platform": platform,
        "title": title,
        "content": content,
        "status": "pending",
        "scheduled_for": schedule_time or datetime.now().strftime("%Y-%m-%d %H:%M"),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "posted_at": None,
        "views": 0,
        "inquiries": 0
    }
    d["scheduled_posts"].append(post)
    d["stats"]["total_posts"] += 1
    save_auto(d)
    return post

def mark_posted(post_id):
    """标记帖子已发布"""
    d = load_auto()
    for p in d["scheduled_posts"]:
        if p["id"] == post_id:
            p["status"] = "posted"
            p["posted_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
            save_auto(d)
            return p
    return None

def generate_auto_listings():
    """自动生成多平台发帖内容"""
    from datetime import date
    today = date.today().strftime("%m-%d")
    
    listings = [
        {
            "platform": "闲鱼",
            "title": "Python编程｜爬虫｜Excel处理｜脚本定制 学生优惠",
            "content": f"[{today}更新] 在校计算机专业，Python接单\n\n✅ 爬虫采集：商品/文章/数据\n✅ Excel处理：清洗/报表/合并\n✅ PDF生成：数据→专业报告\n✅ 自动化脚本：文件/流程\n\n💰 学生价：¥50起\n⏱ 24h交付\n📱 直接私信发需求",
            "tags": "#Python #爬虫 #数据处理"
        },
        {
            "platform": "小红书",
            "title": "大学生Python接单｜帮了30+同学处理数据后的心得",
            "content": f"做Python接单3个月了，帮学长学姐和校外客户处理了30+任务\n\n分享一下大家最常问的几个需求：\n\n1️⃣ 爬虫类（最多）\n爬商品价格、论文数据、招聘信息\n一般¥100-300，页面复杂另议\n\n2️⃣ Excel处理（第二多）\n数据太乱不会整理？\n清洗、合并、做报表\n一般¥50-200\n\n3️⃣ PDF报告（单价最高）\n从数据生成专业报告的\n一般¥200-800\n\n有需要的同学直接私信我发需求，免费评估报价\n不用客气，砍价也行，学生互相帮助",
            "tags": "#Python #大学生副业"
        },
        {
            "platform": "知乎",
            "title": "有哪些适合大学生的线上副业？",
            "content": "作为一个计算机专业的学生，分享一个门槛低、来钱稳定的副业：Python接单。\n\n不需要很厉害，会基础语法+requests+openpyxl就够了。\n\n在哪里接单：\n1. 闲鱼发布商品（推荐，流量大）\n2. 小红书发笔记（可以引流）\n3. 学校群/论坛（身边就有需求）\n\n报价参考：\n• 简单爬虫 ¥100-300\n• Excel处理 ¥50-200\n• PDF报告 ¥200-800\n\n重要的是：第一单做好截图，往后就好接了。",
            "tags": "#副业 #Python #大学生"
        }
    ]
    return listings

def auto_follow_up(days_since_last=3):
    """自动生成跟进任务"""
    d = load_auto()
    now = datetime.now()
    follow_ups = []
    
    for lead_data in d.get("leads", []):
        created = datetime.strptime(lead_data.get("created_at", now.strftime("%Y-%m-%d")), "%Y-%m-%d")
        if (now - created).days >= days_since_last and lead_data.get("status") == "新询价":
            follow_ups.append({
                "lead_id": lead_data.get("id"),
                "lead_name": lead_data.get("name", "客户"),
                "action": "跟进",
                "suggested_reply": f"你好 {lead_data.get('name', '')}，之前聊的需求你考虑得怎么样了？有什么问题随时问我哦 😊"
            })
    return follow_ups

def main():
    if len(sys.argv) < 2:
        cmds = ["generate", "schedule", "mark-posted", "follow-up", "status"]
        print(json.dumps({"available_commands": cmds, "usage": "python auto_operator.py <command> [args]"}))
        return
    
    cmd = sys.argv[1]
    
    if cmd == "generate":
        result = generate_auto_listings()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    elif cmd == "schedule":
        if len(sys.argv) < 4:
            print(json.dumps({"error": "用法: schedule <平台> <标题> [内容]"}))
            return
        platform = sys.argv[2]
        title = sys.argv[3]
        content = sys.argv[4] if len(sys.argv) > 4 else ""
        post = schedule_post(platform, title, content)
        print(json.dumps(post, ensure_ascii=False))
    
    elif cmd == "mark-posted":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "用法: mark-posted <post_id>"}))
            return
        result = mark_posted(int(sys.argv[2]))
        print(json.dumps(result, ensure_ascii=False))
    
    elif cmd == "follow-up":
        result = auto_follow_up()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    elif cmd == "status":
        d = load_auto()
        print(json.dumps({
            "pending_posts": len([p for p in d["scheduled_posts"] if p["status"] == "pending"]),
            "posted": len([p for p in d["scheduled_posts"] if p["status"] == "posted"]),
            "total_posts": d["stats"]["total_posts"],
            "total_leads": d["stats"]["total_leads"],
            "total_revenue": d["stats"]["total_revenue"],
            "follow_ups_needed": len(auto_follow_up())
        }, ensure_ascii=False))

if __name__ == "__main__":
    main()

import json, sqlite3, os
from openai import OpenAI
from tools import Tools
from memory import Memory

class StudentAgent:
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
        self.memory = Memory()
        self.tools = Tools(self.memory)
        self.mode = "study"
        self.history = []

    def set_mode(self, mode: str):
        self.mode = mode
        return f"切换到{'学业' if mode == 'study' else '赚钱'}模式"

    def _build_system_prompt(self) -> str:
        base = "你是一个大学生个人助理，帮助用户高效完成学业和线上赚钱。"
        if self.mode == "study":
            base += """
当前模式：学业助手
你可以做的：
- 整理笔记：把讲义/课件梳理想法
- 作业规划：拆解作业步骤，安排时间线
- 复习助手：生成复习卡片、练习题
- 论文辅助：帮忙搭大纲、理逻辑、查资料
- 时间管理：根据课表和截止日期排优先级
"""
        else:
            base += """
当前模式：赚钱助手
你可以做的：
- 机会发现：根据用户技能推荐适合的线上赚钱方式
- 任务管理：跟踪进行中的项目/订单
- 内容辅助：写文案、润色、排版
- 技能分析：建议学什么技能市场价值高
- 报价建议：帮估算项目报价
"""
        return base + "\n请使用可用工具来回答。回答要简短、实用。"

    def _get_tools_schema(self):
        return [
            {"type": "function", "function": {
                "name": "search_knowledge",
                "description": "从本地记忆中检索相关信息",
                "parameters": {"type": "object", "properties": {
                    "query": {"type": "string", "description": "搜索关键词"}
                }, "required": ["query"]}
            }},
            {"type": "function", "function": {
                "name": "save_note",
                "description": "保存笔记到本地知识库",
                "parameters": {"type": "object", "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                    "tags": {"type": "string", "description": "逗号分隔的标签"}
                }, "required": ["title", "content"]}
            }},
            {"type": "function", "function": {
                "name": "create_task",
                "description": "创建一个待办任务",
                "parameters": {"type": "object", "properties": {
                    "title": {"type": "string"},
                    "deadline": {"type": "string"},
                    "priority": {"type": "string", "enum": ["高", "中", "低"]}
                }, "required": ["title"]}
            }},
            {"type": "function", "function": {
                "name": "list_tasks",
                "description": "查看待办任务列表",
                "parameters": {"type": "object", "properties": {
                    "status": {"type": "string", "enum": ["待办", "进行中", "已完成"]}
                }, "required": []}
            }},
            {"type": "function", "function": {
                "name": "switch_mode",
                "description": "切换模式",
                "parameters": {"type": "object", "properties": {
                    "mode": {"type": "string", "enum": ["study", "earn"]}
                }, "required": ["mode"]}
            }}
        ]

    def _run_tool(self, call) -> str:
        name = call.function.name
        args = json.loads(call.function.arguments)
        if name == "search_knowledge":
            return self.tools.search_knowledge(args["query"])
        elif name == "save_note":
            return self.tools.save_note(**args)
        elif name == "create_task":
            return self.tools.create_task(**args)
        elif name == "list_tasks":
            return self.tools.list_tasks(args.get("status"))
        elif name == "switch_mode":
            return self.set_mode(args["mode"])
        return f"未知工具: {name}"

    def chat(self, message: str) -> str:
        self.history.append({"role": "user", "content": message})
        context = self.memory.retrieve(message)
        if context:
            self.history.append({"role": "system", "content": f"相关记忆：\n{context}"})
        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": self._build_system_prompt()},
                *self.history[-20:]
            ],
            tools=self._get_tools_schema(),
            tool_choice="auto"
        )
        msg = resp.choices[0].message
        if msg.tool_calls:
            self.history.append(msg)
            for tc in msg.tool_calls:
                result = self._run_tool(tc)
                self.history.append({"role": "tool", "tool_call_id": tc.id, "content": result})
            final = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": self._build_system_prompt()},
                    *self.history[-25:]
                ]
            )
            reply = final.choices[0].message.content
        else:
            reply = msg.content
        self.history.append({"role": "assistant", "content": reply})
        return reply

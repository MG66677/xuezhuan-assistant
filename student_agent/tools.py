"""工具层 - 包装记忆层，供 core 调用"""
from memory import Memory

class Tools:
    def __init__(self, memory: Memory):
        self.memory = memory

    def search_knowledge(self, query: str) -> str:
        result = self.memory.retrieve(query)
        if result:
            return f"找到以下相关内容：\n{result}"
        return "没有找到相关内容"

    def save_note(self, title: str, content: str, tags: str = "") -> str:
        return self.memory.save_note(title, content, tags)

    def create_task(self, title: str, deadline: str = "", priority: str = "中") -> str:
        return self.memory.create_task(title, deadline, priority)

    def list_tasks(self, status: str = None) -> str:
        return self.memory.list_tasks(status)

"""学生 Agent - 入口"""
import os
import sys
from core import StudentAgent

def main():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("请设置 OPENAI_API_KEY 环境变量")
        print("示例: $env:OPENAI_API_KEY='sk-xxx'")
        return

    agent = StudentAgent(api_key)
    print("=" * 50)
    print("🎓 学生 Agent 启动")
    print("当前模式：学业助手（输入 '换赚钱' 切换到赚钱模式）")
    print("输入 'exit' 退出")
    print("=" * 50)

    while True:
        try:
            user_input = input("\n你: ").strip()
            if user_input.lower() in ["exit", "quit"]:
                print("再见！")
                break
            if not user_input:
                continue
            reply = agent.chat(user_input)
            print(f"\nAgent: {reply}")
        except KeyboardInterrupt:
            print("\n再见！")
            break
        except Exception as e:
            print(f"\n出错了: {e}")

if __name__ == "__main__":
    main()

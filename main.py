import sys
from identity import identify


def interactive_loop() -> None:
    print("身份判定小工具。输入名字或别名，输入 exit 退出。")
    for line in sys.stdin:
        query = line.strip()
        if not query:
            continue
        if query.lower() in {"exit", "quit"}:
            print("再见！")
            break
        label, method = identify(query)
        suffix = "规则匹配" if method == "alias" else "智能分配"
        print(f"{label} - {suffix}")


def main() -> None:
    if len(sys.argv) > 1:
        user_input = " ".join(sys.argv[1:])
        label, method = identify(user_input)
        suffix = "规则匹配" if method == "alias" else "智能分配"
        print(f"{label} - {suffix}")
    else:
        interactive_loop()


if __name__ == "__main__":
    main()

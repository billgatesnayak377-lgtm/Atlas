print("===== Atlas Task Manager =====")

tasks = []

num = int(input("How many tasks do you want to add? "))

for i in range(num):
    task = input(f"Enter Task {i + 1}: ")
    tasks.append(task)

print("\n===== Today's Tasks =====")

for i, task in enumerate(tasks, start=1):
    print(f"{i}. {task}")
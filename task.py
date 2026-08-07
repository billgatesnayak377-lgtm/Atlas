tasks = int(input("How many tasks do you have today? "))

for i in range(1, tasks + 1):
    task = input(f"Enter Task {i}: ")
    print(f"Task Saved: {task}")
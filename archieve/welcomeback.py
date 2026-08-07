with open("tasks.txt", "r") as file:
    tasks = file.readlines()

for task in tasks:
    print(task.strip())
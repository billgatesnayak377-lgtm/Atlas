tasks = []

num = int(input("How many tasks? "))

for i in range(num):
    task = input("Task: ")
    tasks.append(task)

with open("tasks.txt", "w") as file:
    for task in tasks:
        file.write(task + "\n")
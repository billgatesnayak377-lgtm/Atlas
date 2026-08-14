import { useEffect, useState } from "react";
import DashboardCard from "../components/layout/DashboardCard";
import TaskCard from "../components/tasks/TaskCard";
import AddTask from "../components/tasks/AddTask";
import ProgressBar from "../components/ui/ProgressBar";

type Priority = "high" | "medium" | "low";

type Task = {
  id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string;
};

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem("atlas-tasks");

    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);

      return parsedTasks.map((task: Task) => ({
        ...task,
        priority: task.priority ?? "medium",
      }));
    }

    return [
      {
        id: 1,
        title: "Study React",
        completed: true,
        priority: "high",
        dueDate: "2026-08-15",
      },
      {
        id: 2,
        title: "Go to Gym",
        completed: false,
        priority: "medium",
        dueDate: "2026-08-15",
      },
      {
        id: 3,
        title: "Build Atlas",
        completed: false,
        priority: "high",
        dueDate: "2026-08-20",
      },
    ];
  });

  // Save tasks whenever they change
  useEffect(() => {
    localStorage.setItem(
      "atlas-tasks",
      JSON.stringify(tasks)
    );
  }, [tasks]);

  // Calculate completed tasks
  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  // Calculate progress
  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (completedTasks / tasks.length) * 100
        );

  // Complete / uncomplete task
  function toggleTask(taskId: number) {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
            }
          : task
      )
    );
  }

  // Delete task
  function deleteTask(taskId: number) {
    setTasks(
      tasks.filter((task) => task.id !== taskId)
    );
  }

  // Add task
  function addTask(title: string) {
    const newTask: Task = {
      id: Date.now(),
      title: title,
      completed: false,
      priority: "medium",
      dueDate: undefined,
    };

    setTasks([...tasks, newTask]);
  }

  // Edit task title
  function editTask(taskId: number) {
    const task = tasks.find(
      (task) => task.id === taskId
    );

    if (!task) {
      return;
    }

    const newTitle = window.prompt(
      "Edit task",
      task.title
    );

    if (
      newTitle === null ||
      newTitle.trim() === ""
    ) {
      return;
    }

    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title: newTitle.trim(),
            }
          : task
      )
    );
  }

  // Change priority
  function changePriority(
    taskId: number,
    priority: Priority
  ) {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              priority,
            }
          : task
      )
    );
  }

  // Change due date
  function changeDueDate(
    taskId: number,
    dueDate: string
  ) {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              dueDate,
            }
          : task
      )
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <DashboardCard>

        {/* Greeting */}
        <h1 className="text-4xl font-bold text-sky-400">
          👋 Good Evening, Bill
        </h1>

        <p className="text-slate-400 mt-2">
          Friday • 7 August
        </p>

        <div className="border-t border-slate-700 my-6"></div>

        {/* Today's Focus */}
        <h2 className="text-2xl font-semibold text-white">
          🎯 Today's Focus
        </h2>

        {/* Tasks */}
        <div className="mt-5 space-y-4">
          {tasks.map((task) => (
            <div key={task.id}>

              <TaskCard
                title={task.title}
                completed={task.completed}
                priority={task.priority}
                dueDate={task.dueDate}
                onToggle={() =>
                  toggleTask(task.id)
                }
                onDelete={() =>
                  deleteTask(task.id)
                }
                onEdit={() =>
                  editTask(task.id)
                }
              />

              {/* Priority */}
              <div className="flex gap-2 mt-2 ml-2">
                <button
                  onClick={() =>
                    changePriority(task.id, "high")
                  }
                  className={`text-xs px-3 py-1 rounded-lg transition ${
                    task.priority === "high"
                      ? "bg-red-500/30 text-red-400"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  🔴 High
                </button>

                <button
                  onClick={() =>
                    changePriority(task.id, "medium")
                  }
                  className={`text-xs px-3 py-1 rounded-lg transition ${
                    task.priority === "medium"
                      ? "bg-yellow-500/30 text-yellow-400"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  🟡 Medium
                </button>

                <button
                  onClick={() =>
                    changePriority(task.id, "low")
                  }
                  className={`text-xs px-3 py-1 rounded-lg transition ${
                    task.priority === "low"
                      ? "bg-green-500/30 text-green-400"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  🟢 Low
                </button>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-3 mt-2 ml-2">
                <label className="text-xs text-slate-400">
                  📅 Due:
                </label>

                <input
                  type="date"
                  value={task.dueDate ?? ""}
                  onChange={(event) =>
                    changeDueDate(
                      task.id,
                      event.target.value
                    )
                  }
                  className="rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                />
              </div>

            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-6">
          <ProgressBar progress={progress} />
        </div>

        {/* Add Task */}
        <div className="mt-5">
          <AddTask onAddTask={addTask} />
        </div>

      </DashboardCard>
    </div>
  );
}
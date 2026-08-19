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

type PlannedTask = {
  id: number;
  title: string;
  priority: Priority;
  dueDate: string | null;
  reason: string;
  suggestedOrder: number;
};

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem("atlas-tasks");

    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);

        return parsedTasks.map((task: Task) => ({
          ...task,
          priority: task.priority ?? "medium",
        }));
      } catch {
        console.error("Could not load saved tasks.");
      }
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

  const [smartTask, setSmartTask] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [isPlannerLoading, setIsPlannerLoading] =
    useState(false);

  const [dailyPlan, setDailyPlan] = useState<
    PlannedTask[]
  >([]);

  const [plannerSummary, setPlannerSummary] =
    useState("");

  const [showPlanner, setShowPlanner] =
    useState(false);

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
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
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
    setTasks((currentTasks) =>
      currentTasks.filter(
        (task) => task.id !== taskId
      )
    );
  }

  // Add normal task
  function addTask(title: string) {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    const newTask: Task = {
      id: Date.now(),
      title: trimmedTitle,
      completed: false,
      priority: "medium",
      dueDate: undefined,
    };

    setTasks((currentTasks) => [
      ...currentTasks,
      newTask,
    ]);
  }

  // Edit task
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

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
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
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
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
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              dueDate: dueDate || undefined,
            }
          : task
      )
    );
  }

  // AI Task Assistant
  async function createSmartTask() {
    const input = smartTask.trim();

    if (!input || isAiLoading) {
      return;
    }

    setIsAiLoading(true);

    try {
      const response = await fetch(
        "/api/task-assistant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Atlas could not understand the task."
        );
      }

      if (
        typeof data.title !== "string" ||
        !data.title.trim()
      ) {
        throw new Error(
          "Atlas returned an invalid task."
        );
      }

      const validPriorities: Priority[] = [
        "high",
        "medium",
        "low",
      ];

      const priority: Priority =
        validPriorities.includes(data.priority)
          ? data.priority
          : "medium";

      const newTask: Task = {
        id: Date.now(),
        title: data.title.trim(),
        completed: false,
        priority,
        dueDate:
          typeof data.dueDate === "string"
            ? data.dueDate
            : undefined,
      };

      setTasks((currentTasks) => [
        ...currentTasks,
        newTask,
      ]);

      setSmartTask("");
    } catch (error) {
      console.error(
        "Atlas Task Assistant error:",
        error
      );

      window.alert(
        "Atlas couldn't understand that task. Please try again."
      );
    } finally {
      setIsAiLoading(false);
    }
  }

  // Smart Daily Planner
  async function planMyDay() {
    if (isPlannerLoading) {
      return;
    }

    const activeTasks = tasks.filter(
      (task) => !task.completed
    );

    if (activeTasks.length === 0) {
      window.alert(
        "You have no unfinished tasks to plan."
      );
      return;
    }

    setIsPlannerLoading(true);

    try {
      const response = await fetch(
        "/api/daily-planner",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tasks: activeTasks,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Atlas could not create your plan."
        );
      }

      if (!Array.isArray(data.plan)) {
        throw new Error(
          "Invalid planner response."
        );
      }

      const validIds = new Set(
        activeTasks.map((task) => task.id)
      );

      const cleanedPlan: PlannedTask[] =
        data.plan
          .filter((task: PlannedTask) =>
            validIds.has(task.id)
          )
          .sort(
            (
              a: PlannedTask,
              b: PlannedTask
            ) =>
              a.suggestedOrder -
              b.suggestedOrder
          )
          .map(
            (
              task: PlannedTask,
              index: number
            ) => ({
              ...task,
              suggestedOrder: index + 1,
            })
          );

      setDailyPlan(cleanedPlan);

      setPlannerSummary(
        typeof data.summary === "string"
          ? data.summary
          : "Here is your recommended order for today."
      );

      setShowPlanner(true);
    } catch (error) {
      console.error(
        "Atlas planner error:",
        error
      );

      window.alert(
        "Atlas couldn't create your daily plan. Please try again."
      );
    } finally {
      setIsPlannerLoading(false);
    }
  }

  // Dynamic greeting
  const currentHour =
    new Date().getHours();

  let greeting = "Good Evening";

  if (currentHour < 12) {
    greeting = "Good Morning";
  } else if (currentHour < 17) {
    greeting = "Good Afternoon";
  }

  // Dynamic date
  const currentDate =
    new Date().toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      }
    );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">

      <DashboardCard>

        {/* Greeting */}
        <h1 className="text-4xl font-bold text-sky-400">
          👋 {greeting}, Bill
        </h1>

        <p className="text-slate-400 mt-2">
          {currentDate}
        </p>

        <div className="border-t border-slate-700 my-6" />

        {/* AI Task Assistant */}
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 mb-6">

          <div className="flex items-center gap-2">

            <span className="text-2xl">
              🧠
            </span>

            <div>
              <h2 className="text-xl font-semibold text-white">
                Atlas Task Assistant
              </h2>

              <p className="text-sm text-slate-400">
                Tell Atlas what you need to do.
              </p>
            </div>

          </div>

          <div className="flex gap-3 mt-4">

            <input
              type="text"
              value={smartTask}
              onChange={(event) =>
                setSmartTask(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !isAiLoading
                ) {
                  createSmartTask();
                }
              }}
              disabled={isAiLoading}
              placeholder="e.g. Finish Atlas tomorrow, high priority"
              className="flex-1 rounded-xl bg-slate-900 text-white px-4 py-3 border border-slate-700 focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />

            <button
              onClick={createSmartTask}
              disabled={
                isAiLoading ||
                smartTask.trim() === ""
              }
              className="rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-semibold px-5 transition"
            >
              {isAiLoading
                ? "Thinking..."
                : "Add"}
            </button>

          </div>

          <p className="text-xs text-slate-500 mt-3">
            Try: "Finish my BESS report next Friday,
            make it urgent"
          </p>

        </div>

        {/* Today's Focus */}
        <div className="flex items-center justify-between gap-4">

          <h2 className="text-2xl font-semibold text-white">
            🎯 Today's Focus
          </h2>

          <button
            onClick={planMyDay}
            disabled={isPlannerLoading}
            className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50 transition whitespace-nowrap"
          >
            {isPlannerLoading
              ? "Planning..."
              : "🧠 Plan My Day"}
          </button>

        </div>

        {/* Daily Planner Result */}
        {showPlanner && (
          <div className="mt-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">

            <div className="flex items-center justify-between">

              <div>
                <h3 className="text-xl font-semibold text-purple-300">
                  🧠 Your Daily Plan
                </h3>

                <p className="text-sm text-slate-400 mt-1">
                  {plannerSummary}
                </p>
              </div>

              <button
                onClick={() =>
                  setShowPlanner(false)
                }
                className="text-slate-500 hover:text-white text-xl"
                aria-label="Close daily plan"
              >
                ×
              </button>

            </div>

            <div className="mt-5 space-y-3">

              {dailyPlan.map((task) => (

                <div
                  key={task.id}
                  className="rounded-xl bg-slate-900/80 border border-slate-800 p-4"
                >

                  <div className="flex items-start gap-3">

                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-semibold">
                      {task.suggestedOrder}
                    </div>

                    <div className="flex-1">

                      <div className="flex items-center justify-between gap-3">

                        <h4 className="text-white font-medium">
                          {task.title}
                        </h4>

                        <span
                          className={`text-xs px-2 py-1 rounded-lg ${
                            task.priority ===
                            "high"
                              ? "bg-red-500/20 text-red-400"
                              : task.priority ===
                                "medium"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {task.priority}
                        </span>

                      </div>

                      {task.dueDate && (
                        <p className="text-xs text-slate-500 mt-1">
                          📅 Due:{" "}
                          {task.dueDate}
                        </p>
                      )}

                      <p className="text-sm text-slate-400 mt-2">
                        {task.reason}
                      </p>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>
        )}

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
                    changePriority(
                      task.id,
                      "high"
                    )
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
                    changePriority(
                      task.id,
                      "medium"
                    )
                  }
                  className={`text-xs px-3 py-1 rounded-lg transition ${
                    task.priority ===
                    "medium"
                      ? "bg-yellow-500/30 text-yellow-400"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  🟡 Medium
                </button>

                <button
                  onClick={() =>
                    changePriority(
                      task.id,
                      "low"
                    )
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
                  value={
                    task.dueDate ?? ""
                  }
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
          <ProgressBar
            progress={progress}
          />
        </div>

        {/* Normal Add Task */}
        <div className="mt-5">
          <AddTask
            onAddTask={addTask}
          />
        </div>

      </DashboardCard>

    </div>
  );
}
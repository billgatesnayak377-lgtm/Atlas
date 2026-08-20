import { useEffect, useState } from "react";
import DashboardCard from "../components/layout/DashboardCard";
import TaskCard from "../components/tasks/TaskCard";
import AddTask from "../components/tasks/AddTask";
import ProgressBar from "../components/ui/ProgressBar";
import FocusMode from "../components/focus/FocusMode";

type Priority = "high" | "medium" | "low";

type Category =
  | "work"
  | "study"
  | "health"
  | "personal"
  | "finance"
  | "other";

type Task = {
  id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  duration: number;
  category: Category;
  dueDate?: string;
};

type PlannedTask = {
  id: number;
  title: string;
  priority: Priority;
  duration: number;
  category: Category;
  dueDate: string | null;
  reason: string;
  suggestedOrder: number;
};



export default function Dashboard() {
  /* -------------------------------------------------------
     TASKS
  ------------------------------------------------------- */

  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks =
      localStorage.getItem("atlas-tasks");

    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(
          savedTasks
        );

        return parsedTasks.map(
          (task: Partial<Task>) => ({
            id: task.id ?? Date.now(),
            title:
              task.title ?? "Untitled task",
            completed:
              task.completed ?? false,
            priority:
              task.priority ?? "medium",
            duration:
              typeof task.duration === "number"
                ? task.duration
                : 30,
            category:
              task.category ?? "other",
            dueDate: task.dueDate,
          })
        );
      } catch {
        console.error(
          "Could not load saved tasks."
        );
      }
    }

    return [
      {
        id: 1,
        title: "Study React",
        completed: true,
        priority: "high",
        duration: 60,
        category: "study",
        dueDate: "2026-08-15",
      },
      {
        id: 2,
        title: "Go to Gym",
        completed: false,
        priority: "medium",
        duration: 60,
        category: "health",
        dueDate: "2026-08-15",
      },
      {
        id: 3,
        title: "Build Atlas",
        completed: false,
        priority: "high",
        duration: 120,
        category: "work",
        dueDate: "2026-08-20",
      },
    ];
  });

  /* -------------------------------------------------------
     AI TASK ASSISTANT
  ------------------------------------------------------- */

  const [smartTask, setSmartTask] =
    useState("");

  const [isAiLoading, setIsAiLoading] =
    useState(false);

  /* -------------------------------------------------------
     DAILY PLANNER
  ------------------------------------------------------- */

  const [dailyPlan, setDailyPlan] =
    useState<PlannedTask[]>([]);

  const [plannerSummary, setPlannerSummary] =
    useState("");

  const [showPlanner, setShowPlanner] =
    useState(false);

  const [isPlannerLoading, setIsPlannerLoading] =
    useState(false);

  /*
    Available time is stored in minutes.

    Example:
    60  = 1 hour
    120 = 2 hours
    240 = 4 hours
  */
  const [availableHours, setAvailableHours] =
    useState("");

  const [availableMinutes, setAvailableMinutes] =
    useState("");

  const [plannerStats, setPlannerStats] =
    useState({
      scheduled: 0,
      unscheduled: 0,
    });

  /* -------------------------------------------------------
     FOCUS MODE
  ------------------------------------------------------- */

  const [focusTaskId, setFocusTaskId] =
    useState<number | null>(null);

  /* -------------------------------------------------------
     SAVE TASKS
  ------------------------------------------------------- */

  useEffect(() => {
    localStorage.setItem(
      "atlas-tasks",
      JSON.stringify(tasks)
    );
  }, [tasks]);

  /* -------------------------------------------------------
     PROGRESS
  ------------------------------------------------------- */

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (completedTasks / tasks.length) *
            100
        );

  /* -------------------------------------------------------
     FOCUS TASK
  ------------------------------------------------------- */

  const focusTask =
    focusTaskId === null
      ? null
      : tasks.find(
          (task) =>
            task.id === focusTaskId
        ) ?? null;

  /* -------------------------------------------------------
     TASK FUNCTIONS
  ------------------------------------------------------- */

  function toggleTask(taskId: number) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed:
                !task.completed,
            }
          : task
      )
    );
  }

  function deleteTask(taskId: number) {
    setTasks((currentTasks) =>
      currentTasks.filter(
        (task) => task.id !== taskId
      )
    );

    if (focusTaskId === taskId) {
      setFocusTaskId(null);
    }

    setDailyPlan((currentPlan) =>
      currentPlan.filter(
        (task) =>
          task.id !== taskId
      )
    );
  }

  function addTask(title: string) {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    const newTask: Task = {
      id: Date.now(),
      title: trimmedTitle,
      completed: false,
      priority: "medium",
      duration: 30,
      category: "other",
      dueDate: undefined,
    };

    setTasks((currentTasks) => [
      ...currentTasks,
      newTask,
    ]);
  }

  function editTask(taskId: number) {
    const task = tasks.find(
      (item) =>
        item.id === taskId
    );

    if (!task) {
      return;
    }

    const newTitle =
      window.prompt(
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
      currentTasks.map((item) =>
        item.id === taskId
          ? {
              ...item,
              title:
                newTitle.trim(),
            }
          : item
      )
    );

    setDailyPlan((currentPlan) =>
      currentPlan.map((item) =>
        item.id === taskId
          ? {
              ...item,
              title:
                newTitle.trim(),
            }
          : item
      )
    );
  }

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

  function changeDueDate(
    taskId: number,
    dueDate: string
  ) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              dueDate:
                dueDate || undefined,
            }
          : task
      )
    );
  }

  function changeDuration(
    taskId: number,
    duration: number
  ) {
    if (
      !Number.isFinite(duration)
    ) {
      return;
    }

    const safeDuration =
      Math.min(
        Math.max(
          Math.round(duration),
          5
        ),
        1440
      );

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              duration:
                safeDuration,
            }
          : task
      )
    );
  }

  /* -------------------------------------------------------
     AI TASK CREATION
  ------------------------------------------------------- */

  async function createSmartTask() {
    const input =
      smartTask.trim();

    if (
      !input ||
      isAiLoading
    ) {
      return;
    }

    setIsAiLoading(true);

    try {
      const response =
        await fetch(
          "/api/task-assistant",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              input,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Atlas could not understand the task."
        );
      }

      if (
        typeof data.title !==
          "string" ||
        !data.title.trim()
      ) {
        throw new Error(
          "Atlas returned an invalid task."
        );
      }

      const validPriorities: Priority[] =
        [
          "high",
          "medium",
          "low",
        ];

      const validCategories: Category[] =
        [
          "work",
          "study",
          "health",
          "personal",
          "finance",
          "other",
        ];

      const priority: Priority =
        validPriorities.includes(
          data.priority
        )
          ? data.priority
          : "medium";

      const category: Category =
        validCategories.includes(
          data.category
        )
          ? data.category
          : "other";

      const duration =
        typeof data.duration ===
          "number" &&
        Number.isFinite(
          data.duration
        ) &&
        data.duration > 0
          ? Math.min(
              Math.max(
                Math.round(
                  data.duration
                ),
                5
              ),
              1440
            )
          : 30;

      const newTask: Task = {
        id: Date.now(),
        title:
          data.title.trim(),
        completed: false,
        priority,
        duration,
        category,
        dueDate:
          typeof data.dueDate ===
          "string"
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

  /* -------------------------------------------------------
     AVAILABLE TIME
  ------------------------------------------------------- */

  function getAvailableMinutes(): number | null {
    const hours =
      Number(availableHours);

    const minutes =
      Number(availableMinutes);

    const safeHours =
      Number.isFinite(hours)
        ? Math.max(
            0,
            hours
          )
        : 0;

    const safeMinutes =
      Number.isFinite(minutes)
        ? Math.max(
            0,
            Math.min(
              minutes,
              59
            )
          )
        : 0;

    const total =
      Math.round(
        safeHours * 60 +
          safeMinutes
      );

    if (total <= 0) {
      return null;
    }

    return Math.min(
      total,
      1440
    );
  }

  function clearAvailableTime() {
    setAvailableHours("");
    setAvailableMinutes("");
  }

  /* -------------------------------------------------------
     DAILY PLANNER
  ------------------------------------------------------- */

  async function planMyDay() {
    if (
      isPlannerLoading
    ) {
      return;
    }

    const activeTasks =
      tasks.filter(
        (task) =>
          !task.completed
      );

    if (
      activeTasks.length === 0
    ) {
      window.alert(
        "You have no unfinished tasks to plan."
      );
      return;
    }

    const selectedAvailableMinutes =
      getAvailableMinutes();

    setIsPlannerLoading(true);

    try {
      const response =
        await fetch(
          "/api/daily-planner",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              tasks:
                activeTasks,

              availableMinutes:
                selectedAvailableMinutes,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Atlas could not create your plan."
        );
      }

      if (
        !Array.isArray(
          data.plan
        )
      ) {
        throw new Error(
          "Invalid planner response."
        );
      }

      const validIds =
        new Set(
          activeTasks.map(
            (task) => task.id
          )
        );

      const cleanedPlan: PlannedTask[] =
        data.plan
          .filter(
            (task: PlannedTask) =>
              validIds.has(
                task.id
              )
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
            ) => {
              const originalTask =
                activeTasks.find(
                  (item) =>
                    item.id ===
                    task.id
                );

              return {
                ...task,

                title:
                  originalTask?.title ??
                  task.title,

                priority:
                  originalTask?.priority ??
                  task.priority,

                duration:
                  originalTask?.duration ??
                  task.duration ??
                  30,

                category:
                  originalTask?.category ??
                  task.category ??
                  "other",

                dueDate:
                  originalTask?.dueDate ??
                  task.dueDate ??
                  null,

                suggestedOrder:
                  index + 1,
              };
            }
          );

      setDailyPlan(
        cleanedPlan
      );

      setPlannerSummary(
        typeof data.summary ===
          "string"
          ? data.summary
          : "Here is your recommended plan for today."
      );

      setPlannerStats({
        scheduled:
          typeof data.totalScheduledMinutes ===
          "number"
            ? data.totalScheduledMinutes
            : cleanedPlan.reduce(
                (total, task) =>
                  total +
                  task.duration,
                0
              ),

        unscheduled:
          typeof data.totalUnscheduledMinutes ===
          "number"
            ? data.totalUnscheduledMinutes
            : 0,
      });

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

  /* -------------------------------------------------------
     FOCUS MODE
  ------------------------------------------------------- */

  function completeFocusTask(
    taskId: number
  ) {
    setTasks((currentTasks) =>
      currentTasks.map(
        (task) =>
          task.id === taskId
            ? {
                ...task,
                completed: true,
              }
            : task
      )
    );

    setDailyPlan(
      (currentPlan) =>
        currentPlan.filter(
          (task) =>
            task.id !== taskId
        )
    );

    setFocusTaskId(null);
  }

  /* -------------------------------------------------------
     DISPLAY HELPERS
  ------------------------------------------------------- */

  function formatDuration(
    minutes: number
  ) {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    const remainingMinutes =
      minutes % 60;

    if (
      remainingMinutes ===
      0
    ) {
      return `${hours} hr${
        hours === 1
          ? ""
          : "s"
      }`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  const currentHour =
    new Date().getHours();

  let greeting =
    "Good Evening";

  if (currentHour < 12) {
    greeting =
      "Good Morning";
  } else if (
    currentHour < 17
  ) {
    greeting =
      "Good Afternoon";
  }

  const currentDate =
    new Date().toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      }
    );

  const selectedAvailableMinutes =
    getAvailableMinutes();

  const totalUnfinishedMinutes =
    tasks
      .filter(
        (task) =>
          !task.completed
      )
      .reduce(
        (total, task) =>
          total + task.duration,
        0
      );

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

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

        {/* -------------------------------------------------
            AI TASK ASSISTANT
        ------------------------------------------------- */}

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
                  event.key ===
                    "Enter" &&
                  !isAiLoading
                ) {
                  createSmartTask();
                }
              }}
              disabled={
                isAiLoading
              }
              placeholder="e.g. Study GATE for 2 hours tomorrow"
              className="flex-1 rounded-xl bg-slate-900 text-white px-4 py-3 border border-slate-700 focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />

            <button
              onClick={
                createSmartTask
              }
              disabled={
                isAiLoading ||
                smartTask.trim() ===
                  ""
              }
              className="rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-semibold px-5 transition"
            >
              {isAiLoading
                ? "Thinking..."
                : "Add"}
            </button>

          </div>

          <p className="text-xs text-slate-500 mt-3">
            Try: "Study GATE for
            2 hours tomorrow,
            high priority"
          </p>

        </div>

        {/* -------------------------------------------------
            TODAY'S FOCUS
        ------------------------------------------------- */}

        <div className="flex items-center justify-between gap-4">

          <h2 className="text-2xl font-semibold text-white">
            🎯 Today's Focus
          </h2>

          <button
            onClick={
              planMyDay
            }
            disabled={
              isPlannerLoading
            }
            className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50 transition whitespace-nowrap"
          >
            {isPlannerLoading
              ? "Planning..."
              : "🧠 Plan My Day"}
          </button>

        </div>

        {/* -------------------------------------------------
            AVAILABLE TIME
        ------------------------------------------------- */}

        <div className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">

          <div className="flex items-start gap-3">

            <div className="text-2xl">
              ⏰
            </div>

            <div className="flex-1">

              <h3 className="text-lg font-semibold text-white">
                How much time do you have today?
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                Atlas will choose the best tasks
                that fit your available time.
              </p>

            </div>

          </div>

          <div className="flex flex-wrap items-end gap-3 mt-4">

            {/* Hours */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Hours
              </label>

              <input
                type="number"
                min="0"
                max="24"
                value={
                  availableHours
                }
                onChange={(event) =>
                  setAvailableHours(
                    event.target.value
                  )
                }
                placeholder="4"
                className="w-24 rounded-xl bg-slate-900 text-white px-4 py-3 border border-slate-700 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Minutes */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Minutes
              </label>

              <input
                type="number"
                min="0"
                max="59"
                value={
                  availableMinutes
                }
                onChange={(event) =>
                  setAvailableMinutes(
                    event.target.value
                  )
                }
                placeholder="00"
                className="w-24 rounded-xl bg-slate-900 text-white px-4 py-3 border border-slate-700 focus:outline-none focus:border-purple-500"
              />
            </div>

            <span className="text-slate-400 pb-3">
              available today
            </span>

            <button
              type="button"
              onClick={
                planMyDay
              }
              disabled={
                isPlannerLoading
              }
              className="px-5 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-semibold disabled:opacity-50 transition"
            >
              {isPlannerLoading
                ? "Planning..."
                : "Plan My Time"}
            </button>

            {(availableHours !==
              "" ||
              availableMinutes !==
                "") && (
              <button
                type="button"
                onClick={
                  clearAvailableTime
                }
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
              >
                Clear
              </button>
            )}

          </div>

          {selectedAvailableMinutes !==
            null && (
            <div className="mt-4 flex flex-wrap gap-3">

              <span className="text-xs px-3 py-2 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                ⏰ Available:{" "}
                {formatDuration(
                  selectedAvailableMinutes
                )}
              </span>

              <span className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-400">
                📋 Unfinished work:{" "}
                {formatDuration(
                  totalUnfinishedMinutes
                )}
              </span>

            </div>
          )}

        </div>

        {/* -------------------------------------------------
            DAILY PLANNER
        ------------------------------------------------- */}

        {showPlanner && (
          <div className="mt-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">

            <div className="flex items-start justify-between gap-4">

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
                  setShowPlanner(
                    false
                  )
                }
                className="text-slate-500 hover:text-white text-xl"
                aria-label="Close daily plan"
              >
                ×
              </button>

            </div>

            {/* Planner stats */}
            <div className="flex flex-wrap gap-3 mt-4">

              <span className="text-xs px-3 py-2 rounded-lg bg-green-500/10 text-green-300 border border-green-500/20">
                ✅ Scheduled:{" "}
                {formatDuration(
                  plannerStats.scheduled
                )}
              </span>

              {plannerStats.unscheduled >
                0 && (
                <span className="text-xs px-3 py-2 rounded-lg bg-orange-500/10 text-orange-300 border border-orange-500/20">
                  ⏸️ Not scheduled:{" "}
                  {formatDuration(
                    plannerStats.unscheduled
                  )}
                </span>
              )}

            </div>

            {/* Plan */}
            <div className="mt-5 space-y-3">

              {dailyPlan.length ===
                0 && (
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 text-center text-slate-400">
                  Atlas could not fit any
                  complete task into the
                  available time.
                </div>
              )}

              {dailyPlan.map(
                (task) => (
                  <div
                    key={task.id}
                    className="rounded-xl bg-slate-900/80 border border-slate-800 p-4"
                  >

                    <div className="flex items-start gap-3">

                      {/* Order */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-semibold">
                        {
                          task.suggestedOrder
                        }
                      </div>

                      <div className="flex-1">

                        <div className="flex items-center justify-between gap-3">

                          <h4 className="text-white font-medium">
                            {
                              task.title
                            }
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
                            {
                              task.priority
                            }
                          </span>

                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">

                          <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-400">
                            ⏱️{" "}
                            {formatDuration(
                              task.duration
                            )}
                          </span>

                          <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-400 capitalize">
                            📂{" "}
                            {
                              task.category
                            }
                          </span>

                          {task.dueDate && (
                            <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-400">
                              📅 Due:{" "}
                              {
                                task.dueDate
                              }
                            </span>
                          )}

                        </div>

                        <p className="text-sm text-slate-400 mt-2">
                          {
                            task.reason
                          }
                        </p>

                        <button
                          onClick={() =>
                            setFocusTaskId(
                              task.id
                            )
                          }
                          className="mt-3 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition text-sm"
                        >
                          🎯 Start Focus
                        </button>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>

          </div>
        )}

        {/* -------------------------------------------------
            TASK LIST
        ------------------------------------------------- */}

        <div className="mt-5 space-y-4">

          {tasks.map(
            (task) => (
              <div
                key={task.id}
              >

                <TaskCard
                  title={
                    task.title
                  }
                  completed={
                    task.completed
                  }
                  priority={
                    task.priority
                  }
                  dueDate={
                    task.dueDate
                  }
                  onToggle={() =>
                    toggleTask(
                      task.id
                    )
                  }
                  onDelete={() =>
                    deleteTask(
                      task.id
                    )
                  }
                  onEdit={() =>
                    editTask(
                      task.id
                    )
                  }
                />

                {/* Task metadata */}
                <div className="flex flex-wrap gap-2 mt-2 ml-2">

                  <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400">
                    ⏱️{" "}
                    {formatDuration(
                      task.duration
                    )}
                  </span>

                  <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400 capitalize">
                    📂{" "}
                    {task.category}
                  </span>

                </div>

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
                      task.priority ===
                      "high"
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
                      task.priority ===
                      "low"
                        ? "bg-green-500/30 text-green-400"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    🟢 Low
                  </button>

                </div>

                {/* Duration */}
                <div className="flex items-center gap-3 mt-2 ml-2">

                  <label className="text-xs text-slate-400">
                    ⏱️ Duration:
                  </label>

                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={
                      task.duration
                    }
                    onChange={(
                      event
                    ) =>
                      changeDuration(
                        task.id,
                        Number(
                          event.target
                            .value
                        )
                      )
                    }
                    className="w-24 rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                  />

                  <span className="text-xs text-slate-500">
                    minutes
                  </span>

                </div>

                {/* Due Date */}
                <div className="flex items-center gap-3 mt-2 ml-2">

                  <label className="text-xs text-slate-400">
                    📅 Due:
                  </label>

                  <input
                    type="date"
                    value={
                      task.dueDate ??
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      changeDueDate(
                        task.id,
                        event.target
                          .value
                      )
                    }
                    className="rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                  />

                </div>

              </div>
            )
          )}

        </div>

        {/* -------------------------------------------------
            PROGRESS
        ------------------------------------------------- */}

        <div className="mt-6">
          <ProgressBar
            progress={
              progress
            }
          />
        </div>

        {/* -------------------------------------------------
            ADD TASK
        ------------------------------------------------- */}

        <div className="mt-5">
          <AddTask
            onAddTask={
              addTask
            }
          />
        </div>

      </DashboardCard>

      {/* ---------------------------------------------------
          FOCUS MODE
      --------------------------------------------------- */}

      {focusTask && (
        <FocusMode
          task={
            focusTask
          }
          onComplete={
            completeFocusTask
          }
          onClose={() =>
            setFocusTaskId(
              null
            )
          }
        />
      )}

    </div>
  );
}
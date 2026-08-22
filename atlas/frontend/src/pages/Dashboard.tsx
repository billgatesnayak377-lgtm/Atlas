import { useEffect, useMemo, useState } from "react";
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

type PreferredTime =
  | "anytime"
  | "morning"
  | "afternoon"
  | "evening";

type Recurrence =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly";

type Task = {
  id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  duration: number;
  category: Category;
  dueDate?: string;
  dependencyIds: number[];
  preferredTime: PreferredTime;
  recurrence: Recurrence;
  reminder?: string;
};

type PlannedTask = {
  id: number;
  title: string;
  priority: Priority;
  duration: number;
  category: Category;
  dueDate: string | null;
  dependencyIds?: number[];
  preferredTime?: PreferredTime;
  recurrence?: Recurrence;
  reminder?: string;
  reason: string;
  suggestedOrder: number;
  startTime?: string;
  endTime?: string;
};

type PlannerResponse = {
  plan: PlannedTask[];
  summary: string;
  totalScheduledMinutes?: number;
  totalUnscheduledMinutes?: number;
  error?: string;
};

/* -------------------------------------------------------
   OPTIONS
------------------------------------------------------- */

const CATEGORY_OPTIONS: {
  value: Category;
  label: string;
}[] = [
  {
    value: "work",
    label: "💼 Work",
  },
  {
    value: "study",
    label: "📚 Study",
  },
  {
    value: "health",
    label: "🏋️ Health",
  },
  {
    value: "personal",
    label: "👤 Personal",
  },
  {
    value: "finance",
    label: "💰 Finance",
  },
  {
    value: "other",
    label: "📌 Other",
  },
];

const PREFERRED_TIME_OPTIONS: {
  value: PreferredTime;
  label: string;
}[] = [
  {
    value: "anytime",
    label: "Anytime",
  },
  {
    value: "morning",
    label: "🌅 Morning",
  },
  {
    value: "afternoon",
    label: "☀️ Afternoon",
  },
  {
    value: "evening",
    label: "🌙 Evening",
  },
];

const RECURRENCE_OPTIONS: {
  value: Recurrence;
  label: string;
}[] = [
  {
    value: "none",
    label: "Does not repeat",
  },
  {
    value: "daily",
    label: "🔁 Daily",
  },
  {
    value: "weekdays",
    label: "📅 Weekdays",
  },
  {
    value: "weekly",
    label: "🗓️ Weekly",
  },
];

/* -------------------------------------------------------
   NORMALIZATION
------------------------------------------------------- */

function normalizeDuration(
  value: unknown
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 30;
  }

  return Math.min(
    Math.max(Math.round(value), 5),
    1440
  );
}

function normalizePriority(
  value: unknown
): Priority {
  if (
    value === "high" ||
    value === "medium" ||
    value === "low"
  ) {
    return value;
  }

  return "medium";
}

function normalizeCategory(
  value: unknown
): Category {
  if (
    value === "work" ||
    value === "study" ||
    value === "health" ||
    value === "personal" ||
    value === "finance" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
}

function normalizePreferredTime(
  value: unknown
): PreferredTime {
  if (
    value === "morning" ||
    value === "afternoon" ||
    value === "evening" ||
    value === "anytime"
  ) {
    return value;
  }

  return "anytime";
}

function normalizeRecurrence(
  value: unknown
): Recurrence {
  if (
    value === "daily" ||
    value === "weekdays" ||
    value === "weekly" ||
    value === "none"
  ) {
    return value;
  }

  return "none";
}

function normalizeDependencyIds(
  value: unknown
): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((id: unknown) => Number(id))
    .filter(
      (id: number) =>
        Number.isFinite(id)
    );
}

function normalizeTask(
  task: Partial<Task>,
  fallbackId: number
): Task {
  return {
    id:
      typeof task.id === "number" &&
      Number.isFinite(task.id)
        ? task.id
        : fallbackId,

    title:
      typeof task.title === "string" &&
      task.title.trim()
        ? task.title.trim()
        : "Untitled task",

    completed: Boolean(
      task.completed
    ),

    priority:
      normalizePriority(
        task.priority
      ),

    duration:
      normalizeDuration(
        task.duration
      ),

    category:
      normalizeCategory(
        task.category
      ),

    dueDate:
      typeof task.dueDate === "string" &&
      task.dueDate
        ? task.dueDate
        : undefined,

    dependencyIds:
      normalizeDependencyIds(
        task.dependencyIds
      ),

    preferredTime:
      normalizePreferredTime(
        task.preferredTime
      ),

    recurrence:
      normalizeRecurrence(
        task.recurrence
      ),

    reminder:
      typeof task.reminder === "string" &&
      task.reminder
        ? task.reminder
        : undefined,
  };
}

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function formatDuration(
  minutes: number
): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  const remaining =
    minutes % 60;

  if (remaining === 0) {
    return `${hours} hr${
      hours === 1 ? "" : "s"
    }`;
  }

  return `${hours}h ${remaining}m`;
}

function getPreferredTimeLabel(
  value: PreferredTime
): string {
  const option =
    PREFERRED_TIME_OPTIONS.find(
      (
        item: {
          value: PreferredTime;
          label: string;
        }
      ) =>
        item.value === value
    );

  return option?.label ?? "Anytime";
}

function getRecurrenceLabel(
  value: Recurrence
): string {
  const option =
    RECURRENCE_OPTIONS.find(
      (
        item: {
          value: Recurrence;
          label: string;
        }
      ) =>
        item.value === value
    );

  return (
    option?.label ??
    "Does not repeat"
  );
}

function getScheduleTimeRange(task: PlannedTask): string {
  if (!task.startTime || !task.endTime) {
    return "Time not assigned";
  }

  return `${task.startTime} – ${task.endTime}`;
}

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

export default function Dashboard() {
  /* -----------------------------------------------------
     TASKS
  ----------------------------------------------------- */

  const [tasks, setTasks] =
    useState<Task[]>(() => {
      const saved =
        localStorage.getItem(
          "atlas-tasks"
        );

      if (saved) {
        try {
          const parsed: unknown =
            JSON.parse(saved);

          if (
            Array.isArray(parsed)
          ) {
            return parsed.map(
              (
                task: Partial<Task>,
                index: number
              ) =>
                normalizeTask(
                  task,
                  Date.now() + index
                )
            );
          }
        } catch {
          console.error(
            "Could not load saved Atlas tasks."
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
          dependencyIds: [],
          preferredTime: "anytime",
          recurrence: "none",
        },
        {
          id: 2,
          title: "Go to Gym",
          completed: false,
          priority: "medium",
          duration: 60,
          category: "health",
          dueDate: "2026-08-15",
          dependencyIds: [],
          preferredTime: "evening",
          recurrence: "none",
        },
        {
          id: 3,
          title: "Build Atlas",
          completed: false,
          priority: "high",
          duration: 120,
          category: "work",
          dueDate: "2026-08-20",
          dependencyIds: [],
          preferredTime: "morning",
          recurrence: "none",
        },
      ];
    });

  /* -----------------------------------------------------
     AI TASK ASSISTANT
  ----------------------------------------------------- */

  const [smartTask, setSmartTask] =
    useState("");

  const [isAiLoading, setIsAiLoading] =
    useState(false);

  /* -----------------------------------------------------
     DAILY PLANNER
  ----------------------------------------------------- */

  const [dailyPlan, setDailyPlan] =
    useState<PlannedTask[]>([]);

  const [
    plannerSummary,
    setPlannerSummary,
  ] = useState("");

  const [
    showPlanner,
    setShowPlanner,
  ] = useState(false);

  const [
    isPlannerLoading,
    setIsPlannerLoading,
  ] = useState(false);

  const [
    availableHours,
    setAvailableHours,
  ] = useState("");

  const [
    availableMinutesInput,
    setAvailableMinutesInput,
  ] = useState("");

  const [
    plannerStats,
    setPlannerStats,
  ] = useState({
    scheduled: 0,
    unscheduled: 0,
  });

  /* -----------------------------------------------------
     FOCUS MODE
  ----------------------------------------------------- */

  const [
    focusTaskId,
    setFocusTaskId,
  ] = useState<number | null>(
    null
  );

  /* -----------------------------------------------------
     SAVE TASKS
  ----------------------------------------------------- */

  useEffect(() => {
    localStorage.setItem(
      "atlas-tasks",
      JSON.stringify(tasks)
    );
  }, [tasks]);

  /* -----------------------------------------------------
     DERIVED DATA
  ----------------------------------------------------- */

  const completedTasks =
    tasks.filter(
      (task: Task) =>
        task.completed
    ).length;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (completedTasks /
            tasks.length) *
            100
        );

  const focusTask =
    focusTaskId === null
      ? null
      : tasks.find(
          (task: Task) =>
            task.id ===
            focusTaskId
        ) ?? null;

  const totalUnfinishedMinutes =
    useMemo(
      () =>
        tasks
          .filter(
            (task: Task) =>
              !task.completed
          )
          .reduce(
            (
              total: number,
              task: Task
            ) =>
              total +
              task.duration,
            0
          ),
      [tasks]
    );

  /* -----------------------------------------------------
     TASK ACTIONS
  ----------------------------------------------------- */

  function toggleTask(
    taskId: number
  ) {
    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) =>
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

  function deleteTask(
    taskId: number
  ) {
    setTasks(
      (current: Task[]) =>
        current
          .filter(
            (task: Task) =>
              task.id !== taskId
          )
          .map(
            (task: Task) => ({
              ...task,
              dependencyIds:
                task.dependencyIds.filter(
                  (id: number) =>
                    id !== taskId
                ),
            })
          )
    );

    setDailyPlan(
      (current: PlannedTask[]) =>
        current.filter(
          (task: PlannedTask) =>
            task.id !== taskId
        )
    );

    if (
      focusTaskId === taskId
    ) {
      setFocusTaskId(null);
    }
  }

  function addTask(
    title: string
  ) {
    const trimmed =
      title.trim();

    if (!trimmed) {
      return;
    }

    const newTask: Task = {
      id: Date.now(),
      title: trimmed,
      completed: false,
      priority: "medium",
      duration: 30,
      category: "other",
      dueDate: undefined,
      dependencyIds: [],
      preferredTime: "anytime",
      recurrence: "none",
      reminder: undefined,
    };

    setTasks(
      (current: Task[]) => [
        ...current,
        newTask,
      ]
    );
  }

  function editTaskTitle(
    taskId: number
  ) {
    const task =
      tasks.find(
        (item: Task) =>
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
      !newTitle.trim()
    ) {
      return;
    }

    setTasks(
      (current: Task[]) =>
        current.map(
          (item: Task) =>
            item.id === taskId
              ? {
                  ...item,
                  title:
                    newTitle.trim(),
                }
              : item
        )
    );

    setDailyPlan(
      (current: PlannedTask[]) =>
        current.map(
          (item: PlannedTask) =>
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
    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) =>
            task.id === taskId
              ? {
                  ...task,
                  priority,
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
      !Number.isFinite(
        duration
      )
    ) {
      return;
    }

    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) =>
            task.id === taskId
              ? {
                  ...task,
                  duration:
                    normalizeDuration(
                      duration
                    ),
                }
              : task
        )
    );
  }

  function changeDueDate(
    taskId: number,
    dueDate: string
  ) {
    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) =>
            task.id === taskId
              ? {
                  ...task,
                  dueDate:
                    dueDate ||
                    undefined,
                }
              : task
        )
    );
  }

  function changeCategory(
    taskId: number,
    category: Category
  ) {
    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) =>
            task.id === taskId
              ? {
                  ...task,
                  category,
                }
              : task
        )
    );
  }

  function changePreferredTime(
    taskId: number,
    preferredTime: PreferredTime
  ) {
    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) =>
            task.id === taskId
              ? {
                  ...task,
                  preferredTime,
                }
              : task
        )
    );
  }

  function changeRecurrence(
    taskId: number,
    recurrence: Recurrence
  ) {
    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) =>
            task.id === taskId
              ? {
                  ...task,
                  recurrence,
                }
              : task
        )
    );
  }

  function changeReminder(
    taskId: number,
    reminder: string
  ) {
    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) =>
            task.id === taskId
              ? {
                  ...task,
                  reminder:
                    reminder ||
                    undefined,
                }
              : task
        )
    );
  }

  /* -----------------------------------------------------
     DEPENDENCIES
  ----------------------------------------------------- */

  function toggleDependency(
    taskId: number,
    dependencyId: number
  ) {
    if (
      taskId ===
      dependencyId
    ) {
      return;
    }

    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) => {
            if (
              task.id !== taskId
            ) {
              return task;
            }

            const exists =
              task.dependencyIds.includes(
                dependencyId
              );

            return {
              ...task,
              dependencyIds:
                exists
                  ? task.dependencyIds.filter(
                      (id: number) =>
                        id !==
                        dependencyId
                    )
                  : [
                      ...task.dependencyIds,
                      dependencyId,
                    ],
            };
          }
        )
    );
  }

  function getDependencyNames(
    task: Task
  ): string[] {
    return task.dependencyIds
      .map(
        (id: number) =>
          tasks.find(
            (item: Task) =>
              item.id === id
          )?.title
      )
      .filter(
        (
          title: string | undefined
        ): title is string =>
          Boolean(title)
      );
  }

  /* -----------------------------------------------------
     AI TASK CREATION
  ----------------------------------------------------- */

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

      const data: {
        tasks?: Array<Partial<Task>>;
        title?: string;
        priority?: Priority;
        duration?: number;
        category?: Category;
        dueDate?: string | null;
        error?: string;
      } = await response.json();

      console.log(
        "Atlas Task Assistant response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Task Assistant request failed (${response.status}).`
        );
      }

      /*
       * NEW MULTI-TASK RESPONSE
       *
       * The new API returns:
       *
       * {
       *   tasks: [
       *     {
       *       title,
       *       priority,
       *       duration,
       *       category,
       *       dueDate
       *     },
       *     ...
       *   ]
       * }
       */
      let aiTasks: Array<Partial<Task>> = [];

      if (Array.isArray(data.tasks)) {
        aiTasks = data.tasks;
      } else if (
        typeof data.title === "string" &&
        data.title.trim()
      ) {
        /*
         * Backward compatibility with the old API response.
         * This lets the Dashboard continue working even if an
         * older deployed API is temporarily being used.
         */
        aiTasks = [
          {
            title: data.title,
            priority: data.priority,
            duration: data.duration,
            category: data.category,
            dueDate: data.dueDate,
          },
        ];
      }

      if (aiTasks.length === 0) {
        throw new Error(
          "Atlas returned no tasks. Check the Task Assistant API response in the browser console."
        );
      }

      const baseId = Date.now();

      const newTasks: Task[] = aiTasks
        .map(
          (
            task: Partial<Task>,
            index: number
          ) =>
            normalizeTask(
              {
                id: baseId + index,
                title:
                  typeof task.title === "string"
                    ? task.title.trim()
                    : "Untitled task",
                completed: false,
                priority: task.priority,
                duration: task.duration,
                category: task.category,
                dueDate:
                  typeof task.dueDate === "string"
                    ? task.dueDate
                    : undefined,
                dependencyIds: [],
                preferredTime:
                  normalizePreferredTime(
                    task.preferredTime
                  ),
                recurrence:
                  normalizeRecurrence(
                    task.recurrence
                  ),
                reminder:
                  typeof task.reminder === "string"
                    ? task.reminder
                    : undefined,
              },
              baseId + index
            )
        )
        .filter(
          (task: Task) =>
            task.title !== "Untitled task"
        );

      if (newTasks.length === 0) {
        throw new Error(
          "Atlas returned tasks without valid titles."
        );
      }

      /*
       * Add ALL tasks returned by Gemini in one state update.
       * This is the key change from the old single-task flow.
       */
      setTasks(
        (current: Task[]) => [
          ...current,
          ...newTasks,
        ]
      );

      setSmartTask("");

      console.log(
        `Atlas created ${newTasks.length} task(s):`,
        newTasks
      );
    } catch (error) {
      console.error(
        "Atlas Task Assistant error:",
        error
      );

      /*
       * Show the real error while testing instead of hiding it
       * behind the old generic message.
       */
      window.alert(
        error instanceof Error
          ? error.message
          : "Atlas Task Assistant failed."
      );
    } finally {
      setIsAiLoading(false);
    }
  }

  /* -----------------------------------------------------
     AVAILABLE TIME
  ----------------------------------------------------- */

  function getAvailableMinutes():
    | number
    | null {
    const hours =
      Number(
        availableHours
      );

    const minutes =
      Number(
        availableMinutesInput
      );

    const safeHours =
      Number.isFinite(hours)
        ? Math.max(0, hours)
        : 0;

    const safeMinutes =
      Number.isFinite(minutes)
        ? Math.max(
            0,
            Math.min(minutes, 59)
          )
        : 0;

    const total = Math.round(
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
    setAvailableMinutesInput("");
  }

  /* -----------------------------------------------------
     DAILY PLANNER
  ----------------------------------------------------- */

  async function planMyDay() {
    if (
      isPlannerLoading
    ) {
      return;
    }

    const activeTasks =
      tasks.filter(
        (task: Task) =>
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

      /*
       * Important:
       * Use ONE response type instead of a union.
       * This allows TypeScript to safely access
       * plan, summary and scheduling statistics.
       */
      const data =
        (await response.json()) as PlannerResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
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
        new Set<number>(
          activeTasks.map(
            (task: Task) =>
              task.id
          )
        );

      const cleanedPlan =
        data.plan
          .filter(
            (
              task: PlannedTask
            ) =>
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
            ): PlannedTask => {
              const original =
                activeTasks.find(
                  (item: Task) =>
                    item.id ===
                    task.id
                );

              return {
                ...task,

                title:
                  original?.title ??
                  task.title,

                priority:
                  original?.priority ??
                  task.priority,

                duration:
                  original?.duration ??
                  task.duration ??
                  30,

                category:
                  original?.category ??
                  task.category ??
                  "other",

                dueDate:
                  original?.dueDate ??
                  task.dueDate ??
                  null,

                dependencyIds:
                  original?.dependencyIds ??
                  [],

                preferredTime:
                  original?.preferredTime ??
                  "anytime",

                recurrence:
                  original?.recurrence ??
                  "none",

                reminder:
                  original?.reminder,

                suggestedOrder:
                  index + 1,
              };
            }
          );

      setDailyPlan(
        cleanedPlan
      );

      setPlannerSummary(
        data.summary ||
          "Here is your recommended plan for today."
      );

      const scheduled =
        typeof data.totalScheduledMinutes ===
        "number"
          ? data.totalScheduledMinutes
          : cleanedPlan.reduce(
              (
                total: number,
                task: PlannedTask
              ) =>
                total +
                task.duration,
              0
            );

      const unscheduled =
        typeof data.totalUnscheduledMinutes ===
        "number"
          ? data.totalUnscheduledMinutes
          : Math.max(
              0,
              totalUnfinishedMinutes -
                scheduled
            );

      setPlannerStats({
        scheduled,
        unscheduled,
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

  /* -----------------------------------------------------
     FOCUS
  ----------------------------------------------------- */

  function completeFocusTask(
    taskId: number
  ) {
    setTasks(
      (current: Task[]) =>
        current.map(
          (task: Task) =>
            task.id === taskId
              ? {
                  ...task,
                  completed: true,
                }
              : task
        )
    );

    setDailyPlan(
      (current: PlannedTask[]) =>
        current.filter(
          (task: PlannedTask) =>
            task.id !== taskId
        )
    );

    setFocusTaskId(null);
  }

  /* -----------------------------------------------------
     GREETING
  ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     RENDER
  ----------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <DashboardCard>

        {/* HEADER */}

        <h1 className="text-4xl font-bold text-sky-400">
          👋 {greeting}, Bill
        </h1>

        <p className="text-slate-400 mt-2">
          {currentDate}
        </p>

        <div className="border-t border-slate-700 my-6" />

        {/* AI ASSISTANT */}

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
              onChange={(
                event: React.ChangeEvent<HTMLInputElement>
              ) =>
                setSmartTask(
                  event.target.value
                )
              }
              onKeyDown={(
                event: React.KeyboardEvent<HTMLInputElement>
              ) => {
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
                !smartTask.trim()
              }
              className="rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-semibold px-5 transition"
            >
              {isAiLoading
                ? "Thinking..."
                : "Add"}
            </button>

          </div>

          <p className="text-xs text-slate-500 mt-3">
            Example: "Study GATE for 2 hours tomorrow, high priority"
          </p>
        </div>

        {/* TODAY'S FOCUS */}

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

        {/* AVAILABLE TIME */}

        <div className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">

          <div className="flex items-start gap-3">

            <div className="text-2xl">
              ⏰
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">
                How much time do you have today?
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                Atlas will choose the best tasks that fit your available time.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap items-end gap-3 mt-4">

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
                onChange={(
                  event
                ) =>
                  setAvailableHours(
                    event.target
                      .value
                  )
                }
                placeholder="4"
                className="w-24 rounded-xl bg-slate-900 text-white px-4 py-3 border border-slate-700 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Minutes
              </label>

              <input
                type="number"
                min="0"
                max="59"
                value={
                  availableMinutesInput
                }
                onChange={(
                  event
                ) =>
                  setAvailableMinutesInput(
                    event.target
                      .value
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
              availableMinutesInput !==
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

        {/* DAILY PLAN */}

        {showPlanner && (
          <div className="mt-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">

            <div className="flex items-start justify-between gap-4">

              <div>
                <h3 className="text-xl font-semibold text-purple-300">
                  🧠 Your Smart Schedule
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

            <div className="mt-5 space-y-3">

              {dailyPlan.length ===
                0 && (
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 text-center text-slate-400">
                  Atlas could not fit any complete task into the available time.
                </div>
              )}

              {dailyPlan.map(
                (
                  task: PlannedTask
                ) => (
                  <div
                    key={
                      task.id
                    }
                    className="rounded-xl bg-slate-900/80 border border-slate-800 p-4"
                  >

                    <div className="flex items-start gap-3">

                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-semibold">
                        {
                          task.suggestedOrder
                        }
                      </div>

                      <div className="flex-1">

                        <div className="flex items-start justify-between gap-3">

                          <div>
                            {task.startTime && task.endTime && (
                              <div className="text-sm font-semibold text-sky-300 mb-1">
                                ⏰ {getScheduleTimeRange(task)}
                              </div>
                            )}

                            <h4 className="text-white font-medium">
                              {
                                task.title
                              }
                            </h4>
                          </div>

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

                          {task.preferredTime &&
                            task.preferredTime !==
                              "anytime" && (
                              <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-400">
                                🕐{" "}
                                {getPreferredTimeLabel(
                                  task.preferredTime
                                )}
                              </span>
                            )}

                          {task.recurrence &&
                            task.recurrence !==
                              "none" && (
                              <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-400">
                                {
                                  getRecurrenceLabel(
                                    task.recurrence
                                  )
                                }
                              </span>
                            )}

                        </div>

                        <div className="mt-3 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                          <div className="text-xs text-slate-500 uppercase tracking-wide">
                            Scheduled block
                          </div>
                          <div className="text-sm text-sky-300 mt-1">
                            {getScheduleTimeRange(task)} · {formatDuration(task.duration)}
                          </div>
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

        {/* TASK LIST */}

        <div className="mt-5 space-y-5">

          {tasks.map(
            (task: Task) => {
              const dependencyNames =
                getDependencyNames(
                  task
                );

              return (
                <div
                  key={
                    task.id
                  }
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
                      editTaskTitle(
                        task.id
                      )
                    }
                  />

                  {/* BASIC METADATA */}

                  <div className="flex flex-wrap gap-2 mt-2 ml-2">

                    <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400">
                      ⏱️{" "}
                      {formatDuration(
                        task.duration
                      )}
                    </span>

                    <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400">
                      {
                        CATEGORY_OPTIONS.find(
                          (
                            item: {
                              value: Category;
                              label: string;
                            }
                          ) =>
                            item.value ===
                            task.category
                        )?.label ??
                        "📌 Other"
                      }
                    </span>

                    {task.preferredTime !==
                      "anytime" && (
                      <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400">
                        🕐{" "}
                        {getPreferredTimeLabel(
                          task.preferredTime
                        )}
                      </span>
                    )}

                    {task.recurrence !==
                      "none" && (
                      <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400">
                        {
                          getRecurrenceLabel(
                            task.recurrence
                          )
                        }
                      </span>
                    )}

                    {task.reminder && (
                      <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400">
                        🔔{" "}
                        {
                          task.reminder
                        }
                      </span>
                    )}

                  </div>

                  {/* PRIORITY */}

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

                  {/* DURATION */}

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

                  {/* DUE DATE */}

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

                  {/* CATEGORY */}

                  <div className="flex items-center gap-3 mt-2 ml-2">

                    <label className="text-xs text-slate-400">
                      📂 Category:
                    </label>

                    <select
                      value={
                        task.category
                      }
                      onChange={(
                        event
                      ) =>
                        changeCategory(
                          task.id,
                          event.target
                            .value as Category
                        )
                      }
                      className="rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                    >
                      {CATEGORY_OPTIONS.map(
                        (
                          option: {
                            value: Category;
                            label: string;
                          }
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>

                  </div>

                  {/* PREFERRED TIME */}

                  <div className="flex items-center gap-3 mt-2 ml-2">

                    <label className="text-xs text-slate-400">
                      🕐 Best time:
                    </label>

                    <select
                      value={
                        task.preferredTime
                      }
                      onChange={(
                        event
                      ) =>
                        changePreferredTime(
                          task.id,
                          event.target
                            .value as PreferredTime
                        )
                      }
                      className="rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                    >
                      {PREFERRED_TIME_OPTIONS.map(
                        (
                          option: {
                            value: PreferredTime;
                            label: string;
                          }
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>

                  </div>

                  {/* RECURRENCE */}

                  <div className="flex items-center gap-3 mt-2 ml-2">

                    <label className="text-xs text-slate-400">
                      🔁 Repeat:
                    </label>

                    <select
                      value={
                        task.recurrence
                      }
                      onChange={(
                        event
                      ) =>
                        changeRecurrence(
                          task.id,
                          event.target
                            .value as Recurrence
                        )
                      }
                      className="rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                    >
                      {RECURRENCE_OPTIONS.map(
                        (
                          option: {
                            value: Recurrence;
                            label: string;
                          }
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>

                  </div>

                  {/* REMINDER */}

                  <div className="flex items-center gap-3 mt-2 ml-2">

                    <label className="text-xs text-slate-400">
                      🔔 Reminder:
                    </label>

                    <input
                      type="time"
                      value={
                        task.reminder ??
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        changeReminder(
                          task.id,
                          event.target
                            .value
                        )
                      }
                      className="rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                    />

                    {task.reminder && (
                      <button
                        type="button"
                        onClick={() =>
                          changeReminder(
                            task.id,
                            ""
                          )
                        }
                        className="text-xs text-slate-500 hover:text-white"
                      >
                        Clear
                      </button>
                    )}

                  </div>

                  {/* DEPENDENCIES */}

                  <div className="mt-3 ml-2 rounded-xl bg-slate-900/60 border border-slate-800 p-3">

                    <p className="text-xs text-slate-400 mb-2">
                      🔗 This task depends on:
                    </p>

                    {tasks.filter(
                      (
                        candidate: Task
                      ) =>
                        candidate.id !==
                          task.id &&
                        !candidate.completed
                    ).length ===
                      0 ? (
                      <p className="text-xs text-slate-600">
                        No other unfinished tasks available.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">

                        {tasks
                          .filter(
                            (
                              candidate: Task
                            ) =>
                              candidate.id !==
                                task.id &&
                              !candidate.completed
                          )
                          .map(
                            (
                              candidate: Task
                            ) => {
                              const selected =
                                task.dependencyIds.includes(
                                  candidate.id
                                );

                              return (
                                <button
                                  key={
                                    candidate.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    toggleDependency(
                                      task.id,
                                      candidate.id
                                    )
                                  }
                                  className={`text-xs px-3 py-2 rounded-lg border transition ${
                                    selected
                                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                      : "bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300"
                                  }`}
                                >
                                  {selected
                                    ? "✓ "
                                    : ""}
                                  {
                                    candidate.title
                                  }
                                </button>
                              );
                            }
                          )}

                      </div>
                    )}

                    {dependencyNames.length >
                      0 && (
                      <p className="text-xs text-purple-300 mt-2">
                        Atlas will prioritize these dependencies before this task.
                      </p>
                    )}

                  </div>

                </div>
              );
            }
          )}

        </div>

        {/* PROGRESS */}

        <div className="mt-6">
          <ProgressBar
            progress={
              progress
            }
          />
        </div>

        {/* ADD TASK */}

        <div className="mt-5">
          <AddTask
            onAddTask={
              addTask
            }
          />
        </div>

      </DashboardCard>

      {/* FOCUS MODE */}

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
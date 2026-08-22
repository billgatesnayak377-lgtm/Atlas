import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardCard from "../components/layout/DashboardCard";
import TaskCard from "../components/tasks/TaskCard";
import AddTask from "../components/tasks/AddTask";
import ProgressBar from "../components/ui/ProgressBar";
import FocusMode from "../components/focus/FocusMode";
import MemoryPanel from "../components/memory/MemoryPanel";
import type { AtlasMemory } from "../memory/memory";

type Priority =
  | "high"
  | "medium"
  | "low";

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

type Preferences = {
  defaultPriority: Priority;
  defaultDuration: number;
  defaultCategory: Category;
  defaultPreferredTime: PreferredTime;
  defaultRecurrence: Recurrence;
  defaultReminder: string;
};

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

/* =========================================================
   DEFAULTS
========================================================= */

const DEFAULT_PREFERENCES: Preferences = {
  defaultPriority: "medium",
  defaultDuration: 30,
  defaultCategory: "other",
  defaultPreferredTime: "anytime",
  defaultRecurrence: "none",
  defaultReminder: "",
};

/* =========================================================
   OPTIONS
========================================================= */

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

/* =========================================================
   NORMALIZATION
========================================================= */

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
    value === "anytime" ||
    value === "morning" ||
    value === "afternoon" ||
    value === "evening"
  ) {
    return value;
  }

  return "anytime";
}

function normalizeRecurrence(
  value: unknown
): Recurrence {
  if (
    value === "none" ||
    value === "daily" ||
    value === "weekdays" ||
    value === "weekly"
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
    .map((id: unknown) =>
      Number(id)
    )
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

    completed:
      Boolean(task.completed),

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

/* =========================================================
   HELPERS
========================================================= */

function formatDuration(
  minutes: number
): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

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
  return (
    PREFERRED_TIME_OPTIONS.find(
      (item) =>
        item.value === value
    )?.label ?? "Anytime"
  );
}

function getRecurrenceLabel(
  value: Recurrence
): string {
  return (
    RECURRENCE_OPTIONS.find(
      (item) =>
        item.value === value
    )?.label ??
    "Does not repeat"
  );
}

function getScheduleTimeRange(
  task: PlannedTask
): string {
  if (
    !task.startTime ||
    !task.endTime
  ) {
    return "Time not assigned";
  }

  return `${task.startTime} – ${task.endTime}`;
}

/* =========================================================
   PREFERENCE VALIDATION
========================================================= */

function loadPreferences(): Preferences {
  try {
    const saved =
      localStorage.getItem(
        "atlas-preferences"
      );

    if (!saved) {
      return {
        ...DEFAULT_PREFERENCES,
      };
    }

    const parsed =
      JSON.parse(saved);

    return {
      defaultPriority:
        normalizePriority(
          parsed?.defaultPriority
        ),

      defaultDuration:
        normalizeDuration(
          parsed?.defaultDuration
        ),

      defaultCategory:
        normalizeCategory(
          parsed?.defaultCategory
        ),

      defaultPreferredTime:
        normalizePreferredTime(
          parsed?.defaultPreferredTime
        ),

      defaultRecurrence:
        normalizeRecurrence(
          parsed?.defaultRecurrence
        ),

      defaultReminder:
        typeof parsed?.defaultReminder ===
        "string"
          ? parsed.defaultReminder
          : "",
    };
  } catch {
    return {
      ...DEFAULT_PREFERENCES,
    };
  }
}


/* =========================================================
   SPRINT 11 AUTOMATION HELPERS
========================================================= */

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToISO(dateISO: string | undefined, days: number): string | undefined {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return undefined;
  }
  const date = new Date(`${dateISO}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextOccurrence(task: Task): string | undefined {
  const base = task.dueDate || getTodayISO();
  if (task.recurrence === "daily") return addDaysToISO(base, 1);
  if (task.recurrence === "weekly") return addDaysToISO(base, 7);
  if (task.recurrence === "weekdays") {
    let next = addDaysToISO(base, 1);
    for (let i = 0; i < 7 && next; i++) {
      const day = new Date(`${next}T12:00:00`).getDay();
      if (day !== 0 && day !== 6) return next;
      next = addDaysToISO(next, 1);
    }
  }
  return undefined;
}

function memoryText(memories: AtlasMemory[]): string[] {
  return memories
    .filter((m) => m && typeof m.value === "string")
    .map((m) => `${m.type}: ${m.key} = ${m.value}`);
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  /* =======================================================
     PREFERENCES
  ======================================================= */

  const [
    preferences,
    setPreferences,
  ] = useState<Preferences>(
    loadPreferences
  );

  const [
    showPreferences,
    setShowPreferences,
  ] = useState(true);

  const [
    savedPreferenceMessage,
    setSavedPreferenceMessage,
  ] = useState(
    "Saved locally"
  );

  function updatePreference<
    K extends keyof Preferences
  >(
    key: K,
    value: Preferences[K]
  ) {
    setPreferences(
      (current) => ({
        ...current,
        [key]: value,
      })
    );

    setSavedPreferenceMessage(
      "Unsaved changes"
    );
  }

  function savePreferences() {
    const safePreferences: Preferences = {
      defaultPriority:
        normalizePriority(
          preferences.defaultPriority
        ),

      defaultDuration:
        normalizeDuration(
          preferences.defaultDuration
        ),

      defaultCategory:
        normalizeCategory(
          preferences.defaultCategory
        ),

      defaultPreferredTime:
        normalizePreferredTime(
          preferences.defaultPreferredTime
        ),

      defaultRecurrence:
        normalizeRecurrence(
          preferences.defaultRecurrence
        ),

      defaultReminder:
        typeof preferences.defaultReminder ===
        "string"
          ? preferences.defaultReminder
          : "",
    };

    localStorage.setItem(
      "atlas-preferences",
      JSON.stringify(
        safePreferences
      )
    );

    setPreferences(
      safePreferences
    );

    setSavedPreferenceMessage(
      "Saved locally"
    );
  }

  function resetPreferences() {
    const reset = {
      ...DEFAULT_PREFERENCES,
    };

    setPreferences(reset);

    localStorage.setItem(
      "atlas-preferences",
      JSON.stringify(reset)
    );

    setSavedPreferenceMessage(
      "Reset locally"
    );
  }

  /* =======================================================
     MEMORY
  ======================================================= */

  const [
    memories,
    setMemories,
  ] = useState<AtlasMemory[]>(() => {
    try {
      const saved =
        localStorage.getItem(
          "atlas-memory"
        );

      if (!saved) {
        return [];
      }

      const parsed: unknown =
        JSON.parse(saved);

      if (
        !Array.isArray(parsed)
      ) {
        return [];
      }

      return parsed as AtlasMemory[];
    } catch {
      console.error(
        "Could not load Atlas memory."
      );

      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "atlas-memory",
        JSON.stringify(memories)
      );
    } catch {
      console.error(
        "Could not save Atlas memory."
      );
    }
  }, [memories]);

  /* =======================================================
     TASKS
  ======================================================= */

  const [
    tasks,
    setTasks,
  ] = useState<Task[]>(() => {
    try {
      const saved =
        localStorage.getItem(
          "atlas-tasks"
        );

      if (saved) {
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
      }
    } catch {
      console.error(
        "Could not load saved Atlas tasks."
      );
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem(
      "atlas-tasks",
      JSON.stringify(tasks)
    );
  }, [tasks]);


  /* =======================================================
     REMINDERS
  ======================================================= */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkReminders = async () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = getTodayISO();

      const firedKey = "atlas-fired-reminders";
      let fired: string[] = [];
      try {
        const saved = localStorage.getItem(firedKey);
        fired = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(fired)) fired = [];
      } catch {
        fired = [];
      }

      const keepPrefix = `${today}:`;
      fired = fired.filter((key) => key.startsWith(keepPrefix));

      for (const task of tasks) {
        if (task.completed || !task.reminder || task.reminder !== currentTime) continue;

        const key = `${today}:${task.id}:${task.reminder}`;
        if (fired.includes(key)) continue;

        fired.push(key);
        const body = `${task.title} • ${formatDuration(task.duration)}`;

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Atlas Reminder", {
            body,
            tag: `atlas-${task.id}-${today}`,
          });
        } else {
          window.alert(`🔔 Atlas Reminder\n\n${body}`);
        }
      }

      localStorage.setItem(firedKey, JSON.stringify(fired));
    };

    checkReminders();
    const interval = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(interval);
  }, [tasks]);

  async function requestReminderPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setReminderPermission("unsupported");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setReminderPermission(permission);
    } catch {
      setReminderPermission(Notification.permission);
    }
  }

  /* =======================================================
     AI TASK ASSISTANT
  ======================================================= */

  const [
    smartTask,
    setSmartTask,
  ] = useState("");

  const [
    isAiLoading,
    setIsAiLoading,
  ] = useState(false);

  /* =======================================================
     DAILY PLANNER
  ======================================================= */

  const [
    dailyPlan,
    setDailyPlan,
  ] = useState<PlannedTask[]>([]);

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

  /* =======================================================
     FOCUS MODE
  ======================================================= */

  const [
    focusTaskId,
    setFocusTaskId,
  ] = useState<number | null>(
    null
  );

  const [reminderPermission, setReminderPermission] =
    useState<NotificationPermission | "unsupported">(() => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
      }
      return Notification.permission;
    });


  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const completedTasks =
    tasks.filter(
      (task) =>
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
          (task) =>
            task.id ===
            focusTaskId
        ) ?? null;

  const totalUnfinishedMinutes =
    useMemo(
      () =>
        tasks
          .filter(
            (task) =>
              !task.completed
          )
          .reduce(
            (
              total,
              task
            ) =>
              total +
              task.duration,
            0
          ),
      [tasks]
    );

  /* =======================================================
     PREFERENCE → UNFINISHED TASKS
  ======================================================= */

  function applyPreferencesToUnfinishedTasks() {
    setTasks(
      (current) =>
        current.map(
          (task) =>
            task.completed
              ? task
              : {
                  ...task,

                  priority:
                    preferences.defaultPriority,

                  duration:
                    preferences.defaultDuration,

                  category:
                    preferences.defaultCategory,

                  preferredTime:
                    preferences.defaultPreferredTime,

                  recurrence:
                    preferences.defaultRecurrence,

                  reminder:
                    preferences.defaultReminder ||
                    undefined,
                }
        )
    );
  }

  /* =======================================================
     TASK ACTIONS
  ======================================================= */

  function toggleTask(
    taskId: number
  ) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    if (!task.completed && task.recurrence !== "none") {
      const nextDueDate = nextOccurrence(task);
      setTasks((current) => {
        const completed = current.map((item) =>
          item.id === taskId ? { ...item, completed: true } : item
        );
        if (!nextDueDate) return completed;
        return [
          ...completed,
          {
            ...task,
            id: Date.now() + Math.floor(Math.random() * 1000),
            completed: false,
            dueDate: nextDueDate,
            dependencyIds: [],
          },
        ];
      });
      return;
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === taskId
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  }

  function deleteTask(
    taskId: number
  ) {
    setTasks(
      (current) =>
        current
          .filter(
            (task) =>
              task.id !== taskId
          )
          .map(
            (task) => ({
              ...task,
              dependencyIds:
                task.dependencyIds.filter(
                  (id) =>
                    id !== taskId
                ),
            })
          )
    );

    setDailyPlan(
      (current) =>
        current.filter(
          (task) =>
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

      priority:
        preferences.defaultPriority,

      duration:
        preferences.defaultDuration,

      category:
        preferences.defaultCategory,

      dueDate: undefined,

      dependencyIds: [],

      preferredTime:
        preferences.defaultPreferredTime,

      recurrence:
        preferences.defaultRecurrence,

      reminder:
        preferences.defaultReminder ||
        undefined,
    };

    setTasks(
      (current) => [
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
      !newTitle.trim()
    ) {
      return;
    }

    setTasks(
      (current) =>
        current.map(
          (item) =>
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
      (current) =>
        current.map(
          (item) =>
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
      (current) =>
        current.map(
          (task) =>
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
      (current) =>
        current.map(
          (task) =>
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
      (current) =>
        current.map(
          (task) =>
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
      (current) =>
        current.map(
          (task) =>
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
      (current) =>
        current.map(
          (task) =>
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
      (current) =>
        current.map(
          (task) =>
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
    if (reminder && reminderPermission === "default") {
      void requestReminderPermission();
    }

    setTasks(
      (current) =>
        current.map(
          (task) =>
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

  /* =======================================================
     DEPENDENCIES
  ======================================================= */

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
      (current) =>
        current.map(
          (task) => {
            if (
              task.id !==
              taskId
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
                      (id) =>
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
        (id) =>
          tasks.find(
            (item) =>
              item.id === id
          )?.title
      )
      .filter(
        (
          title
        ): title is string =>
          Boolean(title)
      );
  }

  /* =======================================================
     AI TASK CREATION
     
     IMPORTANT:
     Preferences are sent to the API.
  ======================================================= */

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
      /*
       * Always use the latest preferences
       * stored in localStorage.
       */
      const latestPreferences =
        loadPreferences();

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

              preferences: {
                defaultPriority:
                  latestPreferences.defaultPriority,

                defaultDuration:
                  latestPreferences.defaultDuration,

                defaultCategory:
                  latestPreferences.defaultCategory,

                defaultPreferredTime:
                  latestPreferences.defaultPreferredTime,

                defaultRecurrence:
                  latestPreferences.defaultRecurrence,

                defaultReminder:
                  latestPreferences.defaultReminder,
              },
              memories: memoryText(memories),
            }),
          }
        );

      const data: {
        tasks?: Array<
          Partial<Task>
        >;

        title?: string;
        priority?: Priority;
        duration?: number;
        category?: Category;
        dueDate?:
          | string
          | null;

        preferredTime?:
          | PreferredTime;

        recurrence?:
          | Recurrence;

        reminder?:
          | string
          | null;

        error?: string;
      } =
        await response.json();

      console.log(
        "Atlas Task Assistant response:",
        data
      );

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            `Task Assistant request failed (${response.status}).`
        );
      }

      /* =================================================
         MULTI-TASK RESPONSE
      ================================================= */

      let aiTasks:
        Array<Partial<Task>> =
        [];

      if (
        Array.isArray(
          data.tasks
        )
      ) {
        aiTasks =
          data.tasks;
      } else if (
        typeof data.title ===
          "string" &&
        data.title.trim()
      ) {
        /*
         * Backward compatibility.
         */
        aiTasks = [
          {
            title:
              data.title,

            priority:
              data.priority,

            duration:
              data.duration,

            category:
              data.category,

            dueDate:
              typeof data.dueDate ===
              "string"
                ? data.dueDate
                : undefined,

            preferredTime:
              data.preferredTime,

            recurrence:
              data.recurrence,

            reminder:
              typeof data.reminder ===
              "string"
                ? data.reminder
                : undefined,
          },
        ];
      }

      if (
        aiTasks.length ===
        0
      ) {
        throw new Error(
          "Atlas returned no tasks. Check the Task Assistant API response in the browser console."
        );
      }

      const baseId =
        Date.now();

      const newTasks: Task[] =
        aiTasks
          .map(
            (
              task,
              index
            ) =>
              normalizeTask(
                {
                  id:
                    baseId +
                    index,

                  title:
                    typeof task.title ===
                    "string"
                      ? task.title.trim()
                      : "Untitled task",

                  completed:
                    false,

                  priority:
                    task.priority,

                  duration:
                    task.duration,

                  category:
                    task.category,

                  dueDate:
                    typeof task.dueDate ===
                    "string"
                      ? task.dueDate
                      : undefined,

                  dependencyIds:
                    [],

                  preferredTime:
                    task.preferredTime !== undefined
                      ? normalizePreferredTime(task.preferredTime)
                      : latestPreferences.defaultPreferredTime,

                  recurrence:
                    task.recurrence !== undefined
                      ? normalizeRecurrence(task.recurrence)
                      : latestPreferences.defaultRecurrence,

                  reminder:
                    typeof task.reminder === "string"
                      ? task.reminder
                      : latestPreferences.defaultReminder || undefined,
                },

                baseId +
                  index
              )
          )
          .filter(
            (task) =>
              task.title !==
              "Untitled task"
          );

      if (
        newTasks.length ===
        0
      ) {
        throw new Error(
          "Atlas returned tasks without valid titles."
        );
      }

      /*
       * IMPORTANT:
       * All tasks are added in ONE state update.
       */
      setTasks(
        (current) => [
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

      window.alert(
        error instanceof Error
          ? error.message
          : "Atlas Task Assistant failed."
      );
    } finally {
      setIsAiLoading(
        false
      );
    }
  }

  /* =======================================================
     AVAILABLE TIME
  ======================================================= */

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
        ? Math.max(
            0,
            hours
          )
        : 0;

    const safeMinutes =
      Number.isFinite(
        minutes
      )
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
    setAvailableMinutesInput("");
  }

  /* =======================================================
     DAILY PLANNER
  ======================================================= */

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
      activeTasks.length ===
      0
    ) {
      window.alert(
        "You have no unfinished tasks to plan."
      );
      return;
    }

    const selectedAvailableMinutes =
      getAvailableMinutes();

    setIsPlannerLoading(
      true
    );

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

              memories: memoryText(memories),
            }),
          }
        );

      const data =
        (await response.json()) as PlannerResponse;

      if (
        !response.ok
      ) {
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
            (task) =>
              task.id
          )
        );

      const cleanedPlan =
        data.plan
          .filter(
            (task) =>
              validIds.has(
                task.id
              )
          )
          .sort(
            (a, b) =>
              a.suggestedOrder -
              b.suggestedOrder
          )
          .map(
            (
              task,
              index
            ): PlannedTask => {
              const original =
                activeTasks.find(
                  (item) =>
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
                total,
                task
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

      setShowPlanner(
        true
      );
    } catch (error) {
      console.error(
        "Atlas planner error:",
        error
      );

      window.alert(
        "Atlas couldn't create your daily plan. Please try again."
      );
    } finally {
      setIsPlannerLoading(
        false
      );
    }
  }

  /* =======================================================
     FOCUS
  ======================================================= */

  function completeFocusTask(
    taskId: number
  ) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const nextDueDate = nextOccurrence(task);
    const shouldRepeat = task.recurrence !== "none" && Boolean(nextDueDate);

    setTasks((current) => {
      const completed = current.map((item) =>
        item.id === taskId
          ? { ...item, completed: true }
          : item
      );

      if (!shouldRepeat) return completed;

      const nextId = Date.now() + Math.floor(Math.random() * 1000);
      const nextTask: Task = {
        ...task,
        id: nextId,
        completed: false,
        dueDate: nextDueDate,
        dependencyIds: [],
      };

      return [...completed, nextTask];
    });

    setDailyPlan((current) =>
      current.filter((item) => item.id !== taskId)
    );

    setFocusTaskId(null);
  }

  /* =======================================================
     GREETING
  ======================================================= */

  const currentHour =
    new Date().getHours();

  let greeting =
    "Good Evening";

  if (
    currentHour < 12
  ) {
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
        weekday:
          "long",
        day: "numeric",
        month:
          "long",
      }
    );

  const selectedAvailableMinutes =
    getAvailableMinutes();

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">

        <DashboardCard>

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-sky-400">
                👋 {greeting}, Bill
              </h1>

              <p className="text-slate-400 mt-2">
                {currentDate}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowPreferences(
                  (current) =>
                    !current
                )
              }
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:border-purple-500/50 transition"
            >
              ⚙️ Preferences
            </button>
          </div>

          <div className="border-t border-slate-700 my-6" />

          {/* =================================================
              PREFERENCE DASHBOARD
          ================================================= */}

          {showPreferences && (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 mb-6">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    ⚙️ Preference Dashboard
                  </h2>

                  <p className="text-sm text-slate-400 mt-1">
                    Set Atlas's default behavior for new tasks.
                  </p>
                </div>

                <span className="text-xs px-3 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {savedPreferenceMessage}
                </span>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">

                {/* DEFAULT PRIORITY */}

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    🎯 Default priority
                  </label>

                  <select
                    value={
                      preferences.defaultPriority
                    }
                    onChange={(event) =>
                      updatePreference(
                        "defaultPriority",
                        event.target
                          .value as Priority
                      )
                    }
                    className="w-full rounded-xl bg-slate-900 text-slate-200 px-4 py-3 border border-slate-700 focus:outline-none focus:border-purple-500"
                  >
                    <option value="high">
                      🔴 High
                    </option>

                    <option value="medium">
                      🟡 Medium
                    </option>

                    <option value="low">
                      🟢 Low
                    </option>
                  </select>
                </div>

                {/* DEFAULT DURATION */}

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    ⏱️ Default duration
                  </label>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={
                        preferences.defaultDuration
                      }
                      onChange={(event) =>
                        updatePreference(
                          "defaultDuration",
                          normalizeDuration(
                            Number(
                              event.target
                                .value
                            )
                          )
                        )
                      }
                      className="flex-1 rounded-xl bg-slate-900 text-slate-200 px-4 py-3 border border-slate-700 focus:outline-none focus:border-purple-500"
                    />

                    <span className="text-xs text-slate-500">
                      minutes
                    </span>
                  </div>
                </div>

                {/* DEFAULT CATEGORY */}

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    📁 Default category
                  </label>

                  <select
                    value={
                      preferences.defaultCategory
                    }
                    onChange={(event) =>
                      updatePreference(
                        "defaultCategory",
                        event.target
                          .value as Category
                      )
                    }
                    className="w-full rounded-xl bg-slate-900 text-slate-200 px-4 py-3 border border-slate-700 focus:outline-none focus:border-purple-500"
                  >
                    {CATEGORY_OPTIONS.map(
                      (option) => (
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

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    🕐 Preferred time
                  </label>

                  <select
                    value={
                      preferences.defaultPreferredTime
                    }
                    onChange={(event) =>
                      updatePreference(
                        "defaultPreferredTime",
                        event.target
                          .value as PreferredTime
                      )
                    }
                    className="w-full rounded-xl bg-slate-900 text-slate-200 px-4 py-3 border border-slate-700 focus:outline-none focus:border-purple-500"
                  >
                    {PREFERRED_TIME_OPTIONS.map(
                      (option) => (
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

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    🔁 Default recurrence
                  </label>

                  <select
                    value={
                      preferences.defaultRecurrence
                    }
                    onChange={(event) =>
                      updatePreference(
                        "defaultRecurrence",
                        event.target
                          .value as Recurrence
                      )
                    }
                    className="w-full rounded-xl bg-slate-900 text-slate-200 px-4 py-3 border border-slate-700 focus:outline-none focus:border-purple-500"
                  >
                    {RECURRENCE_OPTIONS.map(
                      (option) => (
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

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    🔔 Default reminder
                  </label>

                  <input
                    type="time"
                    value={
                      preferences.defaultReminder
                    }
                    onChange={(event) =>
                      updatePreference(
                        "defaultReminder",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl bg-slate-900 text-slate-200 px-4 py-3 border border-slate-700 focus:outline-none focus:border-purple-500"
                  />
                </div>

              </div>

              {/* BUTTONS */}

              <div className="flex flex-wrap gap-3 mt-5">

                <button
                  type="button"
                  onClick={
                    savePreferences
                  }
                  className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition"
                >
                  Save Preferences
                </button>

                <button
                  type="button"
                  onClick={
                    applyPreferencesToUnfinishedTasks
                  }
                  className="px-5 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition"
                >
                  Apply to Unfinished Tasks
                </button>

                <button
                  type="button"
                  onClick={
                    resetPreferences
                  }
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
                >
                  Reset
                </button>

              </div>

              {/* CURRENT DEFAULTS */}

              <div className="mt-5 rounded-xl bg-slate-950/70 border border-slate-800 p-4">

                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                  Current Atlas Defaults
                </p>

                <div className="flex flex-wrap gap-2">

                  <span className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-400">
                    🎯{" "}
                    {
                      preferences.defaultPriority
                    }
                  </span>

                  <span className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-400">
                    ⏱️{" "}
                    {formatDuration(
                      preferences.defaultDuration
                    )}
                  </span>

                  <span className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-400">
                    📁{" "}
                    {
                      CATEGORY_OPTIONS.find(
                        (item) =>
                          item.value ===
                          preferences.defaultCategory
                      )?.label
                    }
                  </span>

                  <span className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-400">
                    🕐{" "}
                    {getPreferredTimeLabel(
                      preferences.defaultPreferredTime
                    )}
                  </span>

                  <span className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-400">
                    🔁{" "}
                    {getRecurrenceLabel(
                      preferences.defaultRecurrence
                    )}
                  </span>

                  {preferences.defaultReminder && (
                    <span className="text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-400">
                      🔔{" "}
                      {
                        preferences.defaultReminder
                      }
                    </span>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              AI ASSISTANT
          ================================================= */}

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
                type="button"
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

          {/* =================================================
              TODAY'S FOCUS
          ================================================= */}

          <div className="flex items-center justify-between gap-4">

            <h2 className="text-2xl font-semibold text-white">
              🎯 Today's Focus
            </h2>

            <button
              type="button"
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

          {/* =================================================
              AVAILABLE TIME
          ================================================= */}

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
                  onChange={(event) =>
                    setAvailableHours(
                      event.target.value
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
                  onChange={(event) =>
                    setAvailableMinutesInput(
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

          {/* =================================================
              SMART SCHEDULE
          ================================================= */}

          {showPlanner && (
            <div className="mt-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <h3 className="text-xl font-semibold text-purple-300">
                    🧠 Your Smart Schedule
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">
                    {
                      plannerSummary
                    }
                  </p>
                </div>

                <button
                  type="button"
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
                  (task) => (
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

                              {task.startTime &&
                                task.endTime && (
                                  <div className="text-sm font-semibold text-sky-300 mb-1">
                                    ⏰{" "}
                                    {getScheduleTimeRange(
                                      task
                                    )}
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

                          </div>

                          <div className="mt-3 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">

                            <div className="text-xs text-slate-500 uppercase tracking-wide">
                              Scheduled block
                            </div>

                            <div className="text-sm text-sky-300 mt-1">
                              {getScheduleTimeRange(
                                task
                              )}{" "}
                              ·{" "}
                              {formatDuration(
                                task.duration
                              )}
                            </div>

                          </div>

                          <p className="text-sm text-slate-400 mt-2">
                            {
                              task.reason
                            }
                          </p>

                          <button
                            type="button"
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

          {/* =================================================
              TASK LIST
          ================================================= */}

          <div className="mt-5 space-y-5">

            {tasks.map(
              (task) => {
                const dependencyNames =
                  getDependencyNames(
                    task
                  );

                const unfinishedOthers =
                  tasks.filter(
                    (candidate) =>
                      candidate.id !==
                        task.id &&
                      !candidate.completed
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

                    {/* METADATA */}

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
                            (item) =>
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
                          🔁{" "}
                          {getRecurrenceLabel(
                            task.recurrence
                          )}
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
                        type="button"
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
                        type="button"
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
                        type="button"
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
                        onChange={(event) =>
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
                        onChange={(event) =>
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
                        onChange={(event) =>
                          changeCategory(
                            task.id,
                            event.target
                              .value as Category
                          )
                        }
                        className="rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                      >
                        {CATEGORY_OPTIONS.map(
                          (option) => (
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
                        onChange={(event) =>
                          changePreferredTime(
                            task.id,
                            event.target
                              .value as PreferredTime
                          )
                        }
                        className="rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                      >
                        {PREFERRED_TIME_OPTIONS.map(
                          (option) => (
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
                        onChange={(event) =>
                          changeRecurrence(
                            task.id,
                            event.target
                              .value as Recurrence
                          )
                        }
                        className="rounded-lg bg-slate-800 text-slate-300 px-3 py-1 text-sm border border-slate-700 focus:outline-none focus:border-sky-500"
                      >
                        {RECURRENCE_OPTIONS.map(
                          (option) => (
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
                        onChange={(event) =>
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

                      {unfinishedOthers.length ===
                      0 ? (
                        <p className="text-xs text-slate-600">
                          No other unfinished tasks available.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">

                          {unfinishedOthers.map(
                            (
                              candidate
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

          {/* =================================================
              PROGRESS
          ================================================= */}

          <div className="mt-6">
            <ProgressBar
              progress={
                progress
              }
            />
          </div>

          {/* =================================================
              ADD TASK
          ================================================= */}

          <div className="mt-5">
            <AddTask
              onAddTask={
                addTask
              }
            />
          </div>

        </DashboardCard>

        {/* =================================================
            ATLAS MEMORY
        ================================================= */}

        <MemoryPanel
          memories={
            memories
          }
          onChange={
            setMemories
          }
        />

        {/* =================================================
            FOCUS MODE
        ================================================= */}

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
    </div>
  );
}
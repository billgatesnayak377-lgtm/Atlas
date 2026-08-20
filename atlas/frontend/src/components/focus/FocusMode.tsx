import { useEffect, useState } from "react";

type Priority = "high" | "medium" | "low";

type FocusTask = {
  id: number;
  title: string;
  priority: Priority;
  duration: number;
  dueDate?: string | null;
};

type FocusModeProps = {
  task: FocusTask | null;
  onComplete: (taskId: number) => void;
  onClose: () => void;
};

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function formatDuration(
  minutes: number
): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  const remainingMinutes =
    minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr${
      hours === 1 ? "" : "s"
    }`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function FocusModeContent({
  task,
  onComplete,
  onClose,
}: {
  task: FocusTask;
  onComplete: (taskId: number) => void;
  onClose: () => void;
}) {
  const safeDuration = Math.min(
    Math.max(
      Math.round(task.duration || 30),
      5
    ),
    1440
  );

  const [secondsLeft, setSecondsLeft] =
    useState(safeDuration * 60);

  const [isRunning, setIsRunning] =
    useState(false);

  const [isEditingTime, setIsEditingTime] =
    useState(false);

  const [editHours, setEditHours] =
    useState(
      Math.floor(safeDuration / 60)
    );

  const [editMinutes, setEditMinutes] =
    useState(
      safeDuration % 60
    );

  useEffect(() => {
    const duration = Math.min(
      Math.max(
        Math.round(task.duration || 30),
        5
      ),
      1440
    );

    setSecondsLeft(
      duration * 60
    );

    setEditHours(
      Math.floor(duration / 60)
    );

    setEditMinutes(
      duration % 60
    );

    setIsRunning(false);
    setIsEditingTime(false);
  }, [task.id, task.duration]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setIsRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isRunning]);

  function resetTimer() {
    const duration = Math.min(
      Math.max(
        Math.round(task.duration || 30),
        5
      ),
      1440
    );

    setIsRunning(false);

    setSecondsLeft(
      duration * 60
    );

    setEditHours(
      Math.floor(duration / 60)
    );

    setEditMinutes(
      duration % 60
    );
  }

  function applyEditedTime() {
    let hours = Number(editHours);
    let minutes = Number(editMinutes);

    if (!Number.isFinite(hours)) {
      hours = 0;
    }

    if (!Number.isFinite(minutes)) {
      minutes = 0;
    }

    hours = Math.max(
      0,
      Math.floor(hours)
    );

    minutes = Math.max(
      0,
      Math.floor(minutes)
    );

    if (minutes > 59) {
      hours += Math.floor(
        minutes / 60
      );

      minutes = minutes % 60;
    }

    const totalMinutes =
      hours * 60 + minutes;

    if (totalMinutes <= 0) {
      window.alert(
        "Please enter a duration greater than 0."
      );

      return;
    }

    setIsRunning(false);

    setSecondsLeft(
      totalMinutes * 60
    );

    setEditHours(hours);
    setEditMinutes(minutes);

    setIsEditingTime(false);
  }

  function completeTask() {
    setIsRunning(false);
    onComplete(task.id);
  }

  const priorityStyles = {
    high:
      "bg-red-500/20 text-red-400 border-red-500/30",

    medium:
      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",

    low:
      "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6">

      <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl p-8">

        {/* Header */}
        <div className="flex items-center justify-between">

          <div>
            <p className="text-sm text-purple-400 font-medium">
              ATLAS FOCUS MODE
            </p>

            <h2 className="text-2xl font-bold text-white mt-1">
              🎯 Current Focus
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-2xl transition"
            aria-label="Close focus mode"
          >
            ×
          </button>

        </div>

        {/* Task */}
        <div className="mt-8">

          <div className="flex items-start gap-4">

            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-xl">
              🎯
            </div>

            <div className="flex-1">

              <h3 className="text-2xl font-semibold text-white">
                {task.title}
              </h3>

              <div className="flex flex-wrap gap-2 mt-3">

                <span
                  className={`text-xs px-3 py-1 rounded-lg border ${
                    priorityStyles[
                      task.priority
                    ]
                  }`}
                >
                  {task.priority === "high"
                    ? "🔴 High"
                    : task.priority ===
                      "medium"
                    ? "🟡 Medium"
                    : "🟢 Low"}
                </span>

                {task.dueDate && (
                  <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                    📅 Due:{" "}
                    {task.dueDate}
                  </span>
                )}

                <span className="text-xs px-3 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  ⏱️ Planned:{" "}
                  {formatDuration(
                    safeDuration
                  )}
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* Focus message */}
        <div className="mt-8 rounded-2xl bg-purple-500/5 border border-purple-500/20 p-5">

          <p className="text-slate-300 text-center">
            Focus only on this task.
          </p>

          <p className="text-slate-500 text-sm text-center mt-1">
            Atlas is using the duration
            saved with this task.
          </p>

        </div>

        {/* Timer */}
        <div className="mt-8 text-center">

          <p className="text-sm text-slate-500 uppercase tracking-widest">
            Focus Timer
          </p>

          <div className="text-7xl font-bold text-white tracking-tight mt-3">
            {formatTime(secondsLeft)}
          </div>

        </div>

        {/* Edit Timer */}
        {isEditingTime && (
          <div className="mt-6 rounded-2xl bg-slate-800/80 border border-slate-700 p-5">

            <p className="text-sm text-slate-300 text-center mb-4">
              ✏️ Set Focus Duration
            </p>

            <div className="flex items-center justify-center gap-3">

              <div>
                <label className="block text-xs text-slate-500 mb-1 text-center">
                  Hours
                </label>

                <input
                  type="number"
                  min="0"
                  value={editHours}
                  onChange={(event) =>
                    setEditHours(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-24 rounded-xl bg-slate-900 border border-slate-700 text-white text-center px-3 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>

              <span className="text-white text-2xl mt-5">
                :
              </span>

              <div>
                <label className="block text-xs text-slate-500 mb-1 text-center">
                  Minutes
                </label>

                <input
                  type="number"
                  min="0"
                  max="59"
                  value={editMinutes}
                  onChange={(event) =>
                    setEditMinutes(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-24 rounded-xl bg-slate-900 border border-slate-700 text-white text-center px-3 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>

            </div>

            <div className="flex justify-center gap-3 mt-5">

              <button
                onClick={applyEditedTime}
                className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-semibold transition"
              >
                Apply Time
              </button>

              <button
                onClick={() =>
                  setIsEditingTime(false)
                }
                className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {/* Timer controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">

          <button
            onClick={() =>
              setIsRunning(
                (current) => !current
              )
            }
            className="px-7 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-semibold transition"
          >
            {isRunning
              ? "⏸ Pause"
              : secondsLeft === 0
              ? "▶ Restart"
              : "▶ Start Focus"}
          </button>

          <button
            onClick={resetTimer}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Reset
          </button>

          <button
            onClick={() => {
              setIsRunning(false);
              setIsEditingTime(
                (current) => !current
              );
            }}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            ✏️ Edit Time
          </button>

        </div>

        {/* Complete */}
        <button
          onClick={completeTask}
          className="w-full mt-6 py-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition"
        >
          ✓ Complete Task
        </button>

        {/* Exit */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-3 rounded-xl text-slate-500 hover:text-white transition"
        >
          Back to Plan
        </button>

      </div>

    </div>
  );
}

export default function FocusMode({
  task,
  onComplete,
  onClose,
}: FocusModeProps) {
  if (!task) {
    return null;
  }

  return (
    <FocusModeContent
      task={task}
      onComplete={onComplete}
      onClose={onClose}
    />
  );
}
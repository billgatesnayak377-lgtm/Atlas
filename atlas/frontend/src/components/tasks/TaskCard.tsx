type TaskCardProps = {
  title: string;
  completed?: boolean;
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

export default function TaskCard({
  title,
  completed = false,
  priority = "medium",
  dueDate,
  onToggle,
  onDelete,
  onEdit,
}: TaskCardProps) {
  const priorityLabel = {
    high: "🔴 High",
    medium: "🟡 Medium",
    low: "🟢 Low",
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-3 rounded-xl bg-slate-700 px-4 py-3 text-left hover:bg-slate-600 transition"
      >
        <span className="text-xl">
          {completed ? "✅" : "⬜"}
        </span>

        <div className="flex-1">
          <span
            className={
              completed
                ? "line-through text-slate-400"
                : "text-white"
            }
          >
            {title}
          </span>

          <div className="flex gap-4 text-xs text-slate-400 mt-1">
            <span>{priorityLabel[priority]}</span>

            {dueDate && (
              <span>
                📅 {dueDate}
              </span>
            )}
          </div>
        </div>
      </button>

      <button
        onClick={onEdit}
        className="rounded-xl bg-sky-500/20 px-4 py-3 text-sky-400 hover:bg-sky-500/30 transition"
        aria-label={`Edit ${title}`}
      >
        ✏️
      </button>

      <button
        onClick={onDelete}
        className="rounded-xl bg-red-500/20 px-4 py-3 text-red-400 hover:bg-red-500/30 transition"
        aria-label={`Delete ${title}`}
      >
        🗑️
      </button>
    </div>
  );
}
type TaskCardProps = {
  title: string;
  completed?: boolean;
  onToggle: () => void;
  onDelete: () => void;
};

export default function TaskCard({
  title,
  completed = false,
  onToggle,
  onDelete,
}: TaskCardProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-3 rounded-xl bg-slate-700 px-4 py-3 text-left hover:bg-slate-600 transition"
      >
        <span className="text-xl">
          {completed ? "✅" : "⬜"}
        </span>

        <span
          className={
            completed
              ? "line-through text-slate-400"
              : "text-white"
          }
        >
          {title}
        </span>
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
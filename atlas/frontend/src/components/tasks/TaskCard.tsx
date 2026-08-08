type TaskCardProps = {
  title: string;
  completed?: boolean;
  onToggle: () => void;
};

export default function TaskCard({
  title,
  completed = false,
  onToggle,
}: TaskCardProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 rounded-xl bg-slate-700 px-4 py-3 text-left hover:bg-slate-600 transition"
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
  );
}
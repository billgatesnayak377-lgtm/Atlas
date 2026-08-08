import { useState } from "react";

type AddTaskProps = {
  onAddTask: (title: string) => void;
};

export default function AddTask({ onAddTask }: AddTaskProps) {
  const [title, setTitle] = useState("");

  function handleAddTask() {
    if (title.trim() === "") {
      return;
    }

    onAddTask(title.trim());
    setTitle("");
  }

  return (
    <div className="mt-6 flex gap-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleAddTask();
          }
        }}
        placeholder="Enter a new task..."
        className="flex-1 rounded-xl bg-slate-700 px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-400"
      />

      <button
        onClick={handleAddTask}
        className="rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white hover:bg-sky-400 transition"
      >
        + Add Task
      </button>
    </div>
  );
}
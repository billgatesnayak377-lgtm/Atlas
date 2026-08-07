import { useState } from "react";

type Props = {
  tasks: string[];
  setTasks: React.Dispatch<React.SetStateAction<string[]>>;
};

export default function AddTask({ tasks, setTasks }: Props) {
  const [newTask, setNewTask] = useState("");

  function addTask() {
    if (newTask.trim() === "") return;

    setTasks([...tasks, newTask]);

    setNewTask("");
  }

  return (
    <div
      style={{
        marginTop: "20px",
      }}
    >
      <input
        type="text"
        placeholder="Enter a new task..."
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          marginBottom: "10px",
        }}
      />

      <button
        onClick={addTask}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          background: "#38bdf8",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        + Add Task
      </button>
    </div>
  );
}
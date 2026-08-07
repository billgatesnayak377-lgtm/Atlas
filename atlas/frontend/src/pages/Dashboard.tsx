import { useState } from "react";

export default function Dashboard() {
  const [tasks, setTasks] = useState([
    "Study React",
    "Go to Gym",
    "Build Atlas",
  ]);

  function addTask() {
    const task = prompt("Enter a new task");

    if (task && task.trim() !== "") {
      setTasks([...tasks, task]);
    }
  }

  return (
    <div style={{ padding: "30px" }}>
      <h1>Today's Tasks</h1>

      <ul>
        {tasks.map((task, index) => (
          <li key={index}>{task}</li>
        ))}
      </ul>

      <button onClick={addTask}>
        + Add Task
      </button>
    </div>
  );
}
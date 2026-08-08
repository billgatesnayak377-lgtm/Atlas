import { useState } from "react";
import DashboardCard from "../components/layout/DashboardCard";
import TaskCard from "../components/tasks/TaskCard";
import AddTask from "../components/tasks/AddTask";
import ProgressBar from "../components/ui/ProgressBar";

export default function Dashboard() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Study React",
      completed: true,
    },
    {
      id: 2,
      title: "Go to Gym",
      completed: false,
    },
    {
      id: 3,
      title: "Build Atlas",
      completed: false,
    },
  ]);

  // Calculate completed tasks
  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  // Calculate progress
  const progress =
    tasks.length === 0
      ? 0
      : Math.round((completedTasks / tasks.length) * 100);

  // Complete / uncomplete a task
  function toggleTask(taskId: number) {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
            }
          : task
      )
    );
  }

  // Add a new task
  function addTask(title: string) {
    const newTask = {
      id: Date.now(),
      title: title,
      completed: false,
    };

    setTasks([...tasks, newTask]);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <DashboardCard>
        {/* Greeting */}
        <h1 className="text-4xl font-bold text-sky-400">
          👋 Good Evening, Bill
        </h1>

        <p className="text-slate-400 mt-2">
          Friday • 7 August
        </p>

        <div className="border-t border-slate-700 my-6"></div>

        {/* Today's Focus */}
        <h2 className="text-2xl font-semibold text-white">
          🎯 Today's Focus
        </h2>

        {/* Task List */}
        <div className="mt-5 space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              title={task.title}
              completed={task.completed}
              onToggle={() => toggleTask(task.id)}
            />
          ))}
        </div>

        {/* Progress */}
        <ProgressBar progress={progress} />

        {/* Add Task */}
        <AddTask onAddTask={addTask} />
      </DashboardCard>
    </div>
  );
}
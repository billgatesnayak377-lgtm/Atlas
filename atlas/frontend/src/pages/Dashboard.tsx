import { useState } from "react";

import Header from "../components/Header";
import Greeting from "../components/Greeting";
import TaskList from "../components/TaskList";
import AddTask from "../components/AddTask";

export default function Dashboard() {
  const [tasks, setTasks] = useState([
    "Study React",
    "Go to Gym",
    "Build Atlas",
  ]);

  return (
    <div>
      <Header />

      <Greeting />

      <TaskList tasks={tasks} />

      <AddTask
        tasks={tasks}
        setTasks={setTasks}
      />
    </div>
  );
}
import TaskCard from "./TaskCard";

type Task = {
  id: number;
  title: string;
  completed: boolean;
  priority?: "high" | "medium" | "low";
};

type TaskListProps = {
  tasks: Task[];
  onToggle: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onEdit: (taskId: number) => void;
};

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onEdit,
}: TaskListProps) {
  return (
    <div className="mt-5 space-y-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          title={task.title}
          completed={task.completed}
          priority={task.priority}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
          onEdit={() => onEdit(task.id)}
        />
      ))}
    </div>
  );
}
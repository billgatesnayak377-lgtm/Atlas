import TaskCard from "./TaskCard";

type Props = {
  tasks: string[];
};

export default function TaskList({ tasks }: Props) {
  return (
    <div style={{ marginTop: "20px" }}>
      {tasks.map((task, index) => (
        <TaskCard key={index} task={task} />
      ))}
    </div>
  );
}
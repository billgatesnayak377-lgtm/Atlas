type Props = {
  task: string;
};

export default function TaskCard({ task }: Props) {
  return (
    <div
      style={{
        backgroundColor: "#1e293b",
        color: "white",
        padding: "12px",
        marginBottom: "10px",
        borderRadius: "8px",
      }}
    >
      ✅ {task}
    </div>
  );
}
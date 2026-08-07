function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#0f172a",
      }}
    >
      <div
        style={{
          width: "450px",
          background: "#1e293b",
          padding: "30px",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        }}
      >
        <h1 style={{ color: "#38bdf8" }}>ATLAS</h1>

        <p style={{ marginTop: "10px", color: "#cbd5e1" }}>
          Your Personal AI Operating System
        </p>

        <hr style={{ margin: "25px 0", borderColor: "#334155" }} />

        <h2>Today's Tasks</h2>

        <ul style={{ marginTop: "20px", lineHeight: "2" }}>
          <li>✅ Study React</li>
          <li>🏋️ Go to Gym</li>
          <li>📝 Build Atlas</li>
        </ul>

        <button
          style={{
            marginTop: "30px",
            width: "100%",
            padding: "15px",
            border: "none",
            borderRadius: "10px",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          + Add Task
        </button>
      </div>
    </div>
  );
}

export default App;
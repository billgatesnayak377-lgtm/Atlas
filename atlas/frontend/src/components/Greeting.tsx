function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";

  return "Good Evening";
}

export default function Greeting() {
  return (
    <>
      <h2>{getGreeting()}, Bill 👋</h2>
      <p>Let's make today productive.</p>
    </>
  );
}
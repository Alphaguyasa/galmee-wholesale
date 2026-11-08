export default function Loading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-32 bg-muted" />
      <div className="grid gap-3 p-4">
        <div className="h-12 rounded-md bg-muted" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

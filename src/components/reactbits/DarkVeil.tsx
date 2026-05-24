export function DarkVeil() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute right-[-12rem] top-44 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute inset-0 studio-grid opacity-50" />
    </div>
  );
}

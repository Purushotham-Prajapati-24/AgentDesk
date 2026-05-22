const workspaceLinks = [
  {
    href: "/inbox",
    title: "Live inbox",
    description: "Monitor active sessions and take over customer conversations in real time.",
  },
  {
    href: "/widget-test.html",
    title: "Widget fixture",
    description: "Open the isolated Shadow DOM widget on a raw host page with conflicting styles.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold text-slate-500">AgentDesk workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">AI support operations</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Manage embeddable support widgets, live human handoff, and tenant-scoped chat operations from one focused
            dashboard.
          </p>
        </section>

        <section className="grid gap-4 py-6 md:grid-cols-2">
          {workspaceLinks.map((link) => (
            <a
              className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm transition hover:border-slate-500"
              href={link.href}
              key={link.href}
            >
              <h2 className="text-lg font-semibold text-slate-950">{link.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{link.description}</p>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}

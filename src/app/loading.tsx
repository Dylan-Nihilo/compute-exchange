export default function Loading() {
  return (
    <main
      aria-label="正在加载"
      className="grid min-h-svh place-items-center px-5 py-12"
    >
      <div className="w-full max-w-xl animate-pulse space-y-5" role="status">
        <div className="h-7 w-28 rounded-full bg-surface-secondary" />
        <div className="h-12 w-3/4 rounded-xl bg-surface-secondary" />
        <div className="h-24 rounded-2xl bg-surface-secondary" />
        <span className="sr-only">正在加载</span>
      </div>
    </main>
  );
}

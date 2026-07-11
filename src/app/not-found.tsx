import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-12 text-center">
      <div className="space-y-4">
        <p className="text-sm text-muted">404</p>
        <h1 className="text-3xl font-semibold">页面不存在</h1>
        <Link className="text-accent underline-offset-4 hover:underline" href="/">
          返回首页
        </Link>
      </div>
    </main>
  );
}

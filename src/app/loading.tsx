export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-campus-500 border-t-transparent" />
      <p className="text-sm text-slate-400">Loading Universe ICOS...</p>
    </div>
  );
}

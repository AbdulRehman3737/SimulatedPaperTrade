export function Spinner(): JSX.Element {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
    </div>
  );
}

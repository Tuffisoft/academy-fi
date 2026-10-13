export function PageLoading({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      role="status"
      className={`flex flex-1 items-center justify-center bg-background px-4 text-sm text-muted-foreground ${fullScreen ? "min-h-svh" : "min-h-64"}`}
    >
      Wird geladen …
    </div>
  );
}

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps): JSX.Element {
  return (
    <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">{message}</div>
  );
}

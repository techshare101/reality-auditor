import { useProStatus } from "@/hooks/useProStatus";
import { useAuth } from "@/hooks/useAuth";

export default function TopBadge({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const status = useProStatus(user?.uid);

  if (status === "loading") {
    return (
      <span className={`badge bg-gray-300 animate-pulse ${className}`}>
        Loading...
      </span>
    );
  }

  return (
    <span
      className={`badge ${status === "pro" ? "bg-green-500" : "bg-gray-400"} ${className}`}
    >
      {status === "pro" ? "Pro" : "Free"}
    </span>
  );
}
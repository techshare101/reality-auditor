import { useProStatus } from "@/hooks/useProStatus";
import { useAuth } from "@/lib/hooks/useAuth"; // adjust to your auth hook

export default function ProBadge({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const status = useProStatus(user?.uid);

  if (status === "loading") {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 animate-pulse ${className}`}>
        Loading...
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        status === "pro"
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-800"
      } ${className}`}
    >
      {status === "pro" ? "Pro" : "Free"}
    </span>
  );
}
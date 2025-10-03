import { useProStatus } from "@/hooks/useProStatus";
import { useAuth } from "@/contexts/AuthContext";

export default function TopBadge({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const status = useProStatus(user?.uid);
  
  console.log("[TopBadge] Current status:", status, "for user:", user?.uid);

  if (status === "loading") {
    return (
      <span className={`badge bg-gray-300 animate-pulse ${className}`}>
        Loading...
      </span>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${status === "pro" 
          ? "bg-green-100 text-green-800 border border-green-200" 
          : "bg-gray-100 text-gray-800 border border-gray-200"
        } ${className}
      `}
    >
      {status === "pro" ? "✨ Pro" : "Free"}
    </span>
  );
}
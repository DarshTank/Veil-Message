import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";

export function useNotificationCounts() {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [unreadChats, setUnreadChats] = useState<Record<string, number>>({});
  const { data: session } = useSession();

  useEffect(() => {
    if (!session || !session.user) return;

    const fetchCounts = async () => {
      try {
        const res = await axios.get("/api/notifications/counts");
        if (res.data.success) {
          setPendingRequests(res.data.pendingRequests);
          setUnreadChats(res.data.unreadChats);
        }
      } catch {
        // Non-fatal — silent fail
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);

    return () => clearInterval(interval);
  }, [session]);

  return { pendingRequests, unreadChats, setPendingRequests, setUnreadChats };
}

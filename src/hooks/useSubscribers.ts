import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  subscription_status: string;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
  auth_method?: 'google' | 'otp' | 'unknown';
  subscription_end?: string;
  subscription_tier?: string;
  is_active: boolean;
}

export interface AuthLog {
  id: string;
  user_id: string;
  action: string;
  method: string;
  phone?: string;
  email?: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  created_at: string;
}

/**
 * useUsers
 * --------
 * Retrieves all users from the users table including both Google OAuth and OTP users.
 * Shows authentication method, login attempts, and subscription status.
 * Real-time updates for admin dashboard.
 */
export function useSubscribers() {
  const [subscribers, setSubscribers] = useState<User[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsersData() {
      setLoading(true);
      
      try {
        // Fetch all users from users table
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select(`
            id,
            email,
            name,
            phone,
            avatar_url,
            subscription_status,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false });

        if (usersError) {
          console.error("[useUsers] Failed to fetch users:", usersError.message);
          setSubscribers([]);
        } else if (usersData) {
          // Process users data and determine auth method
          const processedUsers: User[] = usersData.map(user => ({
            ...user,
            auth_method: user.phone ? 'otp' : 'google',
            subscription_tier: user.subscription_status === 'active' ? 'Premium' : 'Free',
            is_active: user.subscription_status === 'active',
            subscription_end: user.subscription_status === 'active' ? 
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : 
              undefined
          }));
          
          setSubscribers(processedUsers);
        }

        // Fetch recent authentication logs if table exists
        try {
          const { data: logsData, error: logsError } = await supabase
            .from('auth_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

          if (!logsError && logsData) {
            setAuthLogs(logsData);
          }
        } catch (logsTableError) {
          // auth_logs table might not exist, ignore error
          console.log("Auth logs table not available");
        }

      } catch (error) {
        console.error("[useUsers] Unexpected error:", error);
        setSubscribers([]);
      }
      
      setLoading(false);
    }

    loadUsersData();

    // Listen to real-time changes on users table
    const channelName = `users_realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          switch (payload.eventType) {
            case "INSERT":
              if (newRow) {
                const processedUser: User = {
                  ...newRow,
                  auth_method: newRow.phone ? 'otp' : 'google',
                  subscription_tier: newRow.subscription_status === 'active' ? 'Premium' : 'Free',
                  is_active: newRow.subscription_status === 'active',
                  subscription_end: newRow.subscription_status === 'active' ? 
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : 
                    undefined
                };
                setSubscribers((prev) => [processedUser, ...prev]);
              }
              break;
            case "UPDATE":
              if (newRow) {
                const processedUser: User = {
                  ...newRow,
                  auth_method: newRow.phone ? 'otp' : 'google',
                  subscription_tier: newRow.subscription_status === 'active' ? 'Premium' : 'Free',
                  is_active: newRow.subscription_status === 'active',
                  subscription_end: newRow.subscription_status === 'active' ? 
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : 
                    undefined
                };
                setSubscribers((prev) =>
                  prev.map((u) => (u.id === processedUser.id ? processedUser : u))
                );
              }
              break;
            case "DELETE":
              if (oldRow) {
                setSubscribers((prev) => prev.filter((u) => u.id !== oldRow.id));
              }
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { 
    subscribers, 
    authLogs, 
    loading,
    totalUsers: subscribers.length,
    activeUsers: subscribers.filter(u => u.is_active).length,
    otpUsers: subscribers.filter(u => u.auth_method === 'otp').length,
    googleUsers: subscribers.filter(u => u.auth_method === 'google').length,
    thisMonthUsers: subscribers.filter(u => {
      const created = new Date(u.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length
  };
} 
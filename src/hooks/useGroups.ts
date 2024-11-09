import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Group = Database['public']['Tables']['groups']['Row'] & {
  role?: string;
};

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const fetchGroups = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isSubscribed) {
            setLoading(false);
            setGroups([]);
          }
          return;
        }

        const { data: memberships, error: membershipError } = await supabase
          .from('group_members')
          .select('group_id, role')
          .eq('user_id', user.id);

        if (membershipError) {
          throw membershipError;
        }

        if (!memberships || memberships.length === 0) {
          const { data: newGroup, error: createError } = await supabase
            .from('groups')
            .insert([{ owner_id: user.id }])
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          const { error: memberError } = await supabase
            .from('group_members')
            .insert([{
              group_id: newGroup.id,
              user_id: user.id,
              role: 'owner'
            }]);

          if (memberError) {
            throw memberError;
          }

          if (isSubscribed) {
            setGroups([{ ...newGroup, role: 'owner' }]);
            setLoading(false);
          }
          return;
        }

        const groupIds = memberships.map(m => m.group_id);
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds);

        if (groupsError) {
          throw groupsError;
        }

        const groupsWithRoles = groupsData.map(group => ({
          ...group,
          role: memberships.find(m => m.group_id === group.id)?.role
        }));

        if (isSubscribed) {
          setGroups(groupsWithRoles);
        }
      } catch (err) {
        console.error('Error in useGroups:', err);
        if (isSubscribed) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(fetchGroups, retryDelay * retryCount);
          } else {
            setError('Unable to load groups. Please try again later.');
            setGroups([]);
          }
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchGroups();

    return () => {
      isSubscribed = false;
    };
  }, []);

  return { groups, loading, error };
}
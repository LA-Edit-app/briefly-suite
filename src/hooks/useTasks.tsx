import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAgencyId } from "./useDatabase";
import { useCreateNotification } from "./useNotifications";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

type TaskWithRelations = Task & {
  assignee: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
};

export const useTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TaskWithRelations[];
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { data: agencyId } = useAgencyId();
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...task,
          agency_id: task.agency_id ?? agencyId ?? undefined,
          created_by: task.created_by ?? user?.id ?? undefined,
        })
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      // Trigger notification if task is assigned to someone else
      if (data.assigned_to && data.assigned_to !== data.created_by) {
        const assigneeName = data.assignee?.first_name && data.assignee?.last_name 
          ? `${data.assignee.first_name} ${data.assignee.last_name}`
          : data.assignee?.email || 'Team member';
        
        createNotification.mutate({
          type: 'task_assignment',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${data.title}".`,
          userIds: [data.assigned_to], // Only notify the assigned user
          data: {
            taskId: data.id,
            taskTitle: data.title,
            dueDate: data.due_date,
            action: 'assigned'
          }
        });
      }
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      // Get the current task data to compare changes
      const { data: currentTask } = await supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq("id", id)
        .single();
      
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      return { data, currentTask, updates, userId: session?.user.id };
    },
    // Show the change straight away; roll back if the save fails.
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<TaskWithRelations[]>(["tasks"]);
      queryClient.setQueryData<TaskWithRelations[]>(["tasks"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...updates } as TaskWithRelations : t))
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks"], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onSuccess: ({ data, currentTask, updates, userId }) => {
      // Check if task was newly assigned or reassigned (to someone else)
      if (
        updates.assigned_to &&
        updates.assigned_to !== currentTask?.assigned_to &&
        updates.assigned_to !== userId
      ) {
        createNotification.mutate({
          type: 'task_assignment',
          title: 'Task Assigned to You',
          message: `You have been assigned the task: "${data.title}".`,
          userIds: [updates.assigned_to],
          data: {
            taskId: data.id,
            taskTitle: data.title,
            dueDate: data.due_date,
            action: 'reassigned'
          }
        });
      }
      
      // Check if task was completed (status "done", or the legacy completed flag)
      const nowDone = updates.status === 'done' || updates.completed === true;
      if (nowDone && currentTask?.status !== 'done') {
        // Notify team that task was completed
        createNotification.mutate({
          type: 'task_assignment',
          title: 'Task Completed',
          message: `Task "${data.title}" has been completed.`,
          data: {
            taskId: data.id,
            taskTitle: data.title,
            completedBy: data.assignee?.first_name && data.assignee?.last_name 
              ? `${data.assignee.first_name} ${data.assignee.last_name}`
              : data.assignee?.email || 'Team member',
            action: 'completed'
          }
        });
      }
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

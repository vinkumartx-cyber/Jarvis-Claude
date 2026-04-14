'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Trash2, AlertCircle } from 'lucide-react';
import Badge from './ui/Badge';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  priority: 'high' | 'medium' | 'low';
  list: string;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks?limit=10');
        const data = await response.json();
        setTasks(data.tasks || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: !completed } : task
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
    }
  };

  const formatDueDate = (date?: Date) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dueDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (dueDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="text-gray-400 text-sm">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
        <p className="text-sm text-gray-400">All caught up! No tasks pending.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            'group flex items-start gap-3 rounded-lg p-3 border transition-all duration-300',
            task.completed
              ? 'border-white/5 bg-white/[0.02] opacity-60 hover:opacity-100'
              : 'border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]',
            isOverdue(task) && 'border-red-500/30 bg-red-500/10'
          )}
        >
          <button
            onClick={() => toggleTask(task.id, task.completed)}
            className="mt-1 flex-shrink-0 text-gray-400 hover:text-blue-400 transition-colors"
          >
            {task.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                'text-sm font-medium transition-all',
                task.completed ? 'line-through text-gray-500' : 'text-white'
              )}
            >
              {task.title}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant={getPriorityColor(task.priority)} size="sm">
                {task.priority}
              </Badge>
              {task.dueDate && (
                <span
                  className={cn(
                    'text-xs',
                    isOverdue(task) ? 'text-red-400 font-semibold' : 'text-gray-400'
                  )}
                >
                  {formatDueDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>

          {isOverdue(task) && (
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
          )}

          <button
            onClick={() => deleteTask(task.id)}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-500 hover:text-red-400 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default TaskList;

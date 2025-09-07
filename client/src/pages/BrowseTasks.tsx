// client/src/pages/BrowseTasks.tsx
import React, { useState } from "react";
import { useQuery } from "react-query";
import { tasksApi } from "../services/api";
import { TaskCategory } from "../types";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { DollarSign, Search, Briefcase } from "lucide-react";

const BrowseTasks: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">(
    "all"
  );

  const { data: tasks = [], isLoading } = useQuery("tasks", () =>
    tasksApi.getAll().then((res) => res.data.data!)
  );

  const filteredTasks = tasks
    .filter((task) => task.status === "open") // Only show open tasks
    .filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(
      (task) => categoryFilter === "all" || task.category === categoryFilter
    );

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Browse Projects</h1>
      <p className="text-gray-500 mb-6">
        Find your next opportunity. There are currently {filteredTasks.length}{" "}
        open projects.
      </p>

      {/* --- FILTERS --- */}
      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as TaskCategory | "all")
          }
          className="border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Categories</option>
          {Object.values(TaskCategory).map((cat) => (
            <option key={cat} value={cat}>
              {cat
                .replace(/_/g, " ")
                .split(" ")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")}
            </option>
          ))}
        </select>
      </div>

      {/* --- TASK LIST --- */}
      {isLoading ? (
        <p>Loading projects...</p>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Link
              to={`/task/${task.id}`}
              key={task.id}
              className="block bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-indigo-700">
                    {task.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Posted by {task.client?.firstName} {task.client?.lastName}{" "}
                    &middot; Due by{" "}
                    {format(new Date(task.deadline), "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="mt-4 md:mt-0 md:text-right">
                  <p className="text-lg font-bold text-green-600 flex items-center justify-start md:justify-end">
                    <DollarSign className="h-5 w-5" /> {task.budget}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    {task.budgetType} rate
                  </p>
                </div>
              </div>
              <p className="text-gray-600 mt-4 line-clamp-2">
                {task.description}
              </p>
            </Link>
          ))}
          {filteredTasks.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg border">
              <Briefcase className="h-12 w-12 mx-auto text-gray-300" />
              <h3 className="mt-2 text-lg font-medium text-gray-800">
                No projects found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrowseTasks;

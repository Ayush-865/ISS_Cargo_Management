"use client";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { User, Clock, ArrowRight } from "lucide-react";

// Define action types with labels for display
const actionTypes = [
  { value: "placement", label: "Placement" },
  { value: "rearrangement", label: "Rearrangement" },
  { value: "retrieval", label: "Retrieval" },
  { value: "update_location", label: "Update" },
  { value: "disposal_plan", label: "Disposal Plan" },
  { value: "disposal_complete", label: "Disposal Complete" },
  { value: "simulation_use", label: "Simulation Use" },
  { value: "simulation_expired", label: "Expired" },
  { value: "simulation_depleted", label: "Depleted" },
  { value: "import", label: "Import" },
  { value: "export", label: "Export" },
];

// Action badge styling
const getActionBadge = (actionType: string) => {
  const action = actionTypes.find((a) => a.value === actionType);
  const label = action ? action.label : actionType;
  const styles: Record<string, string> = {
    placement: "bg-emerald-600",
    rearrangement: "bg-amber-500",
    retrieval: "bg-blue-500",
    update_location: "bg-purple-500",
    disposal_plan: "bg-rose-600",
    disposal_complete: "bg-rose-700",
    simulation_use: "bg-indigo-500",
    simulation_expired: "bg-red-600",
    simulation_depleted: "bg-red-700",
    import: "bg-green-600",
    export: "bg-cyan-500",
  };
  const style = styles[actionType] || "bg-gray-600";
  return (
    <div
      className={`px-3 py-1 rounded-full ${style} text-white text-xs font-medium inline-flex items-center`}
    >
      {label}
    </div>
  );
};

// Row styling
const getRowStyle = (actionType: string) => {
  const styles: Record<string, string> = {
    placement: "border-l-4 border-emerald-500 hover:bg-emerald-600/30",
    rearrangement: "border-l-4 border-amber-500 hover:bg-amber-600/30",
    retrieval: "border-l-4 border-blue-500 hover:bg-blue-600/30",
    update_location: "border-l-4 border-purple-500 hover:bg-purple-600/30",
    disposal_plan: "border-l-4 border-rose-500 hover:bg-rose-600/30",
    disposal_complete: "border-l-4 border-rose-700 hover:bg-rose-700/30",
    simulation_use: "border-l-4 border-indigo-500 hover:bg-indigo-600/30",
    simulation_expired: "border-l-4 border-red-500 hover:bg-red-600/30",
    simulation_depleted: "border-l-4 border-red-700 hover:bg-red-700/30",
    import: "border-l-4 border-green-500 hover:bg-green-600/30",
    export: "border-l-4 border-cyan-500 hover:bg-cyan-600/30",
  };
  return styles[actionType] || "border-l-4 border-gray-500 hover:bg-gray-700";
};

// Define Log interface
interface Log {
  actionType: string;
  details: Record<string, any>;
  itemId: string | null;
  timestamp: string;
  userId: string | null;
}

// Dynamic details display with improved UI
const getDetails = (actionType: string, details: Record<string, any>) => {
  switch (actionType) {
    case "update_location":
      return (
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-gray-700 text-white rounded">
            {details.fromContainer || "Unknown"}
          </span>
          <ArrowRight size={16} className="text-gray-400" />
          <span className="px-2 py-1 bg-gray-700 text-white rounded">
            {details.toContainer || "Unknown"}
          </span>
        </div>
      );
    case "placement":
    case "retrieval":
      return (
        <div className="space-y-2">
          <span className="px-2 py-1 bg-gray-700 text-white rounded">
            {details.containerId || "Unknown"}
          </span>
          {details.position && (
            <div className="text-sm text-gray-400">
              ({details.position.startCoordinates?.width || 0},{" "}
              {details.position.startCoordinates?.height || 0},{" "}
              {details.position.startCoordinates?.depth || 0}){" to "}(
              {details.position.endCoordinates?.width || 0},{" "}
              {details.position.endCoordinates?.height || 0},{" "}
              {details.position.endCoordinates?.depth || 0})
            </div>
          )}
          {details.remainingUses !== undefined && (
            <div className="text-sm text-gray-400">
              Uses Left: {details.remainingUses}
            </div>
          )}
          {details.status_after && (
            <div className="text-sm text-gray-400">
              Status: {details.status_after}
            </div>
          )}
        </div>
      );
    case "simulation_expired":
      const reason = details.reason || "";
      const match = reason.match(
        /Expiry date (\d{4}-\d{2}-\d{2}) \d{2}:\d{2}:\d{2} reached at (\d{4}-\d{2}-\d{2}) \d{2}:\d{2}:\d{2}/
      );
      if (match) {
        const [, expiryDate, checkDate] = match;
        return (
          <div className="space-y-2">
            <div>
              <span className="px-2 py-1 bg-red-600 text-white rounded">
                {expiryDate}
              </span>
            </div>
            <div>
              <span className="px-2 py-1 bg-gray-700 text-white rounded">
                {checkDate}
              </span>
            </div>
          </div>
        );
      }
      return <div className="text-gray-400">{reason}</div>;
    case "export":
      return (
        <div className="space-y-2">
          {details.exportType === "items" ? (
            <div>Exported {details.itemCount || 0} items</div>
          ) : details.exportType === "containers" ? (
            <div>Exported {details.containerCount || 0} containers</div>
          ) : (
            <div>Exported data</div>
          )}
        </div>
      );
    default:
      return (
        <div className="space-y-1">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="font-medium text-gray-300">{key}:</span>{" "}
              {JSON.stringify(value)}
            </div>
          ))}
        </div>
      );
  }
};

// Format timestamp
const formatTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    return {
      date: format(date, "MMM dd, yyyy"),
      time: format(date, "HH:mm:ss"),
    };
  } catch (e) {
    return { date: "Invalid date", time: "" };
  }
};

export default function LogsTable() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [itemId, setItemId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [actionType, setActionType] = useState<string>("");
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/logs`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch logs");
        }
        const data: { logs: Log[] } = await response.json();
        setLogs(data.logs);
        setFilteredLogs(data.logs);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const applyFilters = () => {
    let filtered = [...logs];
    if (startDate) {
      const start = `${startDate}T00:00:00Z`;
      filtered = filtered.filter((log) => log.timestamp >= start);
    }
    if (endDate) {
      const end = `${endDate}T23:59:59Z`;
      filtered = filtered.filter((log) => log.timestamp <= end);
    }
    if (itemId) {
      filtered = filtered.filter((log) => log.itemId === itemId);
    }
    if (userId) {
      filtered = filtered.filter((log) => log.userId === userId);
    }
    if (actionType) {
      filtered = filtered.filter((log) => log.actionType === actionType);
    }
    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setItemId("");
    setUserId("");
    setActionType("");
    setFilteredLogs(logs);
  };

  if (loading) {
    return <div className="text-gray-100">Loading logs...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full h-full bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-indigo-500 flex items-center justify-center">
            <Clock size={18} className="text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Activity Logs
          </h2>
        </div>
        <div className="text-md px-3 mr-2 py-1 rounded-md bg-gray-700 text-gray-300">
          {filteredLogs.length} entries
        </div>
      </div>

      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Item ID
            </label>
            <input
              type="text"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
            >
              <option value="">All</option>
              {actionTypes.map((action) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={applyFilters}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
              Filter
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {filteredLogs.length > 0 ? (
          <table className="w-full table-auto">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 text-gray-300 border-b border-gray-700">
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center space-x-2">
                    <Clock size={14} />
                    <span>Timestamp</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center space-x-2">
                    <User size={14} />
                    <span>User</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => {
                const { date, time } = formatTimestamp(log.timestamp);
                return (
                  <tr
                    key={index}
                    className={`${getRowStyle(
                      log.actionType
                    )} transition-all duration-150`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{date}</div>
                      <div className="text-xs text-gray-400">{time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span>{log.userId || "System"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getActionBadge(log.actionType)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">
                        {log.itemId || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getDetails(log.actionType, log.details)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-screen py-10">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
              <Clock size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-300 mb-2">
              No logs to display
            </h3>
            <p className="text-sm text-gray-400">
              {startDate || endDate || itemId || userId || actionType
                ? "Try adjusting your filters to see more results"
                : "There are no activity logs in the system yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

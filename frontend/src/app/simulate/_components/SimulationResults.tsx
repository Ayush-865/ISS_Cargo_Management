"use client";
import React from "react";
import {
  Clock,
  Package,
  Zap,
  AlertTriangle,
  Award,
  Search,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";

interface SimulationResponse {
  success: boolean;
  newDate: string;
  changes: {
    itemsUsed: { itemId: string; name: string; remainingUses: number }[];
    itemsExpired: { itemId: string; name: string }[];
    itemsDepletedToday: { itemId: string; name: string }[];
  };
}

interface SimulationResultsProps {
  simulationResult: SimulationResponse | null;
  filter: "itemsUsed" | "itemsExpired" | "itemsDepletedToday";
  setFilter: React.Dispatch<
    React.SetStateAction<"itemsUsed" | "itemsExpired" | "itemsDepletedToday">
  >;
}

const formatTimestamp = (timestamp: string): { date: string; time: string } => {
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

export function SimulationResults({
  simulationResult,
  filter,
  setFilter,
}: SimulationResultsProps) {
  const getFilterIcon = (filterType: string) => {
    switch (filterType) {
      case "itemsUsed":
        return <Zap size={16} />;
      case "itemsExpired":
        return <AlertTriangle size={16} />;
      case "itemsDepletedToday":
        return <Award size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-64">
      {simulationResult ? (
        <>
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setFilter("itemsUsed")}
              className={`px-4 py-3 rounded-md flex items-center gap-2 transition-all duration-200 border-2 ${
                filter === "itemsUsed"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-700/20 border-indigo-700"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 border-gray-700"
              }`}
            >
              <Zap size={16} />
              <span>Items Used</span>
            </button>
            <button
              onClick={() => setFilter("itemsExpired")}
              className={`px-4 py-3 rounded-md flex items-center gap-2 transition-all duration-200 border-2 ${
                filter === "itemsExpired"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-700/20 border-amber-700"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 border-gray-700"
              }`}
            >
              <AlertTriangle size={16} />
              <span>Items Expired</span>
            </button>
            <button
              onClick={() => setFilter("itemsDepletedToday")}
              className={`px-4 py-3 rounded-md flex items-center gap-2 transition-all duration-200 border-2 ${
                filter === "itemsDepletedToday"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-700/20 border-rose-700"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 border-gray-700"
              }`}
            >
              <Award size={16} />
              <span>Items Depleted Today</span>
            </button>
          </div>

          <div className="overflow-x-auto bg-gray-800 rounded-md border-2 border-gray-700 shadow-xl">
            <table className="w-full table-auto">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-800 text-gray-300 border-b-2 border-gray-700">
                  <th className="px-6 py-4 text-left font-medium">
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-indigo-400" />
                      <span>Timestamp</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left font-medium">
                    <div className="flex items-center space-x-2">
                      <Package size={16} className="text-indigo-400" />
                      <span>Item</span>
                    </div>
                  </th>
                  {filter === "itemsUsed" && (
                    <th className="px-6 py-4 text-left font-medium">
                      <div className="flex items-center space-x-2">
                        {getFilterIcon(filter)}
                        <span>Remaining Uses</span>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {simulationResult.changes[filter].length > 0 ? (
                  simulationResult.changes[filter].map((item, index) => {
                    const { date, time } = formatTimestamp(
                      simulationResult.newDate
                    );
                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-700 hover:bg-gray-700 transition-all duration-200"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium">{date}</div>
                          <div className="text-xs text-gray-400">{time}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className="font-mono text-xs px-2 py-1 rounded-md bg-gray-700 text-gray-300 mr-2 border border-gray-600">
                              {item.itemId}
                            </span>
                            <span className="text-gray-100">{item.name}</span>
                          </div>
                        </td>
                        {filter === "itemsUsed" && "remainingUses" in item && (
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div
                                className={`px-3 py-1 rounded-md ${
                                  item.remainingUses > 3
                                    ? "bg-green-500/20 text-green-300 border border-green-700"
                                    : item.remainingUses > 1
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-700"
                                    : "bg-red-500/20 text-red-300 border border-red-700"
                                }`}
                              >
                                {item.remainingUses}
                              </div>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={filter === "itemsUsed" ? 3 : 2}
                      className="px-6 py-10"
                    >
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-md bg-gray-800 flex items-center justify-center mb-4 border-2 border-gray-700">
                          {getFilterIcon(filter)}
                        </div>
                        <p className="text-gray-400 text-lg">No items found</p>
                        <p className="text-gray-500 text-sm max-w-md mt-2">
                          There are no{" "}
                          {filter === "itemsUsed"
                            ? "used"
                            : filter === "itemsExpired"
                            ? "expired"
                            : "depleted"}{" "}
                          items in this simulation.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <h3 className="text-xl font-medium text-gray-200 mb-3">
            No Simulation Data
          </h3>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Select items and a future date, then click the Simulate button to
            see the projected item usage.
          </p>
          <div className="flex flex-col gap-4 w-full max-w-md">
            <div className="flex items-center gap-3 bg-gray-800 rounded-md p-5 border-2 border-gray-700">
              <Search size={20} className="text-indigo-400" />
              <div className="text-left">
                <p className="text-gray-300">Search Items</p>
                <p className="text-xs text-gray-500">
                  Find and select the items you want to simulate
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-md p-5 border-2 border-gray-700">
              <CalendarIcon size={20} className="text-indigo-400" />
              <div className="text-left">
                <p className="text-gray-300">Pick a Date</p>
                <p className="text-xs text-gray-500">
                  Select a future date for the simulation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-md p-5 border-2 border-gray-700">
              <Zap size={20} className="text-indigo-400" />
              <div className="text-left">
                <p className="text-gray-300">Run Simulation</p>
                <p className="text-xs text-gray-500">
                  View detailed results about your items
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

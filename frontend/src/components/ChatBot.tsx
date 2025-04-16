"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, User, Loader2, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";

// Status messages for the chatbot
enum StatusMessage {
  UNDERSTANDING = "Understanding your query...",
  FETCHING = "Retrieving data from knowledge base...",
  SUMMARIZING = "Summarizing the data...",
  ERROR = "Sorry, I encountered an error processing your request.",
}

type Message = {
  role: "user" | "assistant" | "status";
  content: string;
  timestamp?: Date;
};

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your ISS Stowage Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000";
  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

  // Scroll to bottom of messages whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when chat is opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [open]);

  // Function to call Gemini API for natural language understanding
  const callGeminiApi = async (prompt: string) => {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Gemini API call failed with status: ${response.status}`
        );
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  };

  // Function to interpret the user query using Gemini
  const interpretQuery = async (query: string) => {
    const prompt = `
You are a stowage advisor assistant for the International Space Station.
Given the following user query, determine which API endpoint should be called. Respond in JSON format.

Available endpoints:
1. Placement Recommendations: POST /api/placement
   (Receive a list of items and containers and return placements and any rearrangements.)
2. Item Search and Retrieval: GET /api/search (with 'itemName' or 'itemId' parameter)
   (Return item details and retrieval steps.)
3. Item Retrieval: POST /api/retrieve
   (Execute an item retrieval operation.)
4. Waste Management - Identify Expiring Items: GET /api/waste/identify?days=X
   (Identify items expiring in X days.)
5. Waste Management - Return Plan: POST /api/waste/return-plan
   (Create a return plan for waste items.)
6. Waste Management - Complete Undocking: POST /api/waste/complete-undocking
   (Complete the waste return process.)
7. Time Simulation: POST /api/simulate/day
   (Simulate day changes and track item usage/expiry.)
8. Import/Export: Various endpoints for importing and exporting data.
9. Logs: GET /api/logs
   (Fetch logs for placement, retrieval, rearrangement, or disposal actions.)

For general informational queries that don't require an API call (like explaining concepts, introducing yourself, etc.), respond with {"isGeneralQuery": true}.

User query: "${query}"

Respond with ONLY the JSON object without any markdown formatting, explanations or code blocks. Just the raw JSON:
{
  "endpoint": "/api/endpoint/path",
  "method": "GET or POST",
  "params": {}, // For GET requests with query parameters
  "payload": {} // For POST requests with body data
}

Or for general conversational queries:
{
  "isGeneralQuery": true
}

Extract relevant parameters or payload data from the query when possible. For example, if the query is about items expiring in 10 days, set params to {"days": 10}. If no specific data is found, provide reasonable empty structures.
`;

    try {
      const response = await callGeminiApi(prompt);

      // Extract JSON from potential markdown formatting
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract valid JSON from Gemini response");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Error interpreting query:", error);

      // Fallback to treating it as a general query
      return {
        isGeneralQuery: true,
      };
    }
  };

  // Function to handle general conversation queries directly with Gemini
  const handleGeneralQuery = async (query: string) => {
    const prompt = `
You are a stowage advisor assistant for the International Space Station. Your name is ISS Stowage Assistant.
You help astronauts manage cargo, inventory, and supplies on the space station.

Please respond to this general query from the user:
"${query}"

Keep your response concise, helpful and conversational. If the query is about yourself, explain that you're
an AI assistant specializing in ISS inventory management and stowage. For other general queries, provide
brief but accurate information. You may use markdown for formatting.
`;
    try {
      return await callGeminiApi(prompt);
    } catch (error) {
      console.error("Error handling general query:", error);
      return "I'm sorry, I encountered an error while processing your request. I'm the ISS Stowage Assistant, designed to help with inventory management on the space station. How else can I assist you today?";
    }
  };

  // Function to summarize the API results using Gemini
  const summarizeResults = async (
    query: string,
    apiResponse: any,
    endpoint: string
  ) => {
    const prompt = `
You are a stowage advisor assistant for the International Space Station.
Summarize the following API response in a clear, concise way that answers the user's original query.
Write in a helpful, professional tone and format the response nicely with markdown if appropriate.

User query: "${query}"

API endpoint used: ${endpoint}

API response: 
${JSON.stringify(apiResponse, null, 2)}

Provide a summary that:
1. Directly addresses the user's question
2. Highlights the most important information
3. Presents numerical data clearly
4. Uses bullet points for lists when appropriate
5. Is easy for astronauts to understand quickly

Don't mention anything about the API, endpoints, or technical implementation details in your summary.
`;

    try {
      return await callGeminiApi(prompt);
    } catch (error) {
      console.error("Error summarizing results:", error);
      throw error;
    }
  };

  // Main handler for processing user queries
  const processUserQuery = async (query: string) => {
    try {
      // Step 1: Understanding the query using Gemini
      setMessages((prev) => [
        ...prev,
        { role: "status", content: StatusMessage.UNDERSTANDING },
      ]);
      const interpretation = await interpretQuery(query);

      // Check if this is a general query that doesn't need API calls
      if (interpretation.isGeneralQuery) {
        // Handle general conversation directly with Gemini
        const response = await handleGeneralQuery(query);
        return response;
      }

      // Step 2: Fetching results from the appropriate API
      setMessages((prev) => [
        ...prev,
        { role: "status", content: StatusMessage.FETCHING },
      ]);

      // Make sure interpretation has valid values to prevent null errors
      const endpoint = interpretation.endpoint || "/api/search";
      const method = interpretation.method || "GET";
      const params = interpretation.params || {};
      const payload = interpretation.payload || {};

      let apiResponse;
      try {
        apiResponse = await callApi(endpoint, method, params, payload);
      } catch (error) {
        console.error("API call failed:", error);
        // For demo/testing purposes, generate mock data when APIs aren't available
        if (endpoint.includes("waste/identify")) {
          const days = params?.days || 10;
          apiResponse = {
            items: Array.from(
              { length: Math.floor(Math.random() * 15) },
              (_, i) => ({
                id: `item-${i + 1}`,
                name: `Test Item ${i + 1}`,
                expiryDate: new Date(
                  Date.now() + (days - Math.random() * 5) * 86400000
                ).toISOString(),
              })
            ),
          };
        } else {
          // Return mock data for testing
          apiResponse = {
            success: true,
            message:
              "This is mock data since the API endpoint is not available.",
          };
        }
      }

      // Step 3: Summarizing results using Gemini
      setMessages((prev) => [
        ...prev,
        { role: "status", content: StatusMessage.SUMMARIZING },
      ]);
      const summary = await summarizeResults(query, apiResponse, endpoint);

      // Return the final summarized response
      return summary;
    } catch (error) {
      console.error("Error processing query:", error);
      return StatusMessage.ERROR;
    }
  };

  // Function to call the relevant API and get response
  const callApi = async (
    endpoint: string,
    method: string,
    params?: any,
    payload?: any
  ) => {
    try {
      // Validate endpoint to avoid URL parsing errors
      if (!endpoint || typeof endpoint !== "string") {
        throw new Error("Invalid endpoint provided");
      }

      // Construct URL with query parameters for GET requests
      let url = `${baseUrl}${endpoint}`;
      if (params && method === "GET") {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value as string);
          }
        });
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      }

      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (payload && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(payload);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API call error:", error);
      throw error;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (input.trim() === "") return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Set loading state
    setIsLoading(true);

    try {
      // Process the user query
      const response = await processUserQuery(input);

      // Add assistant message with the response
      const botMessage: Message = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      // Remove any status messages and add the final response
      setMessages((prev) =>
        prev.filter((msg) => msg.role !== "status").concat([botMessage])
      );
    } catch (error) {
      console.error("Error processing message:", error);
      setMessages((prev) =>
        prev
          .filter((msg) => msg.role !== "status")
          .concat([
            {
              role: "assistant",
              content:
                "Sorry, there was an error processing your request. Please try again later.",
              timestamp: new Date(),
            },
          ])
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Format time ago (e.g. "2 minutes ago")
  const formatTime = (date?: Date) => {
    if (!date) return "";
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!open ? (
        // Chat Button
        <Button
          onClick={() => setOpen(true)}
          className="rounded-full w-16 h-16 p-0 flex items-center justify-center shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-300 ease-in-out hover:scale-110"
        >
          <MessageSquare className="h-7 w-7" />
        </Button>
      ) : (
        // Expanded Chat Interface
        <div className="bg-gray-950 rounded-2xl shadow-2xl text-white w-96 md:w-[480px] h-[650px] flex flex-col overflow-hidden border border-gray-800 animate-enter">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-900 to-indigo-800 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-700 p-2 rounded-full">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  ISS Stowage Assistant
                </h2>
                <p className="text-xs text-indigo-200">
                  Space Station Inventory Management
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-full hover:bg-indigo-700/30 text-indigo-200 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-950 to-gray-900 scrollbar-thin scrollbar-thumb-indigo-600/50 scrollbar-track-gray-900">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : message.role === "status"
                    ? "justify-center"
                    : "justify-start"
                } ${index > 0 ? "mt-4" : ""}`}
              >
                {message.role === "status" ? (
                  <div className="bg-gray-800/70 text-gray-300 px-4 py-2 rounded-full text-sm animate-pulse flex items-center space-x-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <div className="flex max-w-[85%] gap-2">
                    {message.role === "assistant" && (
                      <div className="flex flex-col items-center mt-1">
                        <div className="h-8 w-8 bg-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col">
                      <div
                        className={`rounded-2xl p-4 ${
                          message.role === "user"
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>

                      {message.timestamp && (
                        <span
                          className={`text-xs mt-1 text-gray-500 ${
                            message.role === "user" ? "text-right" : "text-left"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </span>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="flex flex-col items-center mt-1">
                        <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="flex flex-col items-center mt-1">
                    <div className="h-8 w-8 bg-indigo-700 rounded-lg flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none p-4 bg-gray-800 border border-gray-700">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 p-4 bg-gray-900 border-t border-gray-800"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about ISS inventory..."
              className="flex-1 bg-gray-800 border-gray-700 focus:border-indigo-500 focus:ring-indigo-500 text-white rounded-full py-6 px-4"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || input.trim() === ""}
              className={`rounded-full p-3 h-12 w-12 flex items-center justify-center ${
                input.trim() === "" || isLoading
                  ? "bg-gray-700 text-gray-400"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              } transition-colors`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>

          {/* Small footer */}
          <div className="bg-gray-950 py-2 px-4 text-center text-xs text-gray-500 border-t border-gray-800">
            ISS Stowage Assistant v2.0 | Created by Anthropic
          </div>
        </div>
      )}
    </div>
  );
}

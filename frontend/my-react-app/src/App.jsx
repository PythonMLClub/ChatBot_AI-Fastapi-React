import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";
import { FaPaperPlane } from "react-icons/fa";
import Header from "./Header";
import Footer from "./Footer";
import { HiMiniBars3BottomLeft } from "react-icons/hi2";
import { FiDownload } from "react-icons/fi";

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, LineChart, Line, ResponsiveContainer, Cell
} from "recharts";


const API_BASE_URL = "http://172.208.121.116:8001"; 

function App() {
  const databases = ["Farm", "Business", "Property","Customers"];
  const models = ["gpt-4"];

  const [selectedDB, setSelectedDB] = useState(databases[0]);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [followUp, setFollowUp] = useState(false);
  const [searchHistory, setSearchHistory] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const [queryResult, setQueryResult] = useState([]);
  const [xAxisKey, setXAxisKey] = useState("");  // X-axis column
  const [yAxisKey, setYAxisKey] = useState("");  // Y-axis column
  const [selectedChartType, setSelectedChartType] = useState("BarChart");

  const formatCurrency = (value) => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`; // Billion
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`; // Million
    } else if (value >= 100_000) {
      return `$${(value / 100_000).toFixed(2)}L`; // Lakh (for Indian data)
    } else {
      return `$${value.toLocaleString()}`;
    }
  };


  useEffect(() => {
    if (queryResult.length > 0) {
      // Dynamically detect the X and Y axis keys
      const columns = Object.keys(queryResult[0]);

      // X-axis should be the first string column (COMPANY)
      const xAxisCandidate = columns.find(col => typeof queryResult[0][col] === "string");

      // Y-axis should be the first numerical column (REVENUE)
      const yAxisCandidate = columns.find(col => typeof queryResult[0][col] === "number");

      setXAxisKey(xAxisCandidate);
      setYAxisKey(yAxisCandidate);
    }
  }, [queryResult]);

  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem("searchHistory")) || {};
    setSearchHistory(storedHistory);
  }, []);

  const removeSearchHistory = (date, index) => {
    setSearchHistory((prevHistory) => {
      const updatedHistory = { ...prevHistory };

      // Remove specific item from the array
      updatedHistory[date].splice(index, 1);

      // If no more items exist for that date, remove the date entry
      if (updatedHistory[date].length === 0) {
        delete updatedHistory[date];
      }

      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const chartTypes = ["BarChart", "PieChart", "LineChart"];
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { // Check if Enter is pressed without Shift (no new line)
      e.preventDefault(); // Prevent the new line from being added
      handleQuerySubmit(); // Trigger the submit function
    }
  };
  const handleQuerySubmit = async () => {
    if (!query.trim()) {
      alert("Please enter a question.");
      return;
    }
  
    setLoading(true);
  
    const previousQuery = followUp && chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].question : "";
  
    // **Determine the next chart type**
    let nextChartType = "BarChart"; // Default to BarChart
    if (chatHistory.length > 0) {
      // Get the last used chart type and switch to the next one
      const lastChartType = chatHistory[chatHistory.length - 1].selectedChartType;
      const nextIndex = (chartTypes.indexOf(lastChartType) + 1) % chartTypes.length;
      nextChartType = chartTypes[nextIndex];
    }
  
    // Add "Processing..." placeholder
    setChatHistory(prevChatHistory => [...prevChatHistory, {
      question: query.trim(),
      aiResponse: "Processing...",
      queryResult: [],
      selectedChartType: nextChartType,
      xAxisKey: "",
      yAxisKey: ""
    }]);
  
    setQuery("");
  
    const requestData = {
      database: selectedDB,
      query: query,
      model: selectedModel,
      follow_up: followUp,
      previous_query: previousQuery,
    };
  
    console.log("🚀 Sending Request:", requestData);
  
    try {
      // Generate SQL query
      const generateResponse = await axios.post(`${API_BASE_URL}/generate_sql/`, requestData);
      const sqlQuery = generateResponse.data.sql_query;
  
      console.log("✅ Generated SQL Query:", sqlQuery);
  
      // Execute SQL
      const executeResponse = await axios.post(`${API_BASE_URL}/execute_sql/`, {
        database: selectedDB,
        query: sqlQuery,
        model: selectedModel,
        previous_query: query,
      });
  
      console.log("✅ Full API Response:", executeResponse.data);
  
      const aiResponse = executeResponse.data.response || "⚠️ No response received.";
      const resultData = executeResponse.data.chart_data || [];
  
      // Extract axis keys dynamically
      let xAxisCandidate = "", yAxisCandidate = "";
      if (resultData.length > 0) {
        const columns = Object.keys(resultData[0]);
        xAxisCandidate = columns.find(col => typeof resultData[0][col] === "string") || "";
        yAxisCandidate = columns.find(col => typeof resultData[0][col] === "number") || "";
      }
  
      console.log("📊 Final Chart Data | X-Axis:", xAxisCandidate, "| Y-Axis:", yAxisCandidate);
  
      // ✅ Update chatHistory properly
      setChatHistory(prevChatHistory => {
        const updatedChatHistory = [...prevChatHistory];
        updatedChatHistory[updatedChatHistory.length - 1] = {
          question: query,
          aiResponse,
          queryResult: resultData,
          xAxisKey: xAxisCandidate,
          yAxisKey: yAxisCandidate,
          selectedChartType: nextChartType
        };
        return updatedChatHistory;
      });
  
      // Save to search history after updating chatHistory
      saveSearchHistory(query, aiResponse, resultData, xAxisCandidate, yAxisCandidate, nextChartType);
  
    } catch (error) {
      console.error("AxiosError:", error.response?.data || error.message);
      setChatHistory(prevChatHistory => {
        const updatedChatHistory = [...prevChatHistory];
        updatedChatHistory[updatedChatHistory.length - 1].aiResponse = `⚠️ Error: ${error.response?.data.detail || error.message}`;
        return updatedChatHistory;
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSearchHistory = (question, aiResponse, queryResult, xAxisKey, yAxisKey, selectedChartType) => {
    const today = new Date().toISOString().split("T")[0];
    setSearchHistory((prevHistory) => {
      const updatedHistory = { ...prevHistory };
  
      if (!updatedHistory[today]) {
        updatedHistory[today] = [];
      }
  
      const existingQuestions = updatedHistory[today].map((entry) => entry.question);
      if (!existingQuestions.includes(question)) {
        updatedHistory[today].push({ question, aiResponse, queryResult, xAxisKey, yAxisKey, selectedChartType });
      }
  
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const loadSearchHistory = (question, aiResponse, queryResult, selectedChartType, xAxisKey, yAxisKey) => {
    setChatHistory([{
      question, 
      aiResponse,
      queryResult,
      selectedChartType,
      xAxisKey,
      yAxisKey
    }]);
  };

  const getFormattedDate = (dateStr) => {
    const today = new Date();
    const searchDate = new Date(dateStr);
    const diff = (today - searchDate) / (1000 * 60 * 60 * 24);

    if (diff < 1 && today.getDate() === searchDate.getDate()) {
      return "Today";
    } else if (diff < 2 && today.getDate() - 1 === searchDate.getDate()) {
      return "Yesterday";
    } else {
      return searchDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const colors = [
    '#FF5733', '#FF8D1A', '#FFB833', '#FFD700', '#9ACD32',
    '#32CD32', '#00FA9A', '#00BFFF', '#1E90FF', '#8A2BE2'
  ];

  const downloadPDF = () => {
    const content = document.getElementById('scrollableDiv');
  
    if (!content) {
      console.error('scrollableDiv not found!');
      return;
    }
  
    const cloneContent = content.cloneNode(true);
  
    // Apply necessary styling to ensure all content is visible
    cloneContent.style.height = `${content.scrollHeight}px`;
    cloneContent.style.width = `${content.scrollWidth}px`;
    cloneContent.style.position = 'absolute';
    cloneContent.style.top = '0';
    cloneContent.style.left = '0';
    cloneContent.style.overflow = 'visible';
    cloneContent.style.zIndex = '9999';
  
    document.body.appendChild(cloneContent);
  
    html2canvas(cloneContent, {
      scrollX: 0,
      scrollY: 0,
      width: cloneContent.scrollWidth,
      height: cloneContent.scrollHeight,
      useCORS: true,
      logging: true,
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
  
      const a4Width = 595;
      const a4Height = 842;
  
      const originalAspectRatio = canvas.width / canvas.height;
      const a4AspectRatio = a4Width / a4Height;
  
      let targetWidth, targetHeight;
      let xOffset = 0, yOffset = 0;
  
      if (originalAspectRatio > a4AspectRatio) {
        // Original is wider, fit width, crop height
        targetWidth = a4Width;
        targetHeight = a4Width / originalAspectRatio;
        yOffset = (a4Height - targetHeight) / 2;
      } else {
        // Original is taller, fit height, crop width
        targetHeight = a4Height;
        targetWidth = a4Height * originalAspectRatio;
        xOffset = (a4Width - targetWidth) / 2;
      }
  
      const doc = new jsPDF('p', 'px', [a4Width, a4Height]);
      doc.addImage(imgData, 'PNG', xOffset, yOffset, targetWidth, targetHeight);
      doc.save('GLS02132583132.pdf');
      document.body.removeChild(cloneContent);
    });
  };

  const generateRandomColor = () => {
    let randomColor;
    let brightness;
  
    const maxBrightness = 0.3; // Adjust this value to control maximum brightness
    const minBrightness = 0.2; // To avoid complete black.
  
    do {
      randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  
      // Calculate brightness (simplified)
      const r = parseInt(randomColor.slice(1, 3), 16);
      const g = parseInt(randomColor.slice(3, 5), 16);
      const b = parseInt(randomColor.slice(5, 7), 16);
  
      brightness = (r + g + b) / (255 * 3);
  
    } while (brightness > maxBrightness || brightness < minBrightness);
  
    return randomColor;
  };
  const generatePieRandomColor = () => {
    let randomColor;
    let brightness;
  
    const maxBrightness = 0.3; // Adjust this value to control maximum brightness
    const minBrightness = 0.2; // To avoid complete black.
  
    do {
      randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  
      // Calculate brightness (simplified)
      const r = parseInt(randomColor.slice(1, 3), 16);
      const g = parseInt(randomColor.slice(3, 5), 16);
      const b = parseInt(randomColor.slice(5, 7), 16);
  
      brightness = (r + g + b) / (255 * 3);
  
    } while (brightness > maxBrightness || brightness < minBrightness);
  
    return randomColor;
  };
  
  const generateLineRandomColor = () => {
    let randomColor;
    let brightness;
  
    const maxBrightness = 0.3; // Adjust this value to control maximum brightness
    const minBrightness = 0.2; // To avoid complete black.
  
    do {
      randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  
      // Calculate brightness (simplified)
      const r = parseInt(randomColor.slice(1, 3), 16);
      const g = parseInt(randomColor.slice(3, 5), 16);
      const b = parseInt(randomColor.slice(5, 7), 16);
  
      brightness = (r + g + b) / (255 * 3);
  
    } while (brightness > maxBrightness || brightness < minBrightness);
  
    return randomColor;
  };
  console.log(chatHistory)
  return (
    <div className="flex h-full bg-[url('https://www.usfarmdata.com/Images_New/body-tail.gif')]">
      <div className="flex-grow w-7/10 relative">
        <div>
          <Header />
        </div>
        <div className="grow">
          <div className="flex">
            <div>
              <button className="sidebar-toggle" onClick={() => setSidebarVisible(!sidebarVisible)}>
                <HiMiniBars3BottomLeft className="bg-white text-black h-8 w-8 text-xl p-2 m-1 mt-3 rounded-md" />
              </button>
              <div className={`sidebar ${sidebarVisible ? "show" : "hide"}`}>

                {/* New Chat Button */}
                <button
                  className="new-chat-btn mt-8 font-custom"
                  onClick={() => {
                    setChatHistory([]);
                    localStorage.removeItem("chatHistory");
                    setQuery("");
                  }}
                >
                  + New Chat
                </button>

                {/* Search Box */}
                <input
                  className="search-box mt-3 text-sm"
                  placeholder="Search Chat history"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />


                {/* Follow-Up Toggle */}
                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="bg-transparent text-white accent-transparent mr-2"
                      checked={followUp}
                      onChange={() => setFollowUp(!followUp)}
                    />
                    Following Questions
                  </label>
                </div>

                <br></br>

                <div className="search-history-container">
                  {Object.keys(searchHistory)
                    .sort((a, b) => new Date(b) - new Date(a))
                    .map((date, index) => {
                      // Filter based on searchQuery (case-insensitive)
                      const filteredEntries = searchHistory[date].filter(entry =>
                        entry.question.toLowerCase().includes(searchQuery.toLowerCase())
                      );

                      // If no matching entries, do not render that date section
                      if (filteredEntries.length === 0) return null;

                      return (
                        <div key={index}>
                          <div className="history-date">{getFormattedDate(date)}</div>
                            <div className ="flex-tab-today">
                            {filteredEntries.map((entry, i) => (
                            
                                <div key={i} className="history-item">
                                    <span onClick={() => loadSearchHistory(entry.question, entry.aiResponse, entry.queryResult, entry.selectedChartType, entry.xAxisKey, entry.yAxisKey)}>
                                      {entry.question.slice(0, 30) + '...'}
                                    </span>
                                  <button className="remove-btn text-lg" onClick={() => removeSearchHistory(date, i)}>✖</button>
                                  <button className="text-lg ml-1 text-[#007bff] cursor-pointer" onClick={downloadPDF }><FiDownload  />
                                  </button>
                                </div>
                            
                            ))}
                            </div>
                        </div>
                      );
                    })}
                </div>

                {/* 🔹 Fixed Dropdown Section */}
                <div className="dropdown-section">
                  <label>Database:</label>
                  <select value={selectedDB} onChange={(e) => setSelectedDB(e.target.value)}>
                    {databases.map((db) => (
                      <option key={db} value={db}>{db}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="w-full">
              <div className={`chat-window ${sidebarVisible ? "sidebar-open" : "sidebar-closed"} min-w-[100%]`}>
                <div className="chat-history" id="scrollableDiv" >
                  {chatHistory.map((entry, index) => (
                    <div key={index} className="chat-item">
                      {/* ✅ Display User Query */}
                      <div className="user-message">
                        <p className="text-black text-base font-custom tracking-normal leading-[25px]">{entry.question}</p>
                      </div>

                      {/* ✅ Display AI Response */}
                      <div className="ai-response">
                        {loading && index === chatHistory.length - 1 ? (
                          <div className="loading-spinner"></div>
                         
                        ) : (
                         
                          <div
                            className="text-black text-base font-custom tracking-normal leading-[25px]"
                            dangerouslySetInnerHTML={{ __html: entry.aiResponse }}
                          ></div>

                        )}
                      </div>

                      
                      {/* ✅ Ensure `queryResult` is not empty before rendering chart */}
                      {entry.queryResult && entry.queryResult.length > 1 && entry.yAxisKey && (
                        <div className="chart-container text-sm">
                          <ResponsiveContainer width="100%" height={300} className='text-sm'>
                            {entry.selectedChartType === "BarChart" && (
                              <BarChart data={entry.queryResult} className="my-12 text-sm" barSize={entry.queryResult?.length < 5 ? 50 : 40} >
                                <XAxis
                                  dataKey={entry.xAxisKey || "Default_X"}
                                  angle={-25}
                                  textAnchor="end"
                                  interval={0}
                                  height={150}
                                  className="text-base"
                                  tick={{ fontSize: 13 }}
                                />
                                <YAxis tickFormatter={formatCurrency} width={70} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={formatCurrency} />
                                {/* <Bar dataKey={entry.yAxisKey || "Default_Y"} fill="#82ca9d" /> */}
                                <Bar dataKey={entry.yAxisKey || "Default_Y"}>
                                  {entry.queryResult.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={generateRandomColor()} />
                                  ))}
                                </Bar>
                              </BarChart>

                            )}

                            {/* {entry.selectedChartType === "PieChart" && (
                              entry.queryResult?.length > 10 ? (
                                <div className="warning-message" style={{ textAlign: "center", padding: "20px", fontSize: "18px", color: "gray" }}>
                                  Too many data points to display as a Pie chart.
                                </div>
                              ) : (
                                <PieChart className="my-12">
                                  <Pie
                                    data={entry.queryResult}
                                    dataKey={entry.yAxisKey || "Default_Y"}
                                    fill="#8884d8"
                                    label={({ name, value }) =>
                                      name !== "0" && name !== "" ? `${formatCurrency(value)}` : "" // ✅ Hide label if name is "0" or empty
                                    }
                                  >
                                    {entry.queryResult.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={generatePieRandomColor ()} /> 
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(value, name) => name !== "0" && name !== "" ? formatCurrency(value) : ""} // ✅ Hide tooltip if name is "0"
                                  />
                                </PieChart>
                              )
                            )} */}

                            {entry.selectedChartType === "PieChart" && (
                                    entry.queryResult?.length > 10 ? (
                                        <BarChart data={entry.queryResult} className="my-12 text-sm" barSize={entry.queryResult?.length < 5 ? 50 : 40}>
                                          <XAxis
                                            dataKey={entry.xAxisKey || "Default_X"}
                                            angle={-25}
                                            textAnchor="end"
                                            interval={0}
                                            height={150}
                                            className="text-base"
                                            tick={{ fontSize: 13 }}
                                          />
                                          <YAxis tickFormatter={formatCurrency} width={70} tick={{ fontSize: 12 }} />
                                          <Tooltip formatter={formatCurrency} />
                                          <Bar dataKey={entry.yAxisKey || "Default_Y"}>
                                            {entry.queryResult.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={generateRandomColor()} />
                                            ))}
                                          </Bar>
                                        </BarChart>
                                    ) : (
                                      // Show Pie chart if data is within the acceptable limit
                                      <PieChart className="my-12">
                                        <Pie
                                          data={entry.queryResult}
                                          dataKey={entry.yAxisKey || "Default_Y"}
                                          fill="#8884d8"
                                          label={({ name, value }) =>
                                            name !== "0" && name !== "" ? `${formatCurrency(value)}` : "" // ✅ Hide label if name is "0" or empty
                                          }
                                        >
                                          {entry.queryResult.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={generatePieRandomColor()} />
                                          ))}
                                        </Pie>
                                        <Tooltip
                                          formatter={(value, name) => name !== "0" && name !== "" ? formatCurrency(value) : ""} // ✅ Hide tooltip if name is "0"
                                        />
                                      </PieChart>
                                    )
                                  )}

                            {entry.selectedChartType === "LineChart" && (
                              <LineChart data={entry.queryResult} className="my-12 text-sm">
                                <XAxis
                                  dataKey={entry.xAxisKey || "Category"} // ✅ FIXED: Ensure correct category name
                                  tickFormatter={(value) => value || "Category"} // ✅ Ensure name displays
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={formatCurrency} />
                                <Line type="monotone" dataKey={entry.yAxisKey} stroke={generateLineRandomColor ()} />
                              </LineChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="min-w-2xl mx-auto flex mb-5 items-center space-x-2 rounded-xl p-3 border-t border-gray-200 shadow-lg mt-2 z-10">
                  <textarea
                    placeholder="Ask something about your data..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown} // Attach keydown listener
                    rows="1"
                    className="w-full p-2 border-none focus:ring-0 resize-none overflow-auto h-20 max-h-48 text-sm rounded-xl focus:outline-none"
                  />
                  <button
                    onClick={handleQuerySubmit}
                    disabled={loading}
                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <FaPaperPlane className="w-5 h-5 cursor-pointer" />
                    {/* )} */}
                  </button>
                </div>
                {/* </div> */}
              </div>
            </div>
          </div>
        </div>
        <div>
          <Footer />
        </div>
      </div>
    </div>

  );
}

export default App;

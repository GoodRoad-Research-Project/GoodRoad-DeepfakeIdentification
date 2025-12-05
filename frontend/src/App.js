import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import {
  Upload,
  FileVideo,
  CheckCircle,
  AlertTriangle,
  Activity,
  MapPin,
  Clock,
  CalendarDays, 
  Info,
  Eye,
  Trash2,
  X,
  Search,
  Filter,
  Moon,
  Sun,
  Loader2,
  CheckSquare,
  Square,
  Edit3,
  ShieldAlert,
  ClipboardCheck
} from "lucide-react";

// --- CONFIGURATION ---
const MAX_FILE_SIZE_MB = 50;
const MAX_DURATION_SECONDS = 120;
const API_URL = "http://localhost:5000/api";

const violationOptions = [
  { value: "red-light", label: "Running Red Light" },
  { value: "illegal-lane", label: "Illegal Lane Change" },
  { value: "reckless", label: "Reckless Driving" },
  { value: "parking", label: "Illegal Parking" },
  { value: "speeding", label: "Speeding / Racing" },
  { value: "other", label: "Other (Specify below)" },
];

const createInitialFormState = () => {
  const now = new Date();
  return {
    violationType: "",
    otherViolation: "",
    location: "",
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
    description: "",
  };
};

// --- HELPER TO TRUNCATE LONG FILE NAMES ---
const truncateFileName = (name, maxLength = 25) => {
  if (!name) return "";
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + ".....";
};

const getVideoDuration = (file) =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };

    video.onerror = () => {
      reject(new Error("Unable to load video metadata"));
    };
  });

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

const statusConfig = {
  uploaded: {
    label: "Queued",
    chipClass: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    ring: "bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
    icon: Activity,
  },
  analyzing: {
    label: "System Analyzing",
    chipClass: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    ring: "bg-purple-50 text-purple-600 animate-pulse dark:bg-purple-900/50 dark:text-purple-400",
    icon: Activity,
  },
  verified: {
    label: "Real Video",
    chipClass: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    ring: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
    icon: CheckCircle,
  },
  rejected: {
    label: "Fake Video",
    chipClass: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    ring: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
    icon: ShieldAlert,
  },
  error: {
    label: "Analysis Failed",
    chipClass: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    ring: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
    icon: AlertTriangle,
  }
};

const getDashboardHeadline = (submissions) => {
  if (!submissions.length) return "No submissions yet";
  const latest = submissions[0];
  if (latest.status === "analyzing") return "AI is verifying your latest upload";
  if (latest.status === "uploaded") return "Upload received – queued for AI screening";
  if (latest.status === "verified") return "Great! Latest dashcam clip is Real";
  if (latest.status === "rejected") return "Alert! Latest dashcam clip is Fake";
  return "Submission Dashboard";
};

// --- HELPER COMPONENT FOR STEPS ---
// This handles the visual logic: Gray -> Loading (Blue) -> Done (Green)
const StepItem = ({ stepNumber, currentStep, text }) => {
  let statusColor = "text-gray-400 dark:text-gray-500";
  let icon = <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px]">{stepNumber}</div>;

  if (currentStep > stepNumber) {
    // Completed
    statusColor = "text-green-600 dark:text-green-400 font-medium";
    icon = (
      <div className="w-5 h-5 rounded-full bg-green-50 dark:bg-green-900/20 border-2 border-green-600 dark:border-green-400 flex items-center justify-center">
        <CheckCircle size={12} />
      </div>
    );
  } else if (currentStep === stepNumber) {
    // Current / Loading
    statusColor = "text-blue-600 dark:text-blue-400 font-medium";
    icon = (
      <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-600 dark:border-blue-400 flex items-center justify-center">
        <Loader2 size={12} className="animate-spin" />
      </div>
    );
  }

  return (
    <li className={`flex items-center gap-3 ${statusColor} transition-all duration-300`}>
      {icon}
      {text}
    </li>
  );
};

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const [view, setView] = useState("submit");
  const [formData, setFormData] = useState(createInitialFormState);
  const [submissions, setSubmissions] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  
  const [isDurationLoading, setIsDurationLoading] = useState(false);
  
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- NEW STATE FOR PROGRESS STEPS ---
  const [currentStep, setCurrentStep] = useState(0); // 0 = idle, 1-5 = progress
  
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });
  
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [violationFilter, setViolationFilter] = useState("all");

  const isFormatValid = videoFile?.type === "video/mp4";
  const isDurationValid = videoDuration !== null && videoDuration < MAX_DURATION_SECONDS;
  
  const isGpsValid = (formData.location || "").trim().length > 0;
  const isViolationValid = formData.violationType === "other" 
    ? formData.otherViolation.trim().length > 0 
    : formData.violationType !== "";

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await axios.get(`${API_URL}/submissions`);
      setSubmissions(response.data);
    } catch (err) {
      console.error("Error connecting to backend:", err);
    }
  };

  const realCount = useMemo(
    () => submissions.filter((sub) => sub.status === "verified").length,
    [submissions]
  );

  const fakeCount = useMemo(
    () => submissions.filter((sub) => sub.status === "rejected").length,
    [submissions]
  );

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearch =
        searchQuery === "" ||
        submission.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.violationType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || submission.status === statusFilter;
      const matchesViolation = violationFilter === "all" || submission.violationType === violationFilter;

      return matchesSearch && matchesStatus && matchesViolation;
    });
  }, [submissions, searchQuery, statusFilter, violationFilter]);

  const handleSelect = (id) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = filteredSubmissions.map(s => s.id);
    const allVisibleSelected = visibleIds.every(id => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const newSet = new Set([...selectedIds, ...visibleIds]);
      setSelectedIds(Array.from(newSet));
    }
  };

  const isAllSelected = filteredSubmissions.length > 0 && filteredSubmissions.every(s => selectedIds.includes(s.id));

  const handleMetadataChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    setError("");
    setVideoDuration(null);

    if (!file) {
      setVideoFile(null);
      return;
    }
    if (file.type !== "video/mp4") {
      setError("Invalid format. Please upload MP4 only.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Limit is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setIsDurationLoading(true);
    try {
      const duration = await getVideoDuration(file);
      setVideoDuration(duration);
      if (duration > MAX_DURATION_SECONDS) {
        setError("Video exceeds 2 minute limit.");
        setVideoFile(null);
        return;
      }
      setVideoFile(file);
    } catch (fileError) {
      setError("Unable to read video metadata.");
      setVideoFile(null);
    } finally {
      setIsDurationLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!videoFile) {
      setError("Please attach a dashcam video.");
      return;
    }
    if (!videoDuration) {
      setError("Still validating video metadata. Please wait.");
      return;
    }

    // if (formData.violationType === "other" && formData.otherViolation.trim() === "") {
    //     setError("Please specify the violation type.");
    //     return;
    // }

    setIsSubmitting(true);
    setCurrentStep(1); // Start Step 1

    // --- SIMULATE PROGRESS ANIMATION ---
    // This interval will increment the step every 1.5 seconds to show visual progress
    const progressInterval = setInterval(() => {
        setCurrentStep((prev) => {
            if (prev < 4) return prev + 1; // Increment up to step 4
            return prev;
        });
    }, 1200);

    const formDataPayload = new FormData();
    formDataPayload.append("video", videoFile);

    const finalViolationType = formData.violationType === "other" 
        ? formData.otherViolation 
        : formData.violationType;

    formDataPayload.append("violationType", finalViolationType);
    
    formDataPayload.append("location", formData.location);
    formDataPayload.append("date", formData.date);
    formDataPayload.append("time", formData.time);
    formDataPayload.append("description", formData.description);

    try {
      const response = await axios.post(`${API_URL}/submit`, formDataPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Stop the interval once backend responds
      clearInterval(progressInterval);
      setCurrentStep(5); // Force to Step 5 (Done)

      // Slight delay before resetting form to let user see "Step 5" checkmark
      setTimeout(() => {
          const newSubmission = {
            ...response.data,
            videoUrl: URL.createObjectURL(videoFile),
            duration: formatDuration(videoDuration),
            fileSize: (videoFile.size / (1024 * 1024)).toFixed(2),
          };

          setSubmissions((prev) => [newSubmission, ...prev]);
          setView("dashboard");
          setVideoFile(null);
          setVideoDuration(null);
          
          setFormData(createInitialFormState());
          setIsSubmitting(false);
          setCurrentStep(0); // Reset steps
          
          showNotification(`Success! Report submitted. AI is analyzing the clip.`, "success");
      }, 1000);

    } catch (err) {
      clearInterval(progressInterval);
      setIsSubmitting(false);
      setCurrentStep(0);
      console.error(err);
      setError("Server Error: Check Python Backend.");
      showNotification("Upload failed.", "error");
    }
  };

  const handleDelete = (submissionId) => {
    setSubmissionToDelete(submissionId);
    setDeleteConfirmOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setSubmissionToDelete(null); 
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setIsSubmitting(true); 
    try {
      if (submissionToDelete) {
        await axios.delete(`${API_URL}/submissions/${submissionToDelete}`);
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionToDelete));
        setSelectedIds(prev => prev.filter(id => id !== submissionToDelete));
        showNotification("Submission deleted successfully!", "success");
      } else {
        await Promise.all(selectedIds.map(id => axios.delete(`${API_URL}/submissions/${id}`)));
        setSubmissions((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        showNotification(`${selectedIds.length} submissions deleted successfully!`, "success");
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to delete submission(s).", "error");
    } finally {
      setDeleteConfirmOpen(false);
      setSubmissionToDelete(null);
      setIsSubmitting(false);
    }
  };

  const handleView = (submission) => {
    setSelectedSubmission(submission);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedSubmission(null);
  };

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "success" });
    }, 5000);
  };

  const heroHeadline = view === "submit" ? "Video Submission & Validation" : getDashboardHeadline(submissions);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-200">

      {/* --- HEADER --- */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-blue-100 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-xl">
              G
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">GoodRoad</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 tracking-wide uppercase font-medium">Citizen Violation Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex gap-2 text-sm font-medium">
                <button
                onClick={() => setView("submit")}
                className={`px-4 py-2 rounded-full transition-colors ${
                    view === "submit" 
                    ? "text-blue-600 dark:text-blue-300 font-bold" 
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                >
                Report Violation
                </button>
                <button
                onClick={() => setView("dashboard")}
                className={`px-4 py-2 rounded-full transition-colors ${
                    view === "dashboard" 
                    ? "bg-blue-600 text-white dark:bg-blue-500" 
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                >
                My Dashboard
                </button>
            </nav>

            <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ml-2"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* --- HEADER STATS --- */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm transition-colors duration-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{heroHeadline}</h1>
          
          <div className="flex gap-4">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3 border border-green-100 dark:border-green-800 min-w-[110px]">
              <p className="text-[10px] text-green-600 dark:text-green-300 uppercase font-bold">Real Videos</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{realCount}</p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 border border-red-100 dark:border-red-800 min-w-[110px]">
              <p className="text-[10px] text-red-600 dark:text-red-300 uppercase font-bold">Fake Videos</p>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{fakeCount}</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 border border-blue-100 dark:border-blue-800 min-w-[110px]">
              <p className="text-[10px] text-blue-600 dark:text-blue-300 uppercase font-bold">Total Videos</p>
              <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{submissions.length}</p>
            </div>
          </div>
        </div>

        {view === "submit" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Upload size={20} className="text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Submit Dashcam Footage</h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Video Evidence</label>
                    <div className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center text-center hover:border-blue-400 transition-colors min-h-[260px] justify-center ${error ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/50'}`}>
                      {isDurationLoading ? (
                        <div className="flex flex-col items-center animate-pulse">
                          <Loader2 size={32} className="text-blue-500 animate-spin mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Verifying video format...</p>
                        </div>
                      ) : (
                        <>
                          <FileVideo size={44} className="text-gray-300 dark:text-gray-500 mb-3" />
                          {videoFile ? (
                            <div className="space-y-1">
                              {/* --- MODIFIED: Truncated Filename Display --- */}
                              <p className="font-medium text-gray-900 dark:text-white" title={videoFile.name}>
                                {truncateFileName(videoFile.name)}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {videoFile.size ? `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB` : "--"}
                              </p>
                              {videoDuration && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Duration: {formatDuration(videoDuration)}</p>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setVideoFile(null);
                                  setVideoDuration(null);
                                  setError("");
                                }}
                                className="text-blue-600 dark:text-blue-400 text-xs mt-2 hover:underline font-medium"
                              >
                                Remove file
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-3">Drag & drop or click to upload</p>
                              <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                                <p className="flex items-center justify-center gap-2">
                                  <span className="font-semibold">Format:</span>
                                  <span>MP4 only</span>
                                </p>
                                <p className="flex items-center justify-center gap-2">
                                  <span className="font-semibold">Duration:</span>
                                  <span>Less than 2 minutes</span>
                                </p>
                                <p className="flex items-center justify-center gap-2">
                                  <span className="font-semibold">Size:</span>
                                  <span>Maximum {MAX_FILE_SIZE_MB}MB</span>
                                </p>
                              </div>
                            </>
                          )}
                        </>
                      )}
                      <input
                        type="file"
                        accept="video/mp4"
                        onChange={handleFileChange}
                        disabled={isDurationLoading}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                        <AlertTriangle size={16} />
                        {error}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>

                      {formData.violationType === "other" && (
                          <div className="mt-2 relative animate-fade-in">
                              <Edit3 size={14} className="absolute left-3 top-3 text-gray-400" />
                              <input 
                                  type="text"
                                  placeholder="Type the specific violation..."
                                  value={formData.otherViolation}
                                  onChange={(e) => handleMetadataChange("otherViolation", e.target.value)}
                                  className="w-full border border-blue-300 dark:border-blue-500 rounded-xl pl-10 p-2.5 focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-white dark:bg-gray-700 dark:text-white"
                                  autoFocus
                                  required
                              />
                          </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                        Location
                      </label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Eg: Galle Road, Colombo 03"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-xl pl-10 p-2.5 focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                          value={formData.location}
                          required
                          onChange={(e) => handleMetadataChange("location", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                          Date
                        </label>
                        
                        <div className="relative">
                            <CalendarDays size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                            type="date"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl pl-10 p-2.5 focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-white dark:bg-gray-700 dark:text-white"
                            value={formData.date}
                            required
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            onChange={(e) => handleMetadataChange("date", e.target.value)}
                            />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                          Time
                        </label>
                        
                        <div className="relative">
                            <Clock size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                            type="time"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl pl-10 p-2.5 focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-white dark:bg-gray-700 dark:text-white"
                            value={formData.time}
                            required
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            onChange={(e) => handleMetadataChange("time", e.target.value)}
                            />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                        Additional Notes
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Eg: Driver sped through the intersection..."
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-200 outline-none text-sm resize-none bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 break-all overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        value={formData.description}
                        onChange={(e) => handleMetadataChange("description", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || isDurationLoading} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? "Uploading & Validating..." : "Submit Report"}
                    {!isSubmitting && <CheckCircle size={18} />}
                  </button>
                </div>
              </form>
            </div>

            {/* --- RIGHT COLUMN: CHECKLIST & STATUS --- */}
            <div className="space-y-6">
              
              {/* 1. Submission Checklist */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-100 dark:border-blue-900 shadow-sm p-6 transition-colors duration-200">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-widest">
                  <Info size={16} />
                  Submission Checklist
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className={`flex items-center gap-2 ${isFormatValid ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                    {isFormatValid ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300"></div>}
                    MP4 format only for compatibility.
                  </li>
                  <li className={`flex items-center gap-2 ${isDurationValid ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                    {isDurationValid ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300"></div>}
                    Duration less than 2 minutes.
                  </li>
                  <li className={`flex items-center gap-2 ${isGpsValid ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                    {isGpsValid ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300"></div>}
                    Accurate GPS data.
                  </li>
                  <li className={`flex items-center gap-2 ${isViolationValid ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                  </li>
                </ul>
              </div>

              {/* 2. Deep Fake Status Card (UPDATED) */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 transition-colors duration-200">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-widest">
                  <Activity size={16} />
                  Deep Fake Detection
                </div>
                
                <ul className="space-y-4 text-sm mt-4">
                  {/* STEP 1 */}
                  <StepItem 
                    stepNumber={1} 
                    currentStep={isSubmitting ? currentStep : (currentStep === 5 ? 5 : 0)} 
                    text="Secure upload & metadata validation" 
                  />
                  {/* STEP 2 */}
                  <StepItem 
                    stepNumber={2} 
                    currentStep={isSubmitting ? currentStep : (currentStep === 5 ? 5 : 0)} 
                    text="Frame extraction & preprocessing" 
                  />
                  {/* STEP 3 */}
                  <StepItem 
                    stepNumber={3} 
                    currentStep={isSubmitting ? currentStep : (currentStep === 5 ? 5 : 0)} 
                    text="MesoNet AI Analysis (Screening)" 
                  />
                  {/* STEP 4 */}
                  <StepItem 
                    stepNumber={4} 
                    currentStep={isSubmitting ? currentStep : (currentStep === 5 ? 5 : 0)} 
                    text="Temporal consistency check" 
                  />
                  {/* STEP 5 */}
                  <StepItem 
                    stepNumber={5} 
                    currentStep={isSubmitting ? currentStep : (currentStep === 5 ? 5 : 0)} 
                    text="Final confidence & report" 
                  />
                </ul>

                <div className="mt-5 bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-dashed border-gray-300 dark:border-gray-600">
                  {isSubmitting ? (
                    <>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <Loader2 size={16} className="text-blue-600 dark:text-blue-400 animate-spin" />
                        Processing Video...
                      </p>
                      <div className="w-full bg-white dark:bg-gray-600 rounded-full h-2 mt-3 overflow-hidden">
                        <div className="h-2 bg-blue-500 animate-progress-indeterminate rounded-full" />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">Awaiting next submission</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload a clip to start analysis.</p>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ... (Dashboard, Modal, etc.) ... */}
        {view === "dashboard" && (
          <div className="space-y-6">
            
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Submission Dashboard</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Track the status of every dashcam upload and AI decision.
              </span>
            </div>

            {/* Search and Filter Bar */}
            {submissions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 transition-colors duration-200">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search location, file, or type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>

                  <div className="relative">
                    <Filter size={20} className="absolute left-3 top-3 text-gray-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-xl pl-10 pr-8 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none text-sm appearance-none bg-white dark:bg-gray-700 dark:text-white min-w-[160px]"
                    >
                      <option value="all">All Status</option>
                      <option value="uploaded">Queued</option>
                      <option value="analyzing">Analyzing</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="relative">
                    <select
                      value={violationFilter}
                      onChange={(e) => setViolationFilter(e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none text-sm appearance-none bg-white dark:bg-gray-700 dark:text-white min-w-[180px]"
                    >
                      <option value="all">All Violations</option>
                      {violationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(searchQuery !== "" || statusFilter !== "all" || violationFilter !== "all") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setViolationFilter("all");
                      }}
                      className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* --- BULK ACTION BAR --- */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                            {isAllSelected ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400"/> : <Square size={18} />}
                            Select All
                        </button>
                        <span className="text-sm text-gray-400">|</span>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Showing {filteredSubmissions.length} results
                        </div>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 animate-slide-in">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                                {selectedIds.length} Selected
                            </span>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                                Delete Selected
                            </button>
                        </div>
                    )}
                </div>
              </div>
            )}

            {submissions.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-3">No submissions yet</p>
                <button
                  onClick={() => setView("submit")}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Submit your first video
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No submissions match your filters</p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setViolationFilter("all");
                      }}
                      className="text-blue-600 font-semibold hover:underline text-sm"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  filteredSubmissions.map((submission) => {
                    const config = statusConfig[submission.status] || statusConfig.uploaded;
                    const StatusIcon = config.icon;
                    const isSelected = selectedIds.includes(submission.id);

                    return (
                      <div
                        key={submission.id}
                        className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border shadow-sm flex flex-col gap-4 md:flex-row md:items-center transition-all duration-200 relative group
                            ${isSelected 
                                ? "border-blue-400 bg-blue-50/30 dark:border-blue-700 dark:bg-blue-900/10" 
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            }
                        `}
                      >
                         {/* Checkbox Overlay */}
                        <div className="absolute top-4 left-4 z-10 md:static md:flex md:items-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSelect(submission.id); }}
                                className={`rounded flex items-center justify-center transition-colors 
                                    ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-gray-600 hover:text-gray-400"}
                                `}
                            >
                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                            </button>
                        </div>

                        <div className={`pl-8 md:pl-0 w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${config.ring} ${submission.status === "analyzing" && "animate-pulse"}`}>
                          <StatusIcon size={26} />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2 justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wide">
                                {violationOptions.find((v) => v.value === submission.violationType)?.label ??
                                  submission.violationType}
                              </h3> */}
                              <span
                                className={`text-[0.8rem] font-semibold px-2 py-0.5 rounded-full border ${config.chipClass}`}
                              >
                                {config.label}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={12} />
                              {submission.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{submission.location}</p>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
                            <span>Date: {submission.date}</span>
                            <span>Time: {submission.time}</span>
                          </div>

                          {(submission.status === "uploaded" || submission.status === "analyzing") && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">
                                <span>Detecting Deep Fakes (MesoNet AI)...</span>
                                <span>{submission.status === "uploaded" ? "Queued" : "Analyzing"}</span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-500 h-1.5 rounded-full animate-progress-indeterminate" />
                              </div>
                            </div>
                          )}

                          {(submission.status === "verified" || submission.status === "rejected") && (
                            <div className="mt-2 text-xs flex items-center gap-3">
                                <p className={`text-sm font-bold ${submission.status === 'verified' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    Confidence: {Number(submission.confidenceScore).toFixed(2)}%
                                </p>
                                <span className="text-gray-400">|</span>
                                {/* REMOVED SMS SENT TEXT */}
                                <span className="text-gray-500 dark:text-gray-400">
                                    Analysis Complete
                                </span>
                            </div>
                          )}

                          <div className="flex gap-2 mt-4 justify-end">
                            <button
                              onClick={() => handleView(submission)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <Eye size={16} />
                              View
                            </button>
                            <button
                              onClick={() => handleDelete(submission.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </main>

{/* View Modal */}
{viewModalOpen && selectedSubmission && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
    {/* MODAL CONTAINER:
        LIGHT MODE: bg-white, border-gray-200
        DARK MODE: dark:bg-[#0f172a], dark:border-gray-800 
    */}
    <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-300">
      
      {/* Modal Header */}
      <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#1e293b]/50 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <ClipboardCheck className="text-blue-500" size={24} />
            Submission Details
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-semibold">GoodRoad AI Validation Engine</p>
        </div>
        <button
          onClick={closeViewModal}
          className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-red-500/10 hover:text-red-500 rounded-2xl text-gray-500 dark:text-gray-400 transition-all border border-gray-200 dark:border-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-8 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Main Evidence Area (Left) */}
          <div className="flex-1 min-w-0 space-y-6">
            <div className="relative group bg-black rounded-[1.5rem] overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-2xl">
              <video
                src={selectedSubmission.videoUrl}
                controls
                className="w-full h-auto max-h-[500px]"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Statement Area */}
            <div className="bg-blue-50/50 dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-3xl p-6 h-auto transition-colors">
              <label className="text-[15px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.2em] block mb-3">
                Citizen Statement
              </label>
              <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed italic break-all whitespace-pre-wrap">
                {selectedSubmission.description || "The submitter provided no additional contextual notes."}
              </p>
            </div>
          </div>

          {/* Sidebar Area (Right) */}
          <div className="w-full lg:w-[320px] space-y-6 shrink-0">
            
            {/* AI Result Card */}
            <div className="p-1 rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-blue-100 dark:border-white/10">
              <div className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl rounded-[1.8rem] p-6 text-center shadow-inner">
                <span className="text-[15px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-4">AI Confidence Score</span>
                <div className="relative inline-block">
                  <span className="text-5xl font-mono font-black text-gray-900 dark:text-white italic">
                    {Number(selectedSubmission.confidenceScore)}%
                  </span>
                </div>
                
                <div className="mt-6 w-full bg-gray-200 dark:bg-black/20 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000"
                    style={{ width: `${selectedSubmission.confidenceScore}%` }}
                  />
                </div>

                <div className={`mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${
                  selectedSubmission.status === 'verified' 
                  ? "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" 
                  : "bg-red-100 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
                }`}>
                  <Activity size={12} />
                  {statusConfig[selectedSubmission.status]?.label ?? selectedSubmission.status}
                </div>
              </div>
            </div>

            {/* Metadata Info */}
            <div className="space-y-3">
              {/* <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400"><ShieldAlert size={16}/></div>
                  <span className="text-[15px] font-bold text-gray-500 dark:text-gray-400">Violation</span>
                </div>
                <span className="text-[15px] font-bold text-gray-900 dark:text-white text-right break-words max-w-[150px]">
                  {violationOptions.find((v) => v.value === selectedSubmission.violationType)?.label ?? selectedSubmission.violationType}
                </span>
              </div> */}

              <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-red-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-lg text-red-600 dark:text-red-400"><MapPin size={16}/></div>
                  <span className="text-[15px] font-bold text-gray-500 dark:text-gray-400">Location</span>
                </div>
                <span className="text-[15px] font-bold text-gray-900 dark:text-white text-right break-words max-w-[150px]">{selectedSubmission.location}</span>
              </div>

              <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-purple-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400"><CalendarDays size={16}/></div>
                  <span className="text-[15px] font-bold text-gray-500 dark:text-gray-400">Timeline</span>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-gray-900 dark:text-white uppercase">{selectedSubmission.date}</p>
                  <p className="text-[15px] font-bold text-gray-400">{selectedSubmission.time}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 transition-colors duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete {submissionToDelete ? "this submission" : `${selectedIds.length} submissions`}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setSubmissionToDelete(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : null}
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div
            className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${
              notification.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800 dark:bg-green-900 dark:border-green-800 dark:text-green-200"
                : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-900 dark:border-red-800 dark:text-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            )}
            <p className="font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification({ show: false, message: "", type: "success" })}
              className="ml-2 hover:opacity-70"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
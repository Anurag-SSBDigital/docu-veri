import React, { useState } from "react";
import { Upload } from "lucide-react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const allowedMimeTypes = [
  "image/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const Dashboard = () => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [difference, setDifference] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  // Compute SHA-256 hash for a file
  const getFileHash = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // Handle file selection for file 1
  const handleFile1Change = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile1(e.target.files[0]);
    }
  };

  // Handle file selection for file 2
  const handleFile2Change = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile2(e.target.files[0]);
    }
  };

  // Compare files: first by hash then ask OpenAI for differences
  const compareFiles = async () => {
    if (!file1 || !file2) {
      toast.error("Please select both files.");
      return;
    }
    if (file1.type !== file2.type) {
      toast.error("Both files must be of the same type.");
      return;
    }

    setIsComparing(true);
    try {
      const hash1 = await getFileHash(file1);
      const hash2 = await getFileHash(file2);

      if (hash1 === hash2) {
        toast.success("Files are identical.");
        setIsComparing(false);
        return;
      }

      // Check if the file type is allowed for analysis.
      const isAllowed = allowedMimeTypes.some(
        (mime) => file1.type.startsWith(mime) || file1.type === mime
      );

      if (!isAllowed) {
        toast.error("File type not supported for comparison.");
        setIsComparing(false);
        return;
      }

      toast.error("File are not identical.");
    } catch (error) {
      toast.error("Error comparing files: " + error.message);
    } finally {
      setIsComparing(false);
    }
  };

  // Print the difference analysis
  const handlePrint = () => {
    window.print();
  };

  // Component to show file details
  const FileStats = ({ file }) => {
    if (!file) return null;
    return (
      <div className="mt-2 p-2 border border-gray-300 rounded bg-gray-50">
        <p>
          <strong>Name:</strong> {file.name}
        </p>
        <p>
          <strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB
        </p>
        <p>
          <strong>Modified:</strong>{" "}
          {new Date(file.lastModified).toLocaleString()}
        </p>
        <p>
          <strong>Type:</strong> {file.type || "Unknown"}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center mb-4">
          <img
            width="80px"
            style={{ paddingRight: "10px" }}
            src="https://ssbi.in/assets/img/logo-ssbi.png"
          />
        </div>
        <h1 className="text-2xl font-bold mb-4">Compare Files</h1>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full">
            <label className="w-full flex flex-col items-center px-4 py-6 bg-white text-indigo-600 rounded-lg shadow-lg uppercase border border-indigo-600 cursor-pointer hover:bg-indigo-600 hover:text-white">
              <Upload className="w-8 h-8" />
              <span className="mt-2">Upload File 1</span>
              <input
                type="file"
                className="hidden"
                onChange={handleFile1Change}
              />
            </label>
            {file1 && <FileStats file={file1} />}
          </div>
          <div className="w-full">
            <label className="w-full flex flex-col items-center px-4 py-6 bg-white text-indigo-600 rounded-lg shadow-lg uppercase border border-indigo-600 cursor-pointer hover:bg-indigo-600 hover:text-white">
              <Upload className="w-8 h-8" />
              <span className="mt-2">Upload File 2</span>
              <input
                type="file"
                className="hidden"
                onChange={handleFile2Change}
              />
            </label>
            {file2 && <FileStats file={file2} />}
          </div>
        </div>

        <button
          onClick={compareFiles}
          className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
          disabled={isComparing}
        >
          {isComparing ? "Comparing..." : "Compare Files"}
        </button>

        {/* Modal Popup for Difference Analysis */}
        {showPopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
              <h2 className="text-xl font-bold mb-4">Difference Analysis</h2>
              <div className="mb-4 whitespace-pre-wrap">{difference}</div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none"
                >
                  Print
                </button>
                <button
                  onClick={() => setShowPopup(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Toaster />
    </>
  );
};

export default Dashboard;

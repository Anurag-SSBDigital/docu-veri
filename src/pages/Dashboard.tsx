import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  LogOut,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  FileCheck,
  Eye,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

interface Document {
  id: string;
  file_path: string;
  status: "pending" | "verified" | "rejected";
  created_at: string;
  feedback?: string;
}

export default function Dashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    initializeStorage();
  }, []);

  const initializeStorage = async () => {
    try {
      // Use the same bucket name ("documents") as in the upload functions.
      const { data: bucketExists } = await supabase.storage.getBucket(
        "documents"
      );
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket("documents", {
          public: false,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error initializing storage:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      toast.error("Failed to fetch documents");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      // Use the original file name
      const fileName = file.name;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.status === 409) {
          toast.error(
            "Duplicate file error: A file with this name already exists. Please rename your file or update the existing document."
          );
          return;
        }
        throw uploadError;
      }

      const { error: dbError } = await supabase.from("documents").insert({
        user_id: user?.id,
        file_path: filePath,
        status: "pending",
      });

      if (dbError) {
        toast.error("Error saving document info: " + dbError.message);
        throw dbError;
      }

      toast.success("Document uploaded successfully");
      fetchDocuments();
    } catch (error: any) {
      if (error.message.toLowerCase().includes("file size")) {
        toast.error("File size exceeds the maximum allowed limit (10MB).");
      } else {
        toast.error("Error uploading document: " + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateDocument = async (documentId: string) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf,.doc,.docx";
    fileInput.onchange = async (e) => {
      const input = e.target as HTMLInputElement;
      if (!input.files || !input.files[0]) return;

      const file = input.files[0];
      setUploading(true);

      try {
        // Use the original file name here as well
        const fileName = file.name;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file, { upsert: true }); // upsert to overwrite if needed

        if (uploadError) {
          if (uploadError.status === 409) {
            toast.error(
              "Duplicate file error: A file with this name already exists. Please rename your file or update the existing document."
            );
            return;
          }
          throw uploadError;
        }

        const { error: updateError } = await supabase
          .from("documents")
          .update({
            file_path: filePath,
            status: "pending",
          })
          .eq("id", documentId);

        if (updateError) {
          toast.error("Error updating document info: " + updateError.message);
          throw updateError;
        }

        toast.success("Document updated successfully");
        fetchDocuments();
      } catch (error: any) {
        if (error.message.toLowerCase().includes("file size")) {
          toast.error("File size exceeds the maximum allowed limit (10MB).");
        } else {
          toast.error("Error updating document: " + error.message);
        }
      } finally {
        setUploading(false);
      }
    };
    fileInput.click();
  };

  // New function to handle file previewing.
  const handlePreviewDocument = async (filePath: string) => {
    try {
      // Create a signed URL valid for 60 seconds.
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        toast.error("Could not generate preview URL.");
      }
    } catch (error: any) {
      toast.error("Error generating preview: " + error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img
                width="80px"
                style={{ paddingRight: "10px" }}
                src="https://ssbi.in/assets/img/logo-ssbi.png"
              />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Document Verification Portal
              </span>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
            <div className="flex justify-center">
              <label className="w-64 flex flex-col items-center px-4 py-6 bg-white text-indigo-600 rounded-lg shadow-lg tracking-wide uppercase border border-indigo-600 cursor-pointer hover:bg-indigo-600 hover:text-white">
                <Upload className="w-8 h-8" />
                <span className="mt-2 text-base leading-normal">
                  {uploading ? "Uploading..." : "Upload Document"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Your Documents
              </h2>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <li key={doc.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {getStatusIcon(doc.status)}
                            <p className="ml-2 text-sm font-medium text-gray-900">
                              {doc.file_path.split("/").pop()}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {doc.status}
                            </span>
                            <button
                              onClick={() =>
                                handlePreviewDocument(doc.file_path)
                              }
                              className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </button>
                            <button
                              onClick={() => handleUpdateDocument(doc.id)}
                              className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Update
                            </button>
                          </div>
                        </div>
                        {doc.feedback && (
                          <p className="mt-2 text-sm text-gray-500">
                            {doc.feedback}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                          Uploaded on{" "}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                  {documents.length === 0 && (
                    <li>
                      <div className="px-4 py-4 sm:px-6 text-center text-gray-500">
                        No documents uploaded yet
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

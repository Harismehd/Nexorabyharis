import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Upload as UploadIcon, FileSpreadsheet, Check } from 'lucide-react';

export default function Upload() {
  const { gymKey } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select an Excel file first.');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('gymKey', gymKey);

    setLoading(true);
    try {
      const res = await api.post('/members/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message + ` (${res.data.count} members added)`);
      setFile(null);
      // Reset input
      const fileInput = document.getElementById('excel-upload');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Upload Members</h1>
        <p className="text-slate-500 mt-2">Upload an Excel (.xlsx) file containing your members data.</p>
      </div>

      <div className="card">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
          <h3 className="text-blue-800 font-bold mb-1">Expected Excel Columns</h3>
          <p className="text-blue-600 text-sm">Your file must contain the following column headers (case-insensitive):</p>
          <ul className="list-disc list-inside text-blue-600 text-sm mt-2 space-y-1">
             <li><strong>Name</strong>: Member's full name</li>
             <li><strong>Phone</strong>: Mobile number (e.g., 03001234567)</li>
             <li><strong>Date</strong>: Fee due date</li>
             <li><strong>Amount</strong>: Fee amount (e.g., 5000)</li>
          </ul>
        </div>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors">
           <input 
              type="file" 
              id="excel-upload"
              accept=".xlsx,.xls" 
              onChange={handleFileChange} 
              className="hidden" 
           />
           <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
              <div className="bg-primary-50 text-primary-600 p-4 rounded-full mb-4">
                 <FileSpreadsheet size={40} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">
                {file ? file.name : 'Click to select Excel File'}
              </h3>
              <p className="text-slate-400 mt-1">
                {file ? 'Ready to upload' : 'or drag and drop here'}
              </p>
           </label>
        </div>

        <div className="mt-8 flex justify-end">
           <button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="btn-primary px-8"
           >
             {loading ? 'Uploading...' : <><UploadIcon size={18} /> Upload Data</>}
           </button>
        </div>
      </div>
    </div>
  );
}

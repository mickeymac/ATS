import { Card, CardBody, Button, Spinner } from '@nextui-org/react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../services/api';

export function ResumeViewer({ application }) {
  if (!application) {
    return (
      <div className="h-full flex items-center justify-center text-default-700">
        Select an application to view resume
      </div>
    );
  }

  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getIsWordDoc = (app) => {
    if (!app) return false;
    const urlStr = (app.file_name || app.resume_url || app.resume_file_path || '').toLowerCase();
    return urlStr.includes('.doc') || urlStr.includes('.docx') || urlStr.includes('wordprocessing');
  };
  const isWordDoc = getIsWordDoc(application);

  useEffect(() => {
    let blobUrl = null;
    
    const fetchResume = async () => {
      if (!application?._id) return;
      
      // Only attempt fetch if an identifier exists
      if (!application.file_name && !application.resume_url && !application.resume_file_path) {
        setPdfUrl(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.get(`/applications/${application._id}/resume`, {
          responseType: 'blob'
        });
        blobUrl = URL.createObjectURL(response.data);
        setPdfUrl(blobUrl);
      } catch (err) {
        console.error("Failed to load resume", err);
        setError("Could not load resume document.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchResume();
    
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [application]);

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${application.candidate_name_extracted || 'resume'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <Card className="h-full w-full border-none shadow-none bg-transparent">
      <CardBody className="p-0 h-full">
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-default-500">Retrieving resume securely from cloud storage...</p>
          </div>
        ) : error ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6">
             <div className="text-center text-danger">
                 <FileText size={48} className="mx-auto mb-4 opacity-50 text-danger" />
                 <p>{error}</p>
             </div>
          </div>
        ) : pdfUrl ? (
          <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-default-200 bg-white shadow-sm">
            <div className="px-4 py-3 bg-default-50 border-b border-divider flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-danger/10 text-danger">
                        <FileText size={18} />
                    </div>
                    <span className="text-sm font-medium text-default-900">
                      {application.candidate_name_extracted || 'Candidate'}'s Resume
                    </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="flat" startContent={<Download size={16} />} onPress={handleDownload}>
                    Download
                  </Button>
                  <Button size="sm" color="primary" variant="flat" startContent={<ExternalLink size={16} />} onPress={handleOpenNewTab}>
                    Open in New Tab
                  </Button>
                </div>
            </div>
            {isWordDoc ? (
              <div className="w-full h-full overflow-y-auto bg-default-100 dark:bg-default-50/50 p-6 doc-preview-scroll">
                <div className="max-w-4xl mx-auto bg-white dark:bg-default-100 shadow-lg rounded-xl border border-divider p-8 min-h-full">
                  <div className="bg-warning-50 dark:bg-warning-50/10 text-warning-800 dark:text-warning-500 p-4 rounded-xl border border-warning-200 dark:border-warning-200/20 mb-8 flex gap-3 text-sm">
                    <FileText className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Word Document Text Preview</p>
                      <p className="mt-1 opacity-90">Visual formatting is not natively supported for Word files in browsers. The extracted raw text is displayed below. Use the Download button to view the original file.</p>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-default-800 select-text">
                    {application.extracted_text || "No text could be extracted from this document."}
                  </div>
                </div>
              </div>
            ) : (
                <iframe 
                    src={pdfUrl} 
                    className="w-full h-full bg-white"
                    title="Resume PDF"
                />
            )}
          </div>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-6">
            <div 
                className="w-full max-w-xl h-full max-h-[500px] border-2 border-dashed border-default-300 rounded-2xl flex flex-col items-center justify-center bg-default-50/50 gap-6 p-8"
            >
                <div className="h-20 w-20 rounded-full bg-default-100 flex items-center justify-center mb-2">
                    <FileText className="text-default-400 h-10 w-10" />
                </div>
                
                <div className="text-center space-y-2 max-w-xs">
                    <h3 className="text-xl font-semibold text-default-900">No Resume Available</h3>
                    <p className="text-default-500">
                        Resume file for <span className="font-medium text-default-700">{application.candidate_name_extracted || 'this candidate'}</span> is not available.
                    </p>
                </div>

                {application.extracted_text && (
                  <div className="w-full mt-4">
                    <h4 className="text-sm font-semibold text-default-700 mb-2">Extracted Text Preview:</h4>
                    <div className="bg-default-100 rounded-xl p-4 text-sm text-default-600 max-h-48 overflow-y-auto">
                      {application.extracted_text.substring(0, 1000)}...
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

import { Card, CardBody, Button } from '@nextui-org/react';
import { FileText, Download, ExternalLink } from 'lucide-react';

export function ResumeViewer({ application }) {
  if (!application) {
    return (
      <div className="h-full flex items-center justify-center text-default-700">
        Select an application to view resume
      </div>
    );
  }

  // Construct the PDF URL from the file path
  const getResumeUrl = () => {
    if (!application.resume_file_path) return null;
    // The backend stores paths like "uploads/uuid.pdf"
    // We serve static files at /uploads/
    const fileName = application.resume_file_path.replace('uploads/', '').replace('uploads\\', '');
    return `http://127.0.0.1:8000/uploads/${fileName}`;
  };

  const pdfUrl = getResumeUrl();

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
        {pdfUrl ? (
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
            <iframe 
                src={pdfUrl} 
                className="w-full h-full bg-white"
                title="Resume PDF"
            />
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

import { useContext } from 'react';
import DownloadContext from '../context/DownloadContext';
import imageMap from '../utils/imageMap';

const DownloadStatusPanel = () => {
    const { downloadStatus } = useContext(DownloadContext);
    
    if (!downloadStatus || downloadStatus.downloads.length === 0) {
        return null;
    }
    
    return (
        <div className="upload-status-container download-status-container">
            {downloadStatus.downloads.map((download) => (
                <div key={download.id} className="upload-item">
                    <div className="d-flex justify-content-between">
                        <span>{download.filename}</span>
                        <button 
                            className="cancel-button"
                            onClick={() => downloadStatus.cancelDownload(download.id)}
                        >
                            <img src={imageMap["close.png"]} alt="Cancel" />
                        </button>
                    </div>
                    <div className="progress mb-1">
                        <div 
                            className="progress-bar download-progress-bar" 
                            role="progressbar" 
                            style={{ width: `${download.progress}%` }} 
                            aria-valuenow={download.progress} 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                        >
                            {download.progress}%
                        </div>
                    </div>
                    {download.printStatus && (
                        <div className="status-text">{download.printStatus}</div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default DownloadStatusPanel;
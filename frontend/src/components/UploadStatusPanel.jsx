import { useContext } from 'react';
import imageMap from "../utils/imageMap";
import UploadContext from '../context/UploadContext';

const UploadStatusPanel = () => {
  const { uploadStatus } = useContext(UploadContext);

  if (uploadStatus.getLength() === 0) return null;

  return (
    <div className="upload-status-container">
      {uploadStatus.uploads.map(({ id, filename, printStatus, progress }) => (
        <div key={id} className="upload-item">
          <div className="upload-info">{filename}</div>
          <div className="upload-status">{printStatus}</div>
          <progress value={progress} max="100" className="upload-progress" />
          <img 
            src={imageMap["close.png"]} alt="Cancel" className="cancel-button"
            onClick={() => uploadStatus.cancelUpload(id)}
          />
        </div>
      ))}
    </div>
  );
};

export default UploadStatusPanel;
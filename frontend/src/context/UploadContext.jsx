import { createContext, useState, useRef } from "react";
import UploadStatus from './UploadStatus.js';

const UploadContext = createContext();

export function UploadProvider({ children }) {
  const [, forceUpdate] = useState(0);
  const uploadStatusRef = useRef(
    new UploadStatus(() => {
      forceUpdate((n) => n + 1);
    }),
  );

  return (
    <UploadContext.Provider
      value={{uploadStatus: uploadStatusRef.current}}
    >
      {children}
    </UploadContext.Provider>
  );
};

export default UploadContext;

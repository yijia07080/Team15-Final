import { createContext, useState, useRef } from "react";
import DownloadStatus from "./DownloadStatus";

const DownloadContext = createContext();

export function DownloadProvider({ children }) {
    const [, forceUpdate] = useState(0);
    const downloadStatusRef = useRef();

    if (!downloadStatusRef.current) {
        downloadStatusRef.current = new DownloadStatus(() => {
            forceUpdate((n) => n + 1);
        });
    }

    return (
        <DownloadContext.Provider value={{ downloadStatus: downloadStatusRef.current }}>
            {children}
        </DownloadContext.Provider>
    );
}

export default DownloadContext;
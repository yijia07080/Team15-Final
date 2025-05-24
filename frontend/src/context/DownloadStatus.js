class DownloadStatus {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.downloads = [];  // Array of { id, filename, printStatus, progress }
        this.endRemoveTimeout = 5000;  // Time to wait before removing completed downloads
        this.cancelRemoveTimeout = 5000;  // Time to wait before removing cancelled downloads
    }

    getLength() {
        return this.downloads.length;
    }

    addDownload(id, filename) {
        if (this.downloads.some((download) => download.id === id)) {
            throw new Error(`Download with id ${id} already exists`);
        }

        this.downloads.push({ id: id, filename: filename, printStatus: "", progress: 0 });
        this.onUpdate();
        
        // Simulate download progress
        this.simulateProgress(id);
    }

    simulateProgress(id) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            
            if (progress <= 100) {
                this.updateDownloadProgress(id, progress);
                
                if (progress === 100) {
                    this.endDownload(id, "下載完成");
                    clearInterval(interval);
                }
            } else {
                clearInterval(interval);
            }
        }, 250); // Update every 0.5 seconds
    }

    updateDownloadProgress(id, progress) {
        this.downloads = this.downloads.map((d) => (d.id === id ? { ...d, progress: progress } : d));
        this.onUpdate();
    }

    updateDownloadPrintStatus(id, printStatus) {
        this.downloads = this.downloads.map((d) => (d.id === id ? { ...d, printStatus: printStatus } : d));
        this.onUpdate();
    }

    endDownload(id, printStatus) {
        this.updateDownloadPrintStatus(id, printStatus);
        this.updateDownloadProgress(id, 100);
        
        // Remove download from list after timeout
        setTimeout(() => {
            this.downloads = this.downloads.filter((d) => d.id !== id);
            this.onUpdate();
        }, this.endRemoveTimeout);
    }

    cancelDownload(id) {
        this.updateDownloadPrintStatus(id, "下載已取消");
        
        // Remove download from list after timeout
        setTimeout(() => {
            this.downloads = this.downloads.filter((d) => d.id !== id);
            this.onUpdate();
        }, this.cancelRemoveTimeout);
    }
}

export default DownloadStatus;
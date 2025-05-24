class UploadStatus {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.uploads = [];  // Array of { id, filename, printStatus, progress, abortController }
        this.endRemoveTimeout = 5000;  // Time in ms to wait before removing completed uploads
        this.cancelRemoveTimeout = 5000;  // Time in ms to wait before removing cancelled uploads
    }

    getLength() {
        return this.uploads.length;
    }

    addUpload(id, filename, abortEventFunc=null) {
        // When using cancelUpload(id), call abortEventFunc
    
        if (this.uploads.some((upload) => upload.id === id)) {
            throw new Error(`Upload with id ${id} already exists`);
        }

        const abortController = new AbortController();
        if (abortEventFunc) {
            abortController.signal.addEventListener("abort", () => {
                abortEventFunc();
            })
        }

        this.uploads.push({ id: id, filename: filename, printStatus: "", progress: 0, abortController: abortController });
        this.onUpdate();
    }

    updateUploadProgress(id, progress) {
        this.uploads = this.uploads.map((u) => (u.id === id ? { ...u, progress: progress } : u));
        this.onUpdate();
    }

    updateUploadPrintStatus(id, printStatus) {
        this.uploads = this.uploads.map((u) => (u.id === id ? { ...u, printStatus: printStatus } : u));
        this.onUpdate();
    }

    endUpload(id, printStatus) {
        this.uploads = this.uploads.map((u) => (u.id === id ? { ...u, printStatus: printStatus } : u));
        this.onUpdate();

        setTimeout(() => {
            this.uploads = this.uploads.filter((u) => u.id !== id);
            this.onUpdate();
        }, this.endRemoveTimeout);
    }

    cancelUpload(id) {
        if (this.uploads.some((upload) => upload.id === id)) {
            const upload = this.uploads.find((u) => u.id === id);
            if (upload?.abortController) {
                upload.abortController.abort();
            }
            upload.printStatus = "Cancelled";
            this.onUpdate();

            setTimeout(() => {
                this.uploads = this.uploads.filter((u) => u.id !== id);
                this.onUpdate();
            }, this.cancelRemoveTimeout);
        } else {
            throw new Error(`Upload with id ${id} does not exist`);
        }
    }
}

export default UploadStatus;
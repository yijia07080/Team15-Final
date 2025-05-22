class UploadStatus {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.uploads = [];  // Array of { id, filename, progress, abortController }
        this.complete_remove_timeout = 1500;  // Time in ms to wait before removing completed uploads
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

        this.uploads.push({ id: id, filename: filename, progress: 0, abortController: abortController });
        this.onUpdate();
    }

    updateUploadProgress(id, progress) {
        // Remove the upload if progress is 100
        this.uploads = this.uploads.map((u) => (u.id === id ? { ...u, progress: progress } : u));
        if (progress === 100) {
            setTimeout(() => {
                this.uploads = this.uploads.filter((u) => u.id !== id);
                this.onUpdate();
            }, this.complete_remove_timeout);
        }
        this.onUpdate();
    }

    cancelUpload(id) {
        if (this.uploads.some((upload) => upload.id === id)) {
            const upload = this.uploads.find((u) => u.id === id);
            if (upload?.abortController) {
                upload.abortController.abort();
            }
            this.uploads = this.uploads.filter((u) => u.id !== id);
        } else {
            throw new Error(`Upload with id ${id} does not exist`);
        }

        this.onUpdate();
    }
}

export default UploadStatus;
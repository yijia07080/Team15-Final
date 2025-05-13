import {idToFile, treeStructure} from "./tempDB.js";

// 這個檔案會用來模擬後端的功能，之後會改成真正的後端
// 預計後端會回傳有更動的資料，方便前後端一致性
const backendBridge = {
    addGroup(name, idToFileRef, treeStructureRef) {
        treeStructureRef[idToFileRef.length] = {
            parent_id: null,
            children_id: [],
        }
        idToFileRef[idToFileRef.length] = {
            url: "#",
            img: "folder.png",
            name: name,
            hidden: true,
            metadata: {
                last_modified: new Date().toISOString(),
                file_type: "root",
                used_size: 0,
                total_size: 0,
            }
        }
    },
    addGoogleSpaceProvider(id, idToFileRef) {
        if (!idToFileRef[id]) {
            console.error("Group does not exist");
            return;
        }
        if (idToFileRef[id].metadata.file_type !== "root") {
            console.error("Group is not a root folder");
            return;
        }

        idToFileRef[id].metadata.total_size += 10000000;
    },
    delGoogleSpaceProvider(id, provider, idToFileRef) {
        if (!idToFileRef[id]) {
            console.error("Group does not exist");
            return;
        }
        if (idToFileRef[id].metadata.file_type !== "root") {
            console.error("Group is not a root folder");
            return;
        }

        idToFileRef[id].metadata.total_size -= 10000000;
    },
    addFolder(name, parentId, idToFileRef, treeStructureRef) {
        if (!treeStructureRef[parentId]) {
            console.error("Parent folder does not exist");
            return;
        }
        if (idToFileRef[parentId].metadata.file_type !== "folder") {
            console.error("Parent is not a folder");
            return;
        }

        const newId = Object.keys(idToFileRef).length;
        treeStructureRef[newId] = {
            parent_id: parentId,
            children_id: [],
        }
        idToFileRef[newId] = {
            url: "#",
            img: "folder.png",
            name: name,
            hidden: false,
            metadata: {
                last_modified: new Date().toISOString(),
                file_type: "folder",
                used_size: 0,
            }
        }
        idToFileRef[parentId].metadata.last_modified = new Date().toISOString();
    },
    move(id, newParentId, idToFileRef, treeStructureRef) {
        if (!treeStructureRef[newParentId]) {
            console.error("New parent folder does not exist");
            return;
        }
        if (idToFileRef[id].metadata.file_type === "root") {
            console.error("Cannot move root folder");
            return;
        }
        else if (idToFileRef[newParentId].metadata.file_type !== "folder") {
            console.error("New parent is not a folder");
            return;
        }

        idToFileRef[newParentId].metadata.last_modified = new Date().toISOString();
        idToFileRef[newParentId].metadata.used_size += idToFileRef[id].metadata.used_size;

        let origParentId = treeStructureRef[id].parent_id;
        treeStructureRef[origParentId].children_id = treeStructureRef[origParentId].children_id.filter(childId => childId !== id);
        treeStructureRef[newParentId].children_id.push(id);
        treeStructureRef[id].parent_id = newParentId;
    },
    rename(id, newName, idToFileRef) {
        idToFileRef[id].name = newName;
        idToFileRef[id].metadata.last_modified = new Date().toISOString();
    },
    delete(id, idToFileRef, treeStructureRef) {
        if (idToFileRef[id].metadata.file_type === "folder" || idToFileRef[id].metadata.file_type === "root") {
            const children = treeStructureRef[id].children_id;
            for (const childId of children) {
                this.delete(childId, idToFileRef, treeStructureRef);
            }
        }

        let origParentId = treeStructureRef[id].parent_id;
        treeStructureRef[origParentId].children_id = treeStructureRef[origParentId].children_id.filter(childId => childId !== id);

        idToFileRef[origParentId].metadata.last_modified = new Date().toISOString();
        idToFileRef[origParentId].metadata.used_size -= idToFileRef[id].metadata.used_size;

        delete idToFileRef[id];
        delete treeStructureRef[id];
    },
    getUploadHandler(fileInputs, progressRefs, abortControllers, idToFileRef, treeStructureRef) {
        // return a handler for <input type="file" multiple>
        // fileInputs is <input type="file" multiple> ref 
        // progressRefs is an array of refs, each ref object should have a value property 
        // abortControllers is an array of AbortController ref objects for aborting each upload
        // e.g. 
        // fileInputs = useRef(null); progressRefs = useRef([useRef(null), useRef(null)]);
        // abortControllers = useRef([new AbortController(), new AbortController()]);
        // <input type="file" ref={fileInputs} multiple />
        // <ProgressBar ref={progressRefs[0]} /> <ProgressBar ref={progressRefs[1]} />
        // <button onClick={getUploadHandler(fileInputs, progressRefs, abortControllers, ...)}>Upload</button>
        let timeout = [];
        for (let i = 0; i < fileInputs.current.files.length; i++) {
            // random timeout between 1s and 3s for simulating upload
            timeout[i] = Math.floor(Math.random() * 2000) + 1000;
        }

        return async () => {
            let promises = [];
            for (let i = 0; i < fileInputs.current.files.length; i++) {
                let uploadPromise = new Promise((resolve, reject) => {
                    abortControllers[i].current.signal.addEventListener("abort", () => {
                        reject(new Error("Upload aborted"));
                    });

                    setTimeout(() => {
                        progressRefs[i].current.value = 1;
                        resolve();
                    }, timeout[i]); 
                });
                promises.push(uploadPromise);
            }

            try {
                await Promise.all(promises);
            } catch (error) {
                console.error(error);
            }
        }
    }
}

export {idToFile, treeStructure, backendBridge}
class BookmarksTree {
  constructor(treeStructure = null, idToBookmark = null, uploadStatusContext, onUpdate) {
    this.uploadStatus = uploadStatusContext;
    // 以 map 紀錄樹狀結構：node id -> { parent_id, children_id }
    this.treeStructure = { 0: { parent_id: null, children_id: [] } };
    // 以 map 紀錄書籤資訊：node id -> bookmark
    this.idToBookmark = {};
    // 當前所在的 node id
    this.currentNode = 0;
    // 連接到操作 indexedDB 的物件
    // this.loaclDB = loaclDB;
    // 通知 React 更新的函式
    this.onUpdate = onUpdate;
    // 紀錄目前的tag
    this.currentFilterTags = [];
    // 紀錄目前的搜尋關鍵字
    this.currentSearchKeyword = "";
    if (treeStructure && idToBookmark) {
      this._buildTree(treeStructure, idToBookmark);
    }
  }

  // 深拷貝 treeStructure 和 idToBookmark
  _buildTree(treeStructure, idToBookmark) {
    this.idToBookmark = { ...idToBookmark };
    this.treeStructure = {};
    for (const id in treeStructure) {
      const node = treeStructure[id];
      this.treeStructure[id] = {
        parent_id: node.parent_id,
        children_id: [...node.children_id],
      };
    }
  }

  // 取得快速存取的書籤，即 starred == true 的書籤，回傳 bookmark array
  getStarredBookmarks() {
    return Object.values(this.idToBookmark).filter(
      (bookmark) => bookmark.starred,
    );
  }

  // 對 node id 的 srarred 屬性取反，並通知 React 更新
  toggleStarred(id) {
    this.idToBookmark[id].starred = !this.idToBookmark[id].starred;
    // this.loaclDB.updateBookmark(id, this.idToBookmark[id]);
    this.onUpdate();
  }

  // 取得 root (id=0) 的子節點，回傳 bookmark array
  getRootChildren() {
    const rootNode = this.treeStructure[0]; // 確保 root node 存在
    if (!rootNode) {
      console.error("Root node (id=0) does not exist in treeStructure.");
      return [];
    }
    return rootNode.children_id.map((id) => this.idToBookmark[id]);
  }

  // 取得當前位置(currentNode)下的書籤，回傳 bookmark array
  getCurrentChildren() {
    return this.treeStructure[this.currentNode].children_id.map(
      (id) => this.idToBookmark[id],
    );
  }

  // 取得當前位置(currentNode)下的書籤，回傳 bookmark array，但有id
  // getCurrentChildren() {
  //   return this.treeStructure[this.currentNode].children_id.map(
  //     (id) => ({ 
  //       id: id,
  //       ...this.idToBookmark[id],
  //     })
  //   );
  // }

  // 取得當前位置(currentNode)的父節點，回傳 node id
  getCurrentParent() {
    return this.treeStructure[this.currentNode].parent_id;
  }

  // 取得從 root 走到 currentNode 的路徑，回傳 bookmark array
  getPathToBookmark() {
    const path = [];
    let current = this.currentNode;
    while (current !== 0) {
      path.unshift(this.idToBookmark[current]);
      current = this.treeStructure[current].parent_id;
    }
    return path;
  }

  // 沒有id，自己手動加入
  // getPathToBookmark() {
  //   const path = [];
  //   let current = this.currentNode;

  //   while (current !== null && current !== 0) { 
  //     const fileData = this.idToBookmark[current];
  //     if (fileData) { 
  //       path.unshift({
  //           id: current,
  //           ...fileData 
  //       });
  //     }
  //     const nodeInfo = this.treeStructure[current];
  //     if (!nodeInfo || nodeInfo.parent_id === null) {
  //         break; 
  //     }
  //     current = nodeInfo.parent_id;
  //   }

   
  //   if (this.currentNode !== 0) {
  //       const rootData = this.idToBookmark[0];
  //       if (rootData) { 
  //           path.unshift({
  //               id: 0,
  //               ...rootData
  //           });
  //       }
  //   } else {
  //       const rootData = this.idToBookmark[0];
  //       if (rootData) {
  //           path.push({ 
  //               id: 0,
  //               ...rootData
  //           });
  //       }
  //   }
  //   path.shift();
  //   // console.log(path);
  //   return path; 
  // }


  // 移動到 node id，並通知 React 更新
  moveToFolder(id) {
    this.currentNode = id;
    this.onUpdate();
  }
  
  // 拖曳item到group
  moveItemToGroup(itemId, groupId) {
    // 確保item和群組都存在
    if (!this.treeStructure[itemId] || !this.treeStructure[groupId]) {
      console.error(`Item with id ${itemId} or folder with id ${groupId} does not exist.`);
      return;
    }

    // 確保目標是群組
    const targetFolder = this.idToBookmark[groupId];
    if (targetFolder.metadata.file_type !== "group" && targetFolder.metadata.file_type !== "root") {
      console.error(`Target with id ${groupId} is not a folder.`);
      return;
    }

    // 不能將自己移動到自己的子群組
    let current = groupId;
    while (this.treeStructure[current]) {
      if (current === itemId) {
        console.error("Cannot move a group into its own subgroup.");
        return;
      }
      current = this.treeStructure[current].parent_id;
    }

    // 從原父節點中移除
    const oldParentId = this.treeStructure[itemId].parent_id;
    if (oldParentId !== null) {
      this.treeStructure[oldParentId].children_id = this.treeStructure[oldParentId].children_id.filter(
        id => id !== itemId
      );
    }

    // 添加到新群組
    this.treeStructure[groupId].children_id.push(itemId);
    
    // 更新項目的父節點
    this.treeStructure[itemId].parent_id = groupId;
    
    // 更新時間戳
    const now = new Date().toISOString();
    if (this.idToBookmark[itemId].metadata) {
      this.idToBookmark[itemId].metadata.last_modified = now;
    }
    if (this.idToBookmark[groupId].metadata) {
      this.idToBookmark[groupId].metadata.last_modified = now;
    }

    // 通知 React 更新
    this.onUpdate();
  }

  // 上傳新檔案，調整idToBookmark與treeStructure，並通知 React 更新
  addBookmark({ name, tags, img, hidden, file_type, used_size}, file) {
    const id = Date.now(); // 使用當前時間戳作為唯一 ID
    if (!tags.some(tag => tag === file_type)) {
      tags.push(file_type); // 加上檔案類型的標籤
    }
    this.idToBookmark[id] = {
      id,
      name,
      url: 'http://localhost:5174/file/${id}',
      tags,
      img,
      hidden: hidden || false,
      metadata: {
        last_modified: new Date().toISOString(), // 動態生成最後修改時間
        file_type,
        used_size: used_size || 0,
      },
    };
    this.treeStructure[this.currentNode].children_id.push(id);
    this.treeStructure[id] = { parent_id: this.currentNode, children_id: [] };

    // upload to server
    const formData = new FormData();
    formData.append("file", file);
    formData.append("new_bookmark", JSON.stringify(this.idToBookmark[id]));
    formData.append("parent_id", this.currentNode);

    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      this.uploadStatus.addUpload(id, name, () => {xhr.abort();});

      xhr.open("POST", "/api/upload", true);
      // xhr.withCredentials = true;  // 如果需要攜帶 cookie

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          this.uploadStatus.updateUploadProgress(id, percentComplete);
        }
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          this.uploadStatus.updateUploadProgress(id, 100);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(xhr.response);
        }
      };
      xhr.onabort = () => reject("Upload aborted");
      xhr.onerror = () => reject(xhr.response);

      xhr.send(formData);

    }).then((response) => {
      console.log("Upload successful:", response);
      this.onUpdate();

    }).catch((error) => {
      // rollback
      delete this.idToBookmark[id];
      delete this.treeStructure[id];
      this.treeStructure[this.currentNode].children_id = this.treeStructure[this.currentNode].children_id.filter(
        childId => childId !== id
      );
      this.onUpdate();

      console.error("Upload failed:", error);
      if (error === "Upload aborted") {console.log("Upload rollback success");}
      this.uploadStatus.cancelUpload(id);
    });
  }


  addGroup({ name, tags }) {
    const id = Date.now(); // 使用當前時間戳作為唯一 ID
    this.idToBookmark[id] = {
      id,
      name,
      url: "#",
      img: "group.png",
      tags,
      hidden: true,
      metadata: {
        last_modified: new Date().toISOString(),
        file_type: "group", // 群組類型為 root
        used_size: 0,
        total_size: 0, // 預設總大小為 0
      },
    };

    // 將新群組加到root的child
    this.treeStructure[0].children_id.push(id);
    this.treeStructure[id] = { parent_id: 0, children_id: [] };
    if (this.idToBookmark[0] && this.idToBookmark[0].metadata) {
      this.idToBookmark[0].metadata.last_modified = new Date().toISOString();
    }
    // 通知 React 更新
    this.onUpdate();
  }

  // 插入一個資料夾，並通知 React 更新
  addFolder({ name, tags}) {
    const id = Date.now(); // 使用當前時間戳作為唯一 ID
    this.idToBookmark[id] = {
      id,
      name,
      url: "#",
      img: "folder.png",
      tags,
      hidden: false,
      metadata: {
        last_modified: new Date().toISOString(), // 動態生成最後修改時間
        file_type: "folder",
        used_size: 0, // 預設為 0
      },
    };

    this.treeStructure[this.currentNode].children_id.push(id);
    this.treeStructure[id] = { parent_id: this.currentNode, children_id: [] };
    
    // 更新 currentNode 的 metadata.last_modified
    if (this.idToBookmark[this.currentNode] && this.idToBookmark[this.currentNode].metadata) {
      this.idToBookmark[this.currentNode].metadata.last_modified = new Date().toISOString();
    }
    // this.loaclDB.createId(id, this.idToBookmark[id], this.treeStructure[id]);
    // this.loaclDB.updateTreeStructure(this.currentNode, this.treeStructure[this.currentNode])
    this.onUpdate();
  }

  // 遞迴刪除 node id 以下的所有節點(含自身)，並通知 React 更新
  deleteBookmark(id) {
    const _deleteBookmark = (node_id) => {
      if (this.treeStructure[node_id].children_id.length > 0) {
        const children_ids = [...this.treeStructure[node_id].children_id];
        for (const child_id of children_ids) {
          _deleteBookmark(child_id);
        }
      }
      const parent_id = this.treeStructure[node_id].parent_id;
      this.treeStructure[parent_id].children_id = this.treeStructure[
        parent_id
      ].children_id.filter((child_id) => child_id !== node_id);
      delete this.treeStructure[node_id];
      delete this.idToBookmark[node_id];
      // this.loaclDB.delId(node_id);
    };
    _deleteBookmark(id);
    // this.loaclDB.updateTreeStructure(this.currentNode, this.treeStructure[this.currentNode])
    // this.loaclDB.delId(id);
    this.onUpdate();
  }

  // 根據你傳入的標籤，對網頁渲染
  filterBookmarksByTags(tags) {
    this.currentFilterTags = tags;
    this.applyFilters();
  }

  // 根據關鍵字過濾書籤和資料夾
  filterBookmarksByKeyword(keyword) {
    this.currentSearchKeyword = keyword;
    this.applyFilters();
  }

  // 同時應用搜尋和篩選
  applyFilters() {
    const lowerKeyword = this.currentSearchKeyword.toLowerCase();
    const currentFilterTags = this.getCurrentFilterTags();
    for (const id in this.idToBookmark) {
      const bookmark = this.idToBookmark[id];
      const matchesKeyword =
        bookmark.name.toLowerCase().includes(lowerKeyword) ||
        bookmark.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword));
      const matchesTags =
        currentFilterTags.length === 0 ||
        currentFilterTags.some((tag) => bookmark.tags.includes(tag));
      bookmark.hidden = !(matchesKeyword && matchesTags);
    }
    this.onUpdate();
  }

  // 取得現在的標籤篩選狀態
  getCurrentFilterTags() {
    return this.currentFilterTags || [];
  }
}

export default BookmarksTree;

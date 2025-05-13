// 先用這個檔案來模擬資料庫的功能，之後再改成真正的資料庫
export const treeStructure = {
  0: { parent_id: null, children_id: [1, 2] },
  1: { parent_id: 0, children_id: [] },
  2: { parent_id: 0, children_id: [3] },
  3: { parent_id: 2, children_id: [] },
  4: { parent_id: null, children_id: [5] },
  5: { parent_id: 4, children_id: [] },
};

// url為連接後端下載，連結格式尚未確定，後續會在更改
// img為檔案類型的icon
// size單位為byte
// 如果為root folder，會有額外的total_size屬性
// 資料夾的used_size為子層級的used_size總和
// 資料夾的last_modified為子層級的last_modified中最新的
export const idToFile = {
  0: {
    url: "#",
    img: "folder.png",
    name: "群組1",
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "root",
      used_size: 2600880,
      total_size: 10000000,
    },
  },
  1: {
    url: "http://localhost:3000/file/1",
    img: "https://drive-thirdparty.googleusercontent.com/64/type/application/pdf",
    name: "履歷.pdf",
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "pdf",
      used_size: 122800,
    },
  },
  2: {
    url: "#",
    img: "folder.png",
    name: "photo backup",
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "folder",
      used_size: 2478080,
    },
  },
  3: {
    url: "http://localhost:3000/file/3",
    img: "https://drive-thirdparty.googleusercontent.com/64/type/image/jpeg",
    name: "2023-10-01 12.00.00.jpg",
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "jpg",
      used_size: 2478080,
    },
  },
  4: {
    url: "#",
    img: "folder.png",
    name: "群組2",
    hidden: true,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "root",
      used_size: 100,
      total_size: 20000000,
    },
  },
  5: {
    url: "http://localhost:3000/file/5",
    img: "https://drive-thirdparty.googleusercontent.com/64/type/text/plain",
    name: "test.txt",
    hidden: true,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "txt",
      used_size: 100,
    },
  }
};

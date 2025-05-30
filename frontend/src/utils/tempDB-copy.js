export const treeStructure = {
  0: { parent_id: null, children_id: [1, 2, 3, 4] },     // home
  1: { parent_id: 0, children_id: [] },           // 群組0（預設群組）
  2: { parent_id: 0, children_id: [5] },         // 原 id=0 -> 群組1
  3: { parent_id: 0, children_id: [] },               // 原 id=1 -> 履歷.pdf
  4: { parent_id: 0, children_id: [6] },              // 原 id=4 -> 群組2
  5: { parent_id: 2, children_id: [7] },               // 原 id=2 -> photo backup
  6: { parent_id: 4, children_id: [] },               // 原 id=5 -> test.txt
  7: { parent_id: 5, children_id: [] },               // 原 id=3 -> jpg
};

export const idToFile = {
  0: {
    url: "#",
    img: "folder.png",
    name: "home",
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "home", // 只有這個是root
      used_size: 2600880,
    },
  },
  1: {
    url: "#",
    img: "folder.png",
    name: "未分類",
    hidden: true,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "root", // 只有這個是root
      used_size: 2598180,
    },
  },
  2: {
    url: "#",
    img: "folder.png",
    name: "群組1",
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "folder",
      used_size: 2478080,
    },
  },
  3: {
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
  4: {
    url: "#",
    img: "folder.png",
    name: "群組2",
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "folder",
      used_size: 100,
      total_size: 20000000,
    },
  },
  5: {
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
  6: {
    url: "http://localhost:3000/file/5",
    img: "https://drive-thirdparty.googleusercontent.com/64/type/text/plain",
    name: "test.txt",
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "txt",
      used_size: 100,
    },
  },
  7: {
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
};

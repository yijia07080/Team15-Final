export const userInfo = {
  'username': 'admin',
  'name':     'testuser',
  'picture':  '',
}

export const treeStructure = {
  0: { parent_id: null, children_id: [1, 3] },     // 0: home
  1: { parent_id: 0, children_id: [2, 4] },        // 1: 群組1
  2: { parent_id: 1, children_id: [] },            // 2: 履歷.pdf
  3: { parent_id: 0, children_id: [5] },           // 3: 群組2
  4: { parent_id: 1, children_id: [6] },           // 4: photo backup
  5: { parent_id: 3, children_id: [] },            // 5: test.txt
  6: { parent_id: 4, children_id: [] },            // 6: jpg
};

export const idToFile = {
  0: {
    id : 0,
    url: "#",
    img: "folder.png",
    name: "home",
    tags: [],
    hidden: true,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "root", // root不顯示
      used_size: 2600880,
    },
  },
  1: {
    id: 1,
    url: "#",
    img: "group.png",
    name: "群組1",
    tags: [],
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "group",
      used_size: 2478080,
      total_size: 20000000,
      spaceProviders: [
        {
          name: "a@example.com",
          picture: "",
          total_size: 10000000,
          used_size: 3478080,
        },
        {
          name: "b@example.com",
          picture: "",
          total_size: 10000000,
          used_size: 0,
        },
      ]
    },
  },
  2: {
    id: 2,
    url: "http://localhost:3000/file/2",
    img: "https://drive-thirdparty.googleusercontent.com/64/type/application/pdf",
    name: "履歷.pdf",
    tags: ["pdf"],
    hidden: false,
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "pdf",
      used_size: 122800,
    },
  },
  3: {
    id: 3,
    url: "#",
    img: "group.png",
    name: "群組2",
    hidden: false,
    tags: [],
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "group",
      used_size: 100,
      total_size: 20000000,
      spaceProviders: [
        {
          name: "c@example.com",
          picture: "",
          total_size: 10000000,
          used_size: 100,
        },
        {
          name: "d@example.com",
          picture: "",
          total_size: 10000000,
          used_size: 0,
        },
      ]
    },
  },
  4: {
    id: 4,
    url: "#",
    img: "folder.png",
    name: "photo backup",
    hidden: false,
    tags: ["image"],
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "folder",
      used_size: 2478080,
    },
  },
  5: {
    id: 5,
    url: "http://localhost:3000/file/5",
    img: "https://drive-thirdparty.googleusercontent.com/64/type/text/plain",
    name: "test.txt",
    hidden: false,
    tags: [],
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "txt",
      used_size: 100,
    },
  },
  6: {
    id: 6,
    url: "http://localhost:3000/file/6",
    img: "https://drive-thirdparty.googleusercontent.com/64/type/image/jpeg",
    name: "2023-10-01.jpg",
    hidden: false,
    tags: [],
    metadata: {
      last_modified: "2025-04-07T02:06:22.107Z",
      file_type: "jpg",
      used_size: 2478080,
    },
  },
};

import { createContext, useContext, useState, useRef } from "react";
import UploadContext from '../context/UploadContext';
import BookmarksTree from "./BookmarksTree.js";
// import { userInfo, treeStructure, idToFile } from "../utils/tempDB.js";
import { userInfo, treeStructure, idToFile  } from "../utils/init.js";

const BookmarksContext = createContext();

export function BookmarksProvider({ children }) {
  const [, forceUpdate] = useState(0);
  const { uploadStatus } = useContext(UploadContext);
  const bookmarksTreeRef = useRef(
    new BookmarksTree(userInfo, treeStructure, idToFile, uploadStatus, () => {
      forceUpdate((n) => n + 1);
    }),
  );
  // console.log("BookmarksTree:", bookmarksTreeRef.current);
  // console.log("TreeStructure:", treeStructure);
  return (
    <BookmarksContext.Provider
      value={{ bookmarksTree: bookmarksTreeRef.current }}
    >
      {children}
    </BookmarksContext.Provider>
  );
}

export default BookmarksContext;

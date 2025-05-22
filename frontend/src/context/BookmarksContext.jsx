import { createContext, useContext, useState, useRef } from "react";
import UploadContext from '../context/UploadContext';
import BookmarksTree from "./BookmarksTree.js";
import { treeStructure, idToFile } from "../utils/tempDB.js";

const BookmarksContext = createContext();

export function BookmarksProvider({ children }) {
  const [, forceUpdate] = useState(0);
  const { uploadStatus } = useContext(UploadContext);
  const bookmarksTreeRef = useRef(
    new BookmarksTree(treeStructure, idToFile, uploadStatus, () => {
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

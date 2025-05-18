import { createContext, useState, useRef } from "react";
import BookmarksTree from "./BookmarksTree.js";
import { treeStructure, idToFile } from "../utils/tempDB.js";

const BookmarksContext = createContext();

export function BookmarksProvider({ children }) {
  const [, forceUpdate] = useState(0);
  const bookmarksTreeRef = useRef(
    new BookmarksTree(treeStructure, idToFile, () => {
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

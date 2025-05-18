import { useContext } from "react";
import { HomeItem, SidebarItem } from "./SidebarItem";
import BookmarksContext from "../context/BookmarksContext";

const Sidebar = () => {
  const { bookmarksTree } = useContext(BookmarksContext);
  const folders = bookmarksTree
    .getCurrentChildren()
    .filter((item) => item.metadata.file_type === "folder");
  // const starredBookmarks = bookmarksTree.getStarredBookmarks();

  // const handleToggleStar = (id) => {
  //   bookmarksTree.filterBookmarksByTags([]); // 清空篩選標籤
  //   bookmarksTree.toggleStarred(id);
  // };
  const handleMoveToFolder = (id) => {
    // bookmarksTree.filterBookmarksByTags([]); // 清空篩選標籤
    bookmarksTree.moveToFolder(id);
  };

   return (
    <div className="sidebar d-none d-lg-block">
      <HomeItem onMoveToFolder={handleMoveToFolder} />
      
      {folders.map((folder) => {
  // console.log("Rendering SidebarItem with id:", folder.id, folder);
        return (
          <SidebarItem
            key={folder.id}
            item={folder}
            onMoveToFolder={handleMoveToFolder}
          />
        );
      })}

    </div>
  );
};

export default Sidebar;

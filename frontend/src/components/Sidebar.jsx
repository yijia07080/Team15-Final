import { useContext } from "react";
import { HomeItem, SidebarItem } from "./SidebarItem";
import BookmarksContext from "../context/BookmarksContext";

const Sidebar = () => {
  const { bookmarksTree } = useContext(BookmarksContext);
  // const folders = bookmarksTree
  //   .getCurrentChildren()
  //   .filter((item) => item.metadata.file_type === "folder");


  // 側邊欄位只顯示在root下的資料夾
  const folders = bookmarksTree
    .getRootChildren()
    .filter((item) => item.metadata.file_type === "group");
    
  const handleDeleteBookmark = (id) => {
    if (confirm("確定要刪除此群組與底下所有檔案嗎?")) {
      bookmarksTree.deleteBookmark(id);
    }
  };
  // const handleToggleStar = (id) => {
  //   bookmarksTree.filterBookmarksByTags([]); // 清空篩選標籤
  //   bookmarksTree.toggleStarred(id);
  // };
  const handleMoveToFolder = (id) => {
    // bookmarksTree.filterBookmarksByTags([]); // 清空篩選標籤
    bookmarksTree.moveToFolder(id);
  };
  const handleMoveItemToGroup = (itemId, folderId) => {
    bookmarksTree.moveItemToGroup(itemId, folderId);
  };
   return (
    <div className="sidebar d-none d-lg-block">
      <HomeItem onMoveToFolder={handleMoveToFolder} onMoveItemToGroup={handleMoveItemToGroup} />

      
      {folders.map((folder) => (
        <SidebarItem
          key={folder.id}
          item={folder}
          onMoveToFolder={handleMoveToFolder}
          onDeleteBookmark={handleDeleteBookmark}
          onMoveItemToGroup={handleMoveItemToGroup}
        />
      ))}
    </div>
  );
};

export default Sidebar;

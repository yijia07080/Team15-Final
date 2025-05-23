import { useContext } from "react";
import MainContentItem from "./MainContentItem";
import BookmarksContext from "../context/BookmarksContext";

const MainContent = () => {
  const { bookmarksTree } = useContext(BookmarksContext);
  const bookmarks = bookmarksTree.getCurrentChildren().filter((bookmark) => !bookmark.hidden);
  // console.log("MainContentItem bookmarksTree", bookmarks);
  const handleToggleStar = (id) => {
    bookmarksTree.toggleStarred(id);
  };
  const handleMoveToFolder = (id) => {
    bookmarksTree.moveToFolder(id);
  };
  const handleDeleteBookmark = (id) => {
    bookmarksTree.deleteBookmark(id);
  };
  const handleMoveItemToGroup = (itemId, folderId) => {
    bookmarksTree.moveItemToGroup(itemId, folderId);
  };
  return (
    <div className="tag-container">
      {bookmarks.map((bookmark) => {
        // console.log("Rendering bookmark with id:", bookmark);
        return (
          <MainContentItem
            key={bookmark.id}
            bookmark={bookmark}
            onToggleStar={handleToggleStar}
            onMoveToFolder={handleMoveToFolder}
            onDeleteBookmark={handleDeleteBookmark}
            onMoveItemToGroup={handleMoveItemToGroup}
          />
        );
      })}
    </div>
  );
};

export default MainContent;

import { useContext, useState, useEffect } from "react";
import MainContentItem from "./MainContentItem";
import BookmarksContext from "../context/BookmarksContext";
import SelectDestModal from "./SelectDestModal/SelectDestModal";

const MainContent = () => {
  const { bookmarksTree } = useContext(BookmarksContext);
  const bookmarks = bookmarksTree.getCurrentChildren().filter(b => !b.hidden);

  const [menu, setMenu] = useState({ show: false, x: 0, y: 0, bookmark: null });
  const [showSelectDestModal, setSelectDestModal] = useState(false);
  const [movingBookmark, setMovingBookmark] = useState(null);   // ← 這裡

  const openMenu = (e, bookmark) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ show: true, x: e.clientX, y: e.clientY, bookmark });
  };

  const closeMenu = () => setMenu(m => ({ ...m, show: false }));

  useEffect(() => {
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
    };
  }, []);

  return (
    <>
      <div className="tag-container">
        {bookmarks.map(b => (
          <MainContentItem
            key={b.id}
            bookmark={b}
            openContextMenu={openMenu}
            bookmarksTree={bookmarksTree}
            closeMenu={closeMenu}
          />
        ))}
      </div>

      {menu.show && menu.bookmark && (
        <ul
          className="dropdown-menu show"
          style={{ position: "fixed", top: menu.y, left: menu.x, zIndex: 1080 }}
        >
          <li>
            <button
              className="dropdown-item text-danger"
              onClick={() => {
                bookmarksTree.deleteBookmark(menu.bookmark.id);
                closeMenu();
              }}
            >
              刪除
            </button>
          </li>
          {menu.bookmark.metadata.file_type !== 'group' && (
            <li>
              <button
                className="dropdown-item"
                onClick={() => {
                  setMovingBookmark(menu.bookmark);
                  setSelectDestModal(true);
                  closeMenu();
                }}
              >
                移動
              </button>
            </li>
          )}
          <li>
            <button
              className="dropdown-item"
              onClick={() => {
                const a = document.createElement("a");
                a.href = "/api/download/" + menu.bookmark.id;
                a.download = menu.bookmark.name;
                a.click();
                closeMenu();
              }}
            >
              下載
            </button>
          </li>
        </ul>
      )}

      {showSelectDestModal && movingBookmark && (
        <SelectDestModal
          onClose={() => {
            setSelectDestModal(false);
            setMovingBookmark(null);
          }}
          onConfirm={destId => {
            bookmarksTree.moveItemToGroup(movingBookmark.id, destId); 
            setSelectDestModal(false);
            setMovingBookmark(null);
          }}
        />
      )}
    </>
  );
};

export default MainContent;

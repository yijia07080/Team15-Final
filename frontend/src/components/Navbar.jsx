import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom"; // LOGIN
import imageMap from "../utils/imageMap";
import AddBookmarkModal from "./AddBookmarkModal/AddBookmarkModal";
import AddFolderModal from "./AddFolderModal/AddFolderModal";
import TagFilterModal from "./TagFilterModal/TagFilterModal";
import BookmarksContext from "../context/BookmarksContext";
import $ from "jquery";
import Tooltip from "./Tooltip";

const Navbar = () => {
  const { bookmarksTree } = useContext(BookmarksContext);
  const isLogin = bookmarksTree.userInfo.username !== "admin";
  const [showImportExportModal, setShowImportExportModal] = useState(false);

  // 註冊相關
  const handleAuthClick = (groupId) => {
    const clientId = '488776431237-lkq7u7ds5pgjnhcgdltl7o4cq60t151p.apps.googleusercontent.com'
    // const redirectUri = 'http://localhost:8000/provider-oauth2callback/'
    const redirectUri = 'http://localhost:8000/oauth2callback/'
    const scope = 'openid email profile https://www.googleapis.com/auth/drive'
    // const stateObj = { group_id: groupId, redirect_url: redirectUri }
    // const stateParam = encodeURIComponent(JSON.stringify(stateObj))
    const authUrl = [
      'https://accounts.google.com/o/oauth2/v2/auth',
      `?client_id=${clientId}`,
      `&redirect_uri=${encodeURIComponent(redirectUri)}`,
      `&response_type=code`,
      `&scope=${encodeURIComponent(scope)}`,
      `&access_type=offline`,
      `&prompt=consent`,
      // `&state=${stateParam}`
    ].join('')
    window.location.href = authUrl
  }

  const handleLoginClick = () => {
    if (!isLogin) {
      window.location.href = "/login";
    } else {
      $.ajax({
        url: "http://localhost:8000/logout/",
        type: "POST",
        xhrFields: { withCredentials: true },
        success() {
          window.location.reload();
        },
      });
    }
  };

  // 新增書籤相關
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const handleAddBookmarkButtonClick = () => {
    setShowBookmarkModal(true);
  };

  // 新增資料夾相關
  const [showFolderModal, setShowFolderModal] = useState(false);
  const handleAddFolderButtonClick = () => {
    setShowFolderModal(true);
  };
  
  // 新增群組相關
  const [showGroupModal, setShowGroupModal] = useState(false);
  const handleAddGroupButtonClick = () => {
    setShowGroupModal(true);
  };

  // 篩選tag相關
  const [showTagFilterModal, setShowTagFilterModal] = useState(false);
  const handleTagFilterButtonClick = () => {
    setShowTagFilterModal(true);
  };

  // 獲取當前篩選標籤
  const currentFilterTags = bookmarksTree.getCurrentFilterTags();

  // 獲取所有標籤
  const allTags = Array.from(
    new Set(
      Object.values(bookmarksTree.idToBookmark).flatMap(
        (bookmark) => bookmark.tags,
      ),
    ),
  );

  // 檢查篩選標籤是否有效
  const isFilterActive =
    currentFilterTags.length > 0 && currentFilterTags.length < allTags.length;

  // 搜尋相關
  const [searchInput, setSearchInput] = useState("");
  const handleSearchInputChange = (e) => {
    const keyword = e.target.value;
    setSearchInput(keyword);
    bookmarksTree.filterBookmarksByKeyword(keyword);
  };

  return (
    <nav className="d-flex flex-wrap gap-2">
      {/* {bookmarksTree.currentNode !== 0 && (
        <div className="search-bar flex-shrink-0 col-12 col-md-5 col-lg-4">
          <input
            type="text"
            placeholder="搜尋書籤、資料夾"
            value={searchInput}
            onChange={handleSearchInputChange}
          />
        </div>
      )} */}
      <div className="search-bar flex-shrink-0 col-12 col-md-5 col-lg-4">
        <input
          type="text"
          placeholder="搜尋書籤、資料夾"
          value={searchInput}
          onChange={handleSearchInputChange}
        />
      </div>
      <div className="d-flex justify-content-center align-items-center gap-2">

        {bookmarksTree.currentNode !== 0 && (
        <Tooltip tooltip="根據標籤篩選檔案與資料夾" position="bottom">
          <button
            className={`btn d-flex align-items-center ${isFilterActive ? "btn-dark" : "btn-outline-secondary"}`}
            onClick={handleTagFilterButtonClick}
          >
          <img src={imageMap["tag.png"]} alt="Tag Icon" />
          <span>篩選標籤</span>
          </button>
        </Tooltip>
        )}
        {bookmarksTree.currentNode !== 0 && (
        <Tooltip  tooltip="上傳新檔案" position="bottom">
          <button
            className="btn btn-outline-secondary d-flex align-items-center"
            onClick={handleAddBookmarkButtonClick}
          >
          <img src={imageMap["add.png"]} alt="Add Button" />
          </button>
        </Tooltip>
        )}
        {bookmarksTree.currentNode !== 0 && (
        <Tooltip tooltip="新增資料夾" position="bottom">
          <button 
          className="btn btn-outline-secondary d-flex align-items-center"
          onClick={handleAddFolderButtonClick}
          >
            <img src={imageMap["folder.png"]} alt="Add Folder Button" />
          </button>
        </Tooltip>
      )}
        <div className="d-flex justify-content-center align-items-center gap-2">
          {!isLogin && (
            <div className="d-flex justify-content-center align-items-center gap-2">
              <button
                className="btn btn-outline-secondary d-flex align-items-center"
                onClick={handleAuthClick}
              >
                <img src={imageMap["google.png"]} alt="Google Icon" />
                <span>註冊</span>
              </button>
            </div>
          )}
          <div className="d-flex justify-content-center align-items-center gap-2">
            <button
              className="btn btn-outline-secondary d-flex align-items-center"
              onClick={handleLoginClick}
            >
              <img
                src={!isLogin ? imageMap["login.png"] : imageMap["logout.png"]}
                alt="Login Icon"
              />
              <span>
                {!isLogin ? "登入" : "登出 " + bookmarksTree.userInfo.name}
              </span>
            </button>
          </div>
        </div>

      </div>
      {showBookmarkModal && (
        <AddBookmarkModal
          onClose={() => setShowBookmarkModal(false)}
          currentFilterTags={currentFilterTags}
        />
      )}
      {showFolderModal && (
        <AddFolderModal onClose={() => setShowFolderModal(false)} />
      )}
      {showTagFilterModal && (
        <TagFilterModal onClose={() => setShowTagFilterModal(false)} />
      )}
    </nav>
  );
};

export default Navbar;

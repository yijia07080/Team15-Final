import { useState, useContext } from "react";
import BookmarksContext from "../../context/BookmarksContext";
import styles from "./GroupSettingModal.module.css";
import imageMap from "../../utils/imageMap";

const HummanReadableSize = (size) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(2)} ${units[index]}`;
};

const getAllUsedSize = (group) => {
  let allUsedSize = 0;
  group.metadata.spaceProviders.forEach((provider) => {
    allUsedSize += provider.used_size;
  });
  return allUsedSize;
};

const GroupSettingModal = ({ onClose, groupId }) => {
  const { bookmarksTree } = useContext(BookmarksContext);

  function handleBackdropClick() {
    onClose();
  }

  function stopBackdropClick(event) {
    event.stopPropagation();
  }

  const handleAuthClick = () => {
    const clientId = '488776431237-lkq7u7ds5pgjnhcgdltl7o4cq60t151p.apps.googleusercontent.com'
    const redirectUri = 'http://localhost:8000/provider-oauth2callback/'
    const scope = 'openid email profile https://www.googleapis.com/auth/drive'
    const authUrl = [
      'https://accounts.google.com/o/oauth2/v2/auth',
      `?client_id=${clientId}`,
      `&redirect_uri=${encodeURIComponent(redirectUri)}`,
      `&response_type=code`,
      `&scope=${encodeURIComponent(scope)}`,
      `&access_type=offline`,
      `&prompt=consent`
    ].join('')
    window.location.href = authUrl
    
    // bookmarksTree.addProivder(groupId);
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    bookmarksTree.changeBookmarkName(groupId, newName);
  };

  const group = bookmarksTree.idToBookmark[groupId];
  if (group.metadata.file_type !== "group") {
    throw new Error("GroupSettingModal can only be used for group items");
  }

  return (
    <div className={styles["modal"]} onClick={handleBackdropClick}>
      <div className={styles["modal-content"]} onClick={stopBackdropClick}>
        <input
          type="text"
          defaultValue={group.name}
          onChange={handleNameChange}
          className={styles["h2-input"]}
        />
        <div className={styles["group-info"]}>
          <p>
            群組大小: {HummanReadableSize(getAllUsedSize(group))} /{" "}
            {HummanReadableSize(group.metadata.total_size)}
          </p>
          <div className={styles["providers-container"]}>
            <div className="d-flex justify-content-center align-items-center gap-2">
              <button
                className="btn btn-outline-secondary d-flex align-items-center"
                onClick={handleAuthClick}
              >
                <img src={imageMap["google.png"]} alt="Google Icon" />
                <span>新增Google Drive</span>
              </button>
            </div>
            {group.metadata.spaceProviders.map((provider, index) => (
              <div key={index} className={styles["provider"]}>
                <img
                  src={provider.picture || imageMap["group.png"]}
                  alt={provider.name}
                />
                <span>
                  {provider.name} ({HummanReadableSize(provider.total_size)})
                </span>
                <img
                  src={imageMap["close.png"]}
                  alt="delete"
                  className={styles["hidden-setting"]}
                  onClick={() => {
                    bookmarksTree.removeSpaceProvider(groupId, provider.name);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSettingModal;

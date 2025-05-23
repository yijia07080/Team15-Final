import React from "react";
import { useState, useContext } from "react";
import BookmarksContext from "../../context/BookmarksContext";
import styles from "./SelectDestModal.module.css";
import imageMap from "../../utils/imageMap";

const SelectDestModal = ({ onClose, onConfirm }) => {
  const { bookmarksTree } = useContext(BookmarksContext);

  // 目的地的「目前節點」，固定從根目錄開始
  const [destNode, setDestNode] = useState(0);

  // 取得目前節點下的「資料夾」(folder / group / root)
  const folderChildren = bookmarksTree
    .getFolderChildren(destNode)
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));

  // 返回上一層
  const handleGoParent = () => {
    const parentId = bookmarksTree.treeStructure[destNode].parent_id;
    if (parentId !== null) setDestNode(parentId);
  };

  // 跳進下層資料夾
  const handleFolderClick = (id) => setDestNode(id);

  // 確認目的地並交回父層
  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(destNode);
    onClose();
  };

  const handleBackdropClick = () => onClose();
  const stopBackdropClick = (e) => e.stopPropagation();

  return (
    <div className={styles.modal} onClick={handleBackdropClick}>
      <div className={styles["modal-content"]} onClick={stopBackdropClick}>
        <form onSubmit={handleSubmit}>
          <div>
            {/*─ 標題與麵包屑 ───────────────────────────────*/}
            <h5 className={styles["modal-title"]}>移動到</h5>
            <div className={styles.breadcrumb}>
              {/** 根目錄 → … → 目前 */}
              {(() => {
                const path = [];
                let cur = destNode;
                while (cur !== 0) {
                  path.unshift(bookmarksTree.idToBookmark[cur]);
                  cur = bookmarksTree.treeStructure[cur].parent_id;
                }
                return (
                  <>
                    <div className={styles.link} key="home" onClick={() => setDestNode(0)}>
                      Home
                    </div>
                    {path.map((bm, i) => (
                      <React.Fragment key={bm.id}>
                        <img
                          src={imageMap["next.svg"]}
                          className={styles.separator}
                          alt="Next Icon"
                        />
                        <div
                          className={styles.link}
                          onClick={() => setDestNode(bm.id)}
                        >
                          {bm.name}
                        </div>
                      </React.Fragment>
                    ))}
                  </>
                );
              })()}
            </div>

            {/*─ 資料夾列表 ───────────────────────────────*/}
            <div className={styles["folder-list"]}>
              {destNode !== 0 && (
                <button
                  type="button"
                  className={styles.row}
                  onClick={handleGoParent}
                >
                  <img
                    src={imageMap["back.png"]}
                    className={styles["btn-icon"]}
                    alt="Back"
                  />
                  上一層
                </button>
              )}

              {folderChildren.length === 0 ? (
                <div className={styles.empty}>（此目錄沒有資料夾）</div>
              ) : (
                folderChildren.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className={styles.row}
                    onClick={() => handleFolderClick(folder.id)}
                  >
                    <img
                      src={
                        folder.metadata.file_type === "group"
                          ? imageMap["group.png"]
                          : imageMap["folder.png"]
                      }
                      className={styles["btn-icon"]}
                      alt="Folder Icon"
                    />
                    {folder.name}
                  </button>
                ))
              )}
            </div>
          </div>
          {/*─ 動作按鈕 ───────────────────────────────*/}
          <div className={styles["form-actions"]}>
            <button
              type="button"
              className={`btn btn-secondary ${styles["btn-secondary"]}`}
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${styles["btn-primary"]}`}
            >
              確認
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SelectDestModal;

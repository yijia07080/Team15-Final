import { useState } from "react";
import GroupSettingModal from "./GroupSettingModal/GroupSettingModal";
import imageMap from "../utils/imageMap";


const HomeItem = ({ item, onMoveToFolder }) => {
  // 攔截拖曳事件並取消
  const handleDragStartCapture = e => e.preventDefault();
  return (
    <div 
      className="bookmark-item"
      draggable={false}
      onDragStartCapture={handleDragStartCapture}
    >
      <a
        onClick={(e) => {
          e.preventDefault();
          onMoveToFolder(0);
        }}
      >
        <div className="title">
          <img src={item ? imageMap[item.img] : imageMap["home.png"]} alt="Home" />
          <span>{item ? item.name : "Home"}</span>
        </div>
      </a>
    </div>
  );
};

const AddItem = ({ item }) => {
  // 攔截拖曳事件並取消
  const handleDragStartCapture = e => e.preventDefault();
  return (
    <div 
      className="bookmark-item"
      draggable={false}
      onDragStartCapture={handleDragStartCapture}
    >
      <div className="btn-add-outer">
        <div className="btn btn-outline-secondary btn-add">
            <div className="title">
              <img src={imageMap["add.png"]} alt="Add" />
              <span>新增群組</span>
            </div>
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ item, onToggleStar, onMoveToFolder, onDeleteBookmark, onMoveItemToGroup }) => {
  // 攔截拖曳事件並取消
  const handleDragStartCapture = e => e.preventDefault();

  const [showGroupSettingModal, setShowGroupSettingModal] = useState(false);
  const handleGroupSettingClick = () => {
    setShowGroupSettingModal(true);
  }

  const handleClick = (e) => {
    if (e.target.name === "star") {
      // 點擊 star
      e.preventDefault();
      onToggleStar && onToggleStar(item.id);
    } else if (e.target.name === "delete") {
      // 點擊刪除
      e.preventDefault();
      onDeleteBookmark && onDeleteBookmark(item.id);
    } else if (e.target.name === "edit") {
      // 點擊編輯
      e.preventDefault();
      handleGroupSettingClick();
    } else if (item.url === "#") {
      // 點擊資料夾
      e.preventDefault();
      onMoveToFolder(item.id);
    }
  };
  const handleDragOver = (e) => {
    if (item.metadata.file_type === "group" || item.metadata.file_type === "root") {
      e.preventDefault(); // 允許放置
      e.dataTransfer.dropEffect = "move";
      // 添加視覺反饋
      e.currentTarget.classList.add("drag-over");
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over"); // 移除視覺反饋
    
    // 獲取被拖動項目的ID
    const draggedItemId = e.dataTransfer.getData("text/plain");
    if (draggedItemId && onMoveItemToGroup) {
      onMoveItemToGroup(parseInt(draggedItemId), item.id);
    }
  };

  const handleDragLeave = (e) => {
    // 移除視覺反饋
    e.currentTarget.classList.remove("drag-over");
  };
  return (
     <div 
      className="bookmark-item"
      draggable={false}
      onDragStartCapture={handleDragStartCapture}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <a
        href={item.url}
        target={item.url && "_blank"}
        rel="noopener noreferrer"
        onClick={handleClick}
      >
        <div className="title">
          <img src={imageMap[item.img]} alt={item.name} />
          <span>{item.name}</span>
        </div>
        <div className="hidden-setting">
          <img src={imageMap["delete.png"]} alt="Delete Icon" name="delete" />
          <img src={imageMap["edit.png"]} alt="Edit Icon" name="edit" />
        </div>
        {/* <div className="hidden-setting">
          <img src={imageMap["full_star.png"]} alt="Star Icon" name="star" />
        </div> */}
      </a>
      {showGroupSettingModal && (
        <GroupSettingModal
          onClose={() => setShowGroupSettingModal(false)}
          groupId={item.id}
        />
      )}
    </div>
  );
};

export { HomeItem, AddItem, SidebarItem };

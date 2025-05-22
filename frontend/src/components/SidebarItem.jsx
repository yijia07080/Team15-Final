import imageMap from "../utils/imageMap";


const HomeItem = ({ item, onMoveToFolder, onMoveItemToGroup }) => {
  const handleDragOver = (e) => {
    // 允許放置
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // 添加視覺反饋
    e.currentTarget.classList.add("drag-over");
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over"); // 移除視覺反饋
    
    // 獲取被拖動項目的ID
    const draggedItemId = e.dataTransfer.getData("text/plain");
    if (draggedItemId && onMoveItemToGroup) {
      onMoveItemToGroup(parseInt(draggedItemId), 0); // 使用 0 作為根目錄 ID
    }
  };

  const handleDragLeave = (e) => {
    // 移除視覺反饋
    e.currentTarget.classList.remove("drag-over");
  };

  return (
    <div 
      className="bookmark-item"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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

const SidebarItem = ({ item, onToggleStar, onMoveToFolder, onDeleteBookmark, onMoveItemToGroup }) => {
  const handleClick = (e) => {
    if (e.target.name === "star") {
      // 點擊 star
      e.preventDefault();
      onToggleStar && onToggleStar(item.id);
    } else if (e.target.name === "delete") {
      // 點擊刪除
      e.preventDefault();
      onDeleteBookmark && onDeleteBookmark(item.id);
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
        </div>
        {/* <div className="hidden-setting">
          <img src={imageMap["full_star.png"]} alt="Star Icon" name="star" />
        </div> */}
      </a>
    </div>
  );
};

export { HomeItem, SidebarItem };

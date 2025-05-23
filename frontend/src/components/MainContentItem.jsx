import imageMap from "../utils/imageMap";

const MainContentItem = ({
  bookmark,
  onToggleStar,
  onMoveToFolder,
  onDeleteBookmark,
  onMoveItemToGroup,
}) => {
  
  const handleClick = (e) => {
    if (e.target.matches(".tags span")) {
      // 點擊 tag
      e.preventDefault();
    } else if (e.target.name === "delete") {
      // 點擊 bin
      e.preventDefault();
      onDeleteBookmark(bookmark.id);
    } else if (e.target.name === "download") {
      // 透過後端下載連結下載檔案
      e.preventDefault();

      const downloadLink = document.createElement("a");
      downloadLink.href = "http://localhost:3000/file/" + bookmark.id;  // 尚未確定
      downloadLink.download = bookmark.name;
      downloadLink.click();

    } else if (e.target.name === "star") {
      // 點擊 star
      e.preventDefault();
      onToggleStar(bookmark.id);
    } else if (bookmark.url === "#") {
      // 點擊其他地方，但是是資料夾
      e.preventDefault();
      onMoveToFolder(bookmark.id);
    }
  };
  // 處理拖曳開始事件
  const handleDragStart = (e) => {
    // 設置要傳輸的數據 (項目ID)
    e.dataTransfer.setData("text/plain", bookmark.id);
    // 設置拖曳效果
    e.dataTransfer.effectAllowed = "move";
  };

  // 新增：處理拖曳進入資料夾
  const handleDragOver = (e) => {
    // 只有資料夾才能接收拖放的項目
    if (bookmark.metadata && bookmark.metadata.file_type === "folder") {
      e.preventDefault(); // 允許放置
      e.dataTransfer.dropEffect = "move";
      
      // 添加視覺反饋
      e.currentTarget.classList.add("drag-over");
    }
  };
   // 新增：處理拖曳離開資料夾
  const handleDragLeave = (e) => {
    // 移除視覺反饋
    e.currentTarget.classList.remove("drag-over");
  };
  
  // 新增：處理放下項目到資料夾
  const handleDrop = (e) => {
    if (bookmark.metadata && bookmark.metadata.file_type === "folder") {
      e.preventDefault();
      e.currentTarget.classList.remove("drag-over"); // 移除視覺反饋
      
      // 獲取被拖動項目的ID
      const draggedItemId = e.dataTransfer.getData("text/plain");
      if (draggedItemId && onMoveItemToGroup) {
        onMoveItemToGroup(parseInt(draggedItemId), bookmark.id);
      }
    }
  };
  return (
    <div
      target="_blank"
      rel="noopener noreferrer"
      className="tag-card"
      onClick={handleClick}
      draggable="true"
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="hidden-setting">
        {/* <img
          src={imageMap[bookmark.starred ? "full_star.png" : "empty_star.png"]}
          alt="Star Icon"
          name="star"
        /> */}
        <img src={imageMap["delete.png"]} alt="Delete Icon" name="delete" />
        <img src={imageMap["download.png"]} alt="Download Icon" name="download" />
      </div>
      <div className="title">
        <img src={imageMap[bookmark.img]} alt={bookmark.name} />
        {bookmark.name}
      </div>
      <div className="tags">
        {bookmark.tags.map((tag, tagIdx) => (
          <span key={tagIdx} className="badge bg-secondary">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MainContentItem;

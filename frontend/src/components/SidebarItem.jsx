import imageMap from "../utils/imageMap";

const HomeItem = ({ onMoveToFolder }) => {
  return (
    <div className="bookmark-item">
      <a
        onClick={(e) => {
          e.preventDefault();
          onMoveToFolder(0);
        }}
      >
        <div className="title">
          <img src={imageMap["home.png"]} alt="Home" />
          <span>Home</span>
        </div>
      </a>
    </div>
  );
};

const SidebarItem = ({ item, onToggleStar, onMoveToFolder, onDeleteBookmark }) => {
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
  return (
    <div className="bookmark-item">
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

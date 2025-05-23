import imageMap from '../utils/imageMap';

const MainContentItem = ({
  bookmark,
  openContextMenu,
  bookmarksTree,
  closeMenu,
}) => {
  const isGroup = bookmark.metadata?.file_type === 'group';

  const handleClick = e => {
    if (e.target.matches('.tags span')) {
      e.preventDefault();
    } else if (bookmark.url === '#') {
      e.preventDefault();
      bookmarksTree.moveToFolder(bookmark.id);
      closeMenu();
    }
  };

  const handleDragStartCapture = e => {
    if (isGroup) e.preventDefault();
  };

  const handleDragStart = e => {
    e.dataTransfer.setData('text/plain', bookmark.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = e => {
    if (bookmark.metadata?.file_type === 'folder') {
      e.preventDefault();
      e.currentTarget.classList.add('drag-over');
    }
  };

  const handleDragLeave = e => e.currentTarget.classList.remove('drag-over');

  const handleDrop = e => {
    if (bookmark.metadata?.file_type === 'folder') {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId) bookmarksTree.moveItemToGroup(parseInt(draggedId), bookmark.id);
    }
  };

  return (
    <div
      className='tag-card'
      onClick={handleClick}
      onContextMenu={e => openContextMenu(e, bookmark)}
      draggable={!isGroup}
      onDragStartCapture={handleDragStartCapture}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className='title'>
        <img src={imageMap[bookmark.img]} alt={bookmark.name} />
        {bookmark.name}
      </div>
      <div className='tags'>
        {bookmark.tags.map((t, i) => (
          <span key={i} className='badge bg-secondary'>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MainContentItem;

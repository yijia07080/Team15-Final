import { useState, useContext } from "react";
import BookmarksContext from "../../context/BookmarksContext";
import styles from './AddBookmarkModal.module.css';

const AddBookmarkModal = ({ onClose, currentFilterTags }) => {
  const { bookmarksTree } = useContext(BookmarksContext);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      alert("請選擇一個檔案");
      return;
    }

    const fileType = file.name.split('.').pop(); // 根據檔案附檔名決定 file_type
    const usedSize = file.size; // 根據檔案大小決定 used_size
    const hidden =
      currentFilterTags.length > 0 &&
      !currentFilterTags.some((tag) => tags.includes(tag));

    const newBookmark = {
      name: name || file.name, // 如果未輸入名稱，使用檔案名稱
      tags,
      img: getFileIcon(fileType), // 根據檔案類型選擇圖示
      hidden,
      file_type: fileType,
      used_size: usedSize,
    };

    bookmarksTree.addBookmark(newBookmark);
    onClose();
  };

  // 根據檔案類型選擇適當的圖示
  const getFileIcon = (fileType) => {
    const fileTypeMap = {
      pdf: "https://drive-thirdparty.googleusercontent.com/64/type/application/pdf",
      txt: "https://drive-thirdparty.googleusercontent.com/64/type/text/plain",
      jpg: "https://drive-thirdparty.googleusercontent.com/64/type/image/jpeg",
      jpeg: "https://drive-thirdparty.googleusercontent.com/64/type/image/jpeg",
      png: "https://drive-thirdparty.googleusercontent.com/64/type/image/png"
    };
    
    return fileTypeMap[fileType.toLowerCase()] || "file.png";
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setName(selectedFile?.name || ""); // 預設名稱為檔案名稱
  };

  // 拖曳事件處理函數
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setName(selectedFile?.name || "");
    }
  };

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  function handleBackdropClick() {
    onClose();
  }

  function stopBackdropClick(event) {
    event.stopPropagation();
  }

  return (
    <div className={styles['modal']} onClick={handleBackdropClick}>
      <div className={styles['modal-content']} onClick={stopBackdropClick}>
        <form onSubmit={handleSubmit}>
          <div className={styles['form-group']}>
            <label>上傳檔案</label>
            <div 
              className={`${styles['drop-zone']} ${isDragging ? styles['drop-zone-active'] : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {file ? (
                <div className={styles['file-selected']}>
                  <p>已選擇檔案: {file.name}</p>
                  <p>({Math.round(file.size / 1024)} KB)</p>
                </div>
              ) : (
                <>
                  <p>拖放檔案至此區域，或</p>
                  <label className={styles['file-input-label']}>
                    選擇檔案
                    <input 
                      type="file" 
                      onChange={handleFileChange} 
                      className={styles['file-input']} 
                    />
                  </label>
                </>
              )}
            </div>
          </div>
          <div className={styles['form-group']}>
            <label>檔案名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles['form-group']}>
            <label>標籤</label>
            <div className={styles['tag-input-container']}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
              <button type="button" onClick={handleAddTag}>
                新增
              </button>
            </div>
            <div className={styles['tags-list']}>
              {tags.map((tag, index) => (
                <span key={index} className={styles['tag']}>
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>
                    x
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className={styles['form-actions']}>
            <button
              type="button"
              className={`btn btn-secondary ${styles['btn-secondary']}`}
              onClick={onClose}
            >
              取消
            </button>
            <button type="submit" className={`btn btn-primary ${styles['btn-primary']}`}>
              確認
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookmarkModal;
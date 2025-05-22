import { useState, useContext } from "react";
import BookmarksContext from "../../context/BookmarksContext";
import styles from './GroupSettingModal.module.css';
import imageMap from "../../utils/imageMap";

const HummanReadableSize = (size) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }
    return `${size.toFixed(2)} ${units[index]}`;
}

const GroupSettingModal = ({ onClose, groupId }) => {
    const { bookmarksTree } = useContext(BookmarksContext);

    function handleBackdropClick() {
        onClose();
    }

    function stopBackdropClick(event) {
        event.stopPropagation();
    }

    const group = bookmarksTree.idToBookmark[groupId];
    if (group.metadata.file_type !== "group") {
        throw new Error("GroupSettingModal can only be used for group items");
    }

    return (
        <div className={styles["modal"]} onClick={handleBackdropClick}>
            <div className={styles["modal-content"]} onClick={stopBackdropClick}>
                <h2>{group.name}</h2>
                <div className={styles["group-info"]}>
                    <p>群組大小: {HummanReadableSize(group.metadata.used_size)} / {HummanReadableSize(group.metadata.total_size)}</p>
                    <div className={styles["providers-container"]}>
                        {group.metadata.spaceProviders.map((provider, index) => (
                            <div key={index} className={styles["provider"]}>
                                <img src={provider.picture || imageMap["group.png"]} alt={provider.name} />
                                <span>{provider.name} ({HummanReadableSize(provider.total_size)})</span>
                                <img 
                                    src={imageMap["close.png"]} alt="delete" className={styles["hidden-setting"]}
                                    onClick={() => {bookmarksTree.removeSpaceProvider(groupId, provider.name)}} 
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
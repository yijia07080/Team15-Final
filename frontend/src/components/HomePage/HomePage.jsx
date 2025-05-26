import { useContext } from "react";
import BookmarksContext from "../../context/BookmarksContext";
import styles from "./HomePage.module.css";
import imageMap from "../../utils/imageMap";

const HomePage = () => {

  const handleAuthClick = () => {
    const clientId = '488776431237-lkq7u7ds5pgjnhcgdltl7o4cq60t151p.apps.googleusercontent.com';
    const redirectUri = 'http://localhost:8000/oauth2callback/';
    const scope = 'openid email profile https://www.googleapis.com/auth/drive';
    const authUrl = [
      'https://accounts.google.com/o/oauth2/v2/auth',
      `?client_id=${clientId}`,
      `&redirect_uri=${encodeURIComponent(redirectUri)}`,
      `&response_type=code`,
      `&scope=${encodeURIComponent(scope)}`,
      `&access_type=offline`,
      `&prompt=consent`,
    ].join('');
    window.location.href = authUrl;
  };

  const handleLoginClick = () => {
    window.location.href = "/login";
  };

  return (
    <div className={styles.homepage}>
      <div className={styles.content}>
        <h1 className={styles.title}>Google Driver</h1>
        <p className={styles.description}>
          簡單直觀的方式整理多個帳號的雲端硬碟。
          提供搜尋、標籤、群組空間顯示等功能，
          讓你輕鬆管理大量檔案，迅速找到需要的內容。
        </p>
        
        <div className={styles.buttons}>
          <button 
            className={styles.registerButton} 
            onClick={handleAuthClick}
          >
            <img src={imageMap["google.png"]} alt="Google Icon" />
            <span>使用 Google 註冊</span>
          </button>
          
          <button 
            className={styles.loginButton} 
            onClick={handleLoginClick}
          >
            <img src={imageMap["login.png"]} alt="Login Icon" />
            <span>登入</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
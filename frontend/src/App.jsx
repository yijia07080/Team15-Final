import { useContext } from "react";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { BookmarksProvider } from "./context/BookmarksContext";
import { UploadProvider } from "./context/UploadContext";
import { DownloadProvider } from "./context/DownloadContext";
import ProviderOauth2Bridge from "./components/ProviderOauth2Bridge";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Breadcrumb from "./components/Breadcrumb";
import MainContent from "./components/MainContent";
import UploadStatusPanel from "./components/UploadStatusPanel";
import DownloadStatusPanel from "./components/DownloadStatusPanel";
import "./styles.css";
import HomePage from "./components/HomePage/HomePage";
import { userInfo } from "./utils/init.js"; 

function Layout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <Breadcrumb />
        <UploadStatusPanel />
        <DownloadStatusPanel />
        {children}
      </div>
    </div>
  );
}

function App() {
  const isLoggedIn = userInfo.username !== "admin";
  
   if (!isLoggedIn) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/oauth2-bridge/" element={<ProviderOauth2Bridge />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <DownloadProvider>
      <UploadProvider>
        <BookmarksProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <Layout>
                    <MainContent />
                  </Layout>
                }
              />
              <Route path="/oauth2-bridge/" element={<ProviderOauth2Bridge />} />
            </Routes>
          </BrowserRouter>
        </BookmarksProvider>
      </UploadProvider>
    </DownloadProvider>
  );
}

export default App;
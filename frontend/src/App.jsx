import { BookmarksProvider } from "./context/BookmarksContext";
import { UploadProvider } from "./context/UploadContext";
import { DownloadProvider } from "./context/DownloadContext";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Breadcrumb from "./components/Breadcrumb";
import MainContent from "./components/MainContent";
import UploadStatusPanel from "./components/UploadStatusPanel";
import DownloadStatusPanel from "./components/DownloadStatusPanel";
import "./styles.css";

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
  return (
    <DownloadProvider>
      <UploadProvider>
        <BookmarksProvider>
          <Layout>
            <MainContent />
          </Layout>
        </BookmarksProvider>
      </UploadProvider>
    </DownloadProvider>
  );
}

export default App;
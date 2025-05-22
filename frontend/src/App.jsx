import { BookmarksProvider } from "./context/BookmarksContext";
import { UploadProvider } from "./context/UploadContext";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Breadcrumb from "./components/Breadcrumb";
import MainContent from "./components/MainContent";
import UploadStatusPanel from "./components/UploadStatusPanel";
import "./styles.css";

function Layout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <Breadcrumb />
        <UploadStatusPanel />
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <UploadProvider>
      <BookmarksProvider>
          <Layout>
            <MainContent />
          </Layout>
      </BookmarksProvider>
    </UploadProvider>
  );
}

export default App;

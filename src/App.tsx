import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { AuthPage } from "./pages/AuthPage";
import { PostPage } from "./pages/PostPage";
import { ChannelPage } from "./pages/ChannelPage";
import { CompanyPage } from "./pages/CompanyPage";
import { BookmarksPage } from "./pages/BookmarksPage";

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-neutral-500">
        불러오는 중...
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/channel/:slug" element={<ChannelPage />} />
        <Route path="/company/:slug" element={<CompanyPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

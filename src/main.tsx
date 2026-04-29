import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Categories } from './pages/Categories';
import { BookmarkProvider } from './context/BookmarkContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BookmarkProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="categories" element={<Categories />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BookmarkProvider>
  </StrictMode>,
);

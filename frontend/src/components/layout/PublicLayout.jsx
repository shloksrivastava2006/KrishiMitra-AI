import { Outlet } from 'react-router-dom';
import TranslationNotice from './TranslationNotice.jsx';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

// Every role, sellers included, gets the same header and footer. The server (not this layout) decides who may open which page.
export default function PublicLayout() {
  return (<><Navbar /><TranslationNotice /><main><Outlet /></main><Footer /></>);
}

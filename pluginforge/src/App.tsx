import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import TemplateGallery from "./components/TemplateGallery";
import PluginBuilder from "./components/PluginBuilder";
import AIDesigner from "./components/AIDesigner";
import MyPlugins from "./components/MyPlugins";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TemplateGallery />} />
        <Route path="/build" element={<PluginBuilder />} />
        <Route path="/ai" element={<AIDesigner />} />
        <Route path="/my-plugins" element={<MyPlugins />} />
      </Routes>
    </Layout>
  );
}

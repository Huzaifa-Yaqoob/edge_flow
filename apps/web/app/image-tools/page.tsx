import { SubToolCard } from "../../components/SubToolCard";
import optimize_img_tool from "../../assets/tools/optimize_img_tool.png";
import trace_img_tool from "../../assets/tools/trace_img_tool.png";

const imageSubTools = [
  {
    heading: "Image Optimizer",
    description: "Optimize images for web, convert formats (WebP/AVIF), resize for different devices, and strip EXIF data.",
    image: optimize_img_tool,
    link: "/image-tools/optimizer",
  },
  {
    heading: "Raster to SVG Converter",
    description: "Convert raster images (like PNG, JPG) into scalable vector graphics (SVG).",
    image: trace_img_tool,
    link: "/image-tools/raster-to-svg",
  },
];

export default function ImageToolsPage() {
  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-5xl font-bold mb-8">Image Tools</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {imageSubTools.map((tool) => (
          <SubToolCard
            key={tool.heading}
            heading={tool.heading}
            description={tool.description}
            image={tool.image}
            link={tool.link}
          />
        ))}
      </div>
    </div>
  );
}

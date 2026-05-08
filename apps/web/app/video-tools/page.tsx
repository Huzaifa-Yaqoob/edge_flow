import { SubToolCard } from "../../components/SubToolCard"
import video_converter_extractor_tool from "../../assets/tools/convert_vid_tool.png" // Using the specific image for the tool

const videoSubTools = [
  {
    heading: "Video Converter & Extractor",
    description:
      "Convert video clips to optimized GIFs or extract high-quality 8K frames from your videos.",
    image: video_converter_extractor_tool,
    link: "/video-tools/convert-extract",
  },
]

export default function VideoToolsPage() {
  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="mb-8 text-5xl font-bold">Video Tools</h1>
      <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {videoSubTools.map((tool) => (
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
  )
}

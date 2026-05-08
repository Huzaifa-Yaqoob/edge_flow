import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";

import main_img_tool from "../assets/tools/main_img_tool.png";
import main_pdf_tool from "../assets/tools/main_pdf_tool.png";
import main_vid_tool from "../assets/tools/main_vid_tool.png";

const toolData = [
  {
    title: "PDF Tools",
    description: "Edit, convert, and manage your PDF files with ease.",
    imageSrc: main_pdf_tool,
    link: "/pdf-tools",
  },
  {
    title: "Images Tools",
    description: "Optimize, resize, and transform your images.",
    imageSrc: main_img_tool,
    link: "/image-tools",
  },
  {
    title: "Video Tools",
    description: "Cut, merge, and convert your video files.",
    imageSrc: main_vid_tool,
    link: "/video-tools",
  },
];

export function ToolCards() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 w-full max-w-5xl">
      {toolData.map((tool) => (
        <Link href={tool.link} key={tool.title} className="w-full">
          <Card className="w-full h-full flex flex-col">
            <CardHeader className="flex-grow">
              <Image
                src={tool.imageSrc}
                alt={tool.title}
                width={300}
                height={200}
                className="rounded-md object-cover mb-4"
              />
              <CardTitle>{tool.title}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

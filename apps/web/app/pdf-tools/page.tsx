import { SubToolCard } from "../../components/SubToolCard";
import sanitize_pdf_tool from "../../assets/tools/sanitize_pdf_tool.png";

const pdfSubTools = [
  {
    heading: "Sanitize PDF",
    description: "Remove sensitive information and metadata from your PDF files.",
    image: sanitize_pdf_tool,
    link: "/pdf-tools/sanitize",
  },
];

export default function PdfToolsPage() {
  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-5xl font-bold mb-8">PDF Tools</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {pdfSubTools.map((tool) => (
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

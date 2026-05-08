import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

interface SubToolCardProps {
  className?: string;
  image: any; // Next.js Image src type
  heading: string;
  description: string;
  link: string;
}

export function SubToolCard({ className, image, heading, description, link }: SubToolCardProps) {
  return (
    <Link href={link} className={cn("w-full", className)}>
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="flex-grow">
          <div className="relative w-full aspect-video mb-4"> {/* Added aspect-video for responsive height */}
            <Image
              src={image}
              alt={heading}
              fill // Fill the parent div
              className="rounded-md object-cover" // Cover the area, maintaining aspect ratio
            />
          </div>
          <CardTitle>{heading}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

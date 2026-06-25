import Image from "next/image";
import { MediaPlaceholder } from "./MediaPlaceholder";

/**
 * Renders a real poster image when the media slot has a `src`, otherwise falls
 * back to the dashed `MediaPlaceholder`. Lets a section mix produced posters
 * (Hero, feature styles, showcase, export card) with slots still awaiting art
 * (the layout-engine before/after) without branching at each call site.
 *
 * Poster PNGs are 1000×1500 (2:3); the wrapper enforces that aspect so the full
 * poster shows uncropped.
 */
type Media = {
  label: string;
  aspect?: string;
  src?: string;
  alt?: string;
  caption?: string;
};

export function PosterImage({
  media,
  className = "",
  priority = false,
  sizes = "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw",
}: {
  media: Media;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (!media.src) {
    return (
      <MediaPlaceholder
        label={media.label}
        aspect={media.aspect}
        caption={media.caption}
        className={className}
      />
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl ${className}`}
      style={{ aspectRatio: media.aspect ?? "2 / 3" }}
    >
      <Image
        src={media.src}
        alt={media.alt ?? media.label}
        width={1000}
        height={1500}
        className="h-full w-full object-cover"
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}

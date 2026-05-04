import { redirect } from "next/navigation";

export default function ExplorePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Redirect /explore to /map, preserving query params
  redirect("/map");
}

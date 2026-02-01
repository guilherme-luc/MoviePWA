import { Skeleton } from "../ui/Skeleton";

export function MovieCardSkeleton() {
    return (
        <div className="flex flex-col gap-2">
            {/* Poster Aspect Ratio 2:3 */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-neutral-800">
                <Skeleton className="h-full w-full" />
            </div>
            {/* Title & Year */}
            <div className="space-y-1.5 px-1">
                <Skeleton className="h-4 w-3/4 rounded-full" />
                <Skeleton className="h-3 w-1/4 rounded-full bg-neutral-800/50" />
            </div>
        </div>
    );
}
